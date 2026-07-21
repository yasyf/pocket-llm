import { expect, test } from "bun:test"

import type { JsonSchema } from "../src/index.ts"

import { jsonSchemaToGbnf, PocketLlmError } from "../src/index.ts"

test("an object schema emits a root rule and quoted property keys", () => {
  const grammar = jsonSchemaToGbnf({
    type: "object",
    properties: { name: { type: "string" }, age: { type: "integer" } },
    required: ["name", "age"],
  })
  expect(grammar.startsWith("root ::=")).toBe(true)
  expect(grammar).toContain('"\\"name\\""')
  expect(grammar).toContain('"\\"age\\""')
  expect(grammar).toContain("string ::=")
  expect(grammar).toContain("integer ::=")
})

test("an enum becomes an alternation of JSON literals", () => {
  expect(jsonSchemaToGbnf({ enum: ["a", "b", 3] })).toBe('root ::= ( "\\"a\\"" | "\\"b\\"" | "3" )')
})

test("a const becomes a single literal", () => {
  expect(jsonSchemaToGbnf({ const: true })).toBe('root ::= "true"')
})

test("an array wraps its item rule with comma separation", () => {
  const grammar = jsonSchemaToGbnf({ type: "array", items: { type: "number" } })
  expect(grammar).toContain('"[" ws')
  expect(grammar).toContain("number ::=")
})

test.each<[JsonSchema, string]>([
  [{ type: "boolean" }, '"true" | "false"'],
  [{ type: "null" }, '"null"'],
  [{ type: "string" }, "string ::="],
])("primitive %o maps to a rule containing %p", (schema, fragment) => {
  expect(jsonSchemaToGbnf(schema)).toContain(fragment)
})

test("optional and required properties both appear, with a shared empty tail", () => {
  const grammar = jsonSchemaToGbnf({
    type: "object",
    properties: { a: { type: "string" }, b: { type: "string" } },
    required: ["a"],
  })
  expect(grammar).toContain("seq-")
  expect(grammar).toContain("rest-")
  expect(grammar).toContain('empty ::= ""')
})

test("a nested object/array/enum schema converts end to end", () => {
  const grammar = jsonSchemaToGbnf({
    type: "object",
    properties: {
      tags: { type: "array", items: { type: "string" } },
      status: { enum: ["on", "off"] },
    },
    required: ["tags"],
  })
  expect(grammar).toContain('"[" ws')
  expect(grammar).toContain('( "\\"on\\"" | "\\"off\\"" )')
})

test.each<[string, JsonSchema]>([
  ["anyOf", { anyOf: [{ type: "string" }] } as unknown as JsonSchema],
  ["oneOf", { oneOf: [] } as unknown as JsonSchema],
  ["$ref", { $ref: "#/$defs/x" } as unknown as JsonSchema],
])("rejects the unsupported keyword %s", (_name, schema) => {
  expect(() => jsonSchemaToGbnf(schema)).toThrow(PocketLlmError)
})

test("rejects a schema with no type, const, or enum", () => {
  expect(() => jsonSchemaToGbnf({})).toThrow(PocketLlmError)
})

test("rejects an object schema without properties", () => {
  expect(() => jsonSchemaToGbnf({ type: "object" })).toThrow(/'properties'/)
})

test("rejects an array schema without items", () => {
  expect(() => jsonSchemaToGbnf({ type: "array" })).toThrow(/'items'/)
})

test("rejects an empty enum", () => {
  expect(() => jsonSchemaToGbnf({ enum: [] })).toThrow(/non-empty 'enum'/)
})
