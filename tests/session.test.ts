import { afterEach, expect, mock, test } from "bun:test"

import type { JsonSchema } from "../src/index.ts"

import { createSession } from "../src/index.ts"

import { restoreGlobals, setGpuAdapter, setLanguageModel } from "./stubs.ts"

const SCHEMA: JsonSchema = {
  type: "object",
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
}

const WLLAMA_ASSETS = { wllama: { default: "http://localhost/wllama.wasm" } }

interface ChatRequest {
  messages: readonly { role: string; content: string }[]
  response_format?: { type: string; schema?: string }
  grammar?: string
}

function mockWebllm(onCreate: (request: ChatRequest) => string): void {
  mock.module("@mlc-ai/web-llm", () => ({
    CreateMLCEngine: async () => ({
      chat: {
        completions: {
          create: async (request: ChatRequest) => ({ choices: [{ message: { content: onCreate(request) } }] }),
        },
      },
      unload: async () => {},
    }),
  }))
}

function mockWllama(onCreate: (request: ChatRequest) => string): void {
  mock.module("@wllama/wllama/esm/index.js", () => ({
    Wllama: class {
      async loadModelFromHF(): Promise<void> {}
      async createChatCompletion(request: ChatRequest) {
        return { choices: [{ message: { content: onCreate(request) } }] }
      }
      async exit(): Promise<void> {}
    },
  }))
}

afterEach(restoreGlobals)

test("prompt-api forwards responseSchema as responseConstraint and parses JSON", async () => {
  let captured: LanguageModelPromptOptions | undefined
  setLanguageModel("available", async () => ({
    prompt: async (_text: string, options?: LanguageModelPromptOptions) => {
      captured = options
      return '{"ok":true}'
    },
    destroy: () => {},
  }))
  const session = await createSession({ lanes: ["prompt-api"], responseSchema: SCHEMA })
  expect(await session.prompt("hi")).toEqual({ ok: true })
  expect(captured?.responseConstraint).toEqual(SCHEMA)
})

test("prompt-api returns a plain string when no schema is given", async () => {
  setLanguageModel("available", async () => ({ prompt: async () => "plain answer", destroy: () => {} }))
  const session = await createSession({ lanes: ["prompt-api"] })
  expect(await session.prompt("hi")).toBe("plain answer")
})

test("prompt-api passes the system prompt as an initial system message", async () => {
  let captured: LanguageModelCreateOptions | undefined
  setLanguageModel("available", async (options?: LanguageModelCreateOptions) => {
    captured = options
    return { prompt: async () => "", destroy: () => {} }
  })
  await createSession({ lanes: ["prompt-api"], system: "be terse" })
  expect(captured?.initialPrompts).toEqual([{ role: "system", content: "be terse" }])
})

test("prompt-api destroy releases the underlying session", async () => {
  let destroyed = false
  setLanguageModel("available", async () => ({ prompt: async () => "", destroy: () => { destroyed = true } }))
  const session = await createSession({ lanes: ["prompt-api"] })
  await session.destroy()
  expect(destroyed).toBe(true)
})

test("webllm forwards responseSchema as a json_object response_format", async () => {
  let captured: ChatRequest | undefined
  mockWebllm((request) => {
    captured = request
    return '{"ok":true}'
  })
  setLanguageModel(null)
  setGpuAdapter({})
  const session = await createSession({ lanes: ["webllm"], responseSchema: SCHEMA, system: "sys" })
  expect(await session.prompt("hi")).toEqual({ ok: true })
  expect(captured?.response_format).toEqual({ type: "json_object", schema: JSON.stringify(SCHEMA) })
  expect(captured?.messages).toEqual([
    { role: "system", content: "sys" },
    { role: "user", content: "hi" },
  ])
})

test("wllama converts responseSchema to a GBNF grammar for sampling", async () => {
  let captured: ChatRequest | undefined
  mockWllama((request) => {
    captured = request
    return '{"ok":true}'
  })
  setLanguageModel(null)
  setGpuAdapter(undefined)
  const session = await createSession({ lanes: ["wllama"], responseSchema: SCHEMA, assets: WLLAMA_ASSETS })
  expect(await session.prompt("hi")).toEqual({ ok: true })
  expect(captured?.grammar).toContain("root ::=")
  expect(captured?.grammar).toContain('"\\"ok\\""')
})

test("wllama create demands wasm asset URLs when none are supplied", async () => {
  setLanguageModel(null)
  setGpuAdapter(undefined)
  await expect(createSession({ lanes: ["wllama"] })).rejects.toThrow(/requires WebAssembly asset URLs/)
})

test("a lane whose create throws falls through to the next eligible lane", async () => {
  setLanguageModel("available", async () => {
    throw new Error("prompt-api create failed")
  })
  setGpuAdapter(undefined)
  mockWllama(() => "from-wllama")
  const session = await createSession({ lanes: ["prompt-api", "wllama"], assets: WLLAMA_ASSETS })
  expect(await session.prompt("hi")).toBe("from-wllama")
})

test("forcing a single lane bypasses an earlier eligible lane", async () => {
  setLanguageModel("available")
  setGpuAdapter({})
  mockWebllm(() => "from-webllm")
  const session = await createSession({ lanes: ["webllm"] })
  expect(await session.prompt("hi")).toBe("from-webllm")
})

test("the last create failure surfaces when no lane succeeds", async () => {
  setLanguageModel(null)
  setGpuAdapter(undefined)
  await expect(createSession({ lanes: ["wllama"] })).rejects.toThrow(/requires WebAssembly asset URLs/)
})
