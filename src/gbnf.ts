import type { JsonSchema, JsonValue } from "./types.ts"

import { PocketLlmError } from "./errors.ts"

const UNSUPPORTED_KEYWORDS = [
  "anyOf",
  "oneOf",
  "allOf",
  "not",
  "$ref",
  "if",
  "then",
  "else",
  "patternProperties",
] as const

const WS_RHS = String.raw`[ \t\n]*`
const BOOLEAN_RHS = String.raw`"true" | "false"`
const NULL_RHS = String.raw`"null"`
const INTEGER_RHS = String.raw`"-"? ("0" | [1-9] [0-9]*)`
const NUMBER_RHS = String.raw`"-"? ("0" | [1-9] [0-9]*) ("." [0-9]+)? ([eE] [-+]? [0-9]+)?`
const STRING_RHS = String.raw`"\"" ( [^"\\] | "\\" (["\\/bfnrt] | "u" [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F] [0-9a-fA-F]) )* "\""`

interface ObjectProp {
  readonly kv: string
  readonly required: boolean
}

function gbnfLiteral(text: string): string {
  return `"${text.replace(/[\\"]/g, (match) => `\\${match}`).replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")}"`
}

/**
 * Converts a JSON Schema into a llama.cpp GBNF grammar for constrained sampling.
 * Covers object/properties/required, string, number/integer, boolean, null,
 * arrays, and enum/const; throws {@link PocketLlmError} on any other keyword.
 */
export function jsonSchemaToGbnf(schema: JsonSchema): string {
  const rules = new Map<string, string>()
  let counter = 0

  const register = (hint: string, rhs: string): string => {
    const name = `${hint}-${counter++}`
    rules.set(name, rhs)
    return name
  }

  const primitive = (name: string, rhs: string): string => {
    if (!rules.has(name)) rules.set(name, rhs)
    return name
  }

  const objectRule = (subject: JsonSchema): string => {
    if (!subject.properties) throw new PocketLlmError("GBNF conversion requires 'properties' on an object schema")
    primitive("ws", WS_RHS)
    const requiredSet = new Set(subject.required ?? [])
    const props: readonly ObjectProp[] = Object.entries(subject.properties).map(([key, sub]) => ({
      kv: `${gbnfLiteral(JSON.stringify(key))} ws ":" ws ${build(sub)}`,
      required: requiredSet.has(key),
    }))
    const empty = primitive("empty", `""`)
    const [seqStart] = [...props].reverse().reduce<readonly [string, string]>(
      ([seqNext, restNext], prop) => [
        register("seq", prop.required ? `${prop.kv} ${restNext}` : `( ${prop.kv} ${restNext} ) | ${seqNext}`),
        register("rest", prop.required ? `ws "," ws ${prop.kv} ${restNext}` : `( ws "," ws ${prop.kv} ${restNext} ) | ${restNext}`),
      ],
      [empty, empty],
    )
    return register("object", `"{" ws ${seqStart} ws "}"`)
  }

  const arrayRule = (subject: JsonSchema): string => {
    if (!subject.items) throw new PocketLlmError("GBNF conversion requires 'items' on an array schema")
    primitive("ws", WS_RHS)
    const item = build(subject.items)
    return register("array", `"[" ws ( ${item} ( ws "," ws ${item} )* )? ws "]"`)
  }

  const build = (subject: JsonSchema): string => {
    const unsupported = UNSUPPORTED_KEYWORDS.find((keyword) => keyword in subject)
    if (unsupported) throw new PocketLlmError(`GBNF conversion does not support the '${unsupported}' JSON Schema keyword`)

    if (subject.const !== undefined) return gbnfLiteral(JSON.stringify(subject.const))
    if (subject.enum) {
      if (subject.enum.length === 0) throw new PocketLlmError("GBNF conversion requires a non-empty 'enum'")
      return `( ${subject.enum.map((value: JsonValue) => gbnfLiteral(JSON.stringify(value))).join(" | ")} )`
    }

    switch (subject.type) {
      case "object":
        return objectRule(subject)
      case "array":
        return arrayRule(subject)
      case "string":
        return primitive("string", STRING_RHS)
      case "integer":
        return primitive("integer", INTEGER_RHS)
      case "number":
        return primitive("number", NUMBER_RHS)
      case "boolean":
        return primitive("boolean", BOOLEAN_RHS)
      case "null":
        return primitive("null", NULL_RHS)
      default:
        throw new PocketLlmError(
          `GBNF conversion requires a single 'type' (or 'const'/'enum'); got ${JSON.stringify(subject.type)}`,
        )
    }
  }

  const rootRhs = build(schema)
  return [`root ::= ${rootRhs}`, ...[...rules].map(([name, rhs]) => `${name} ::= ${rhs}`)].join("\n")
}
