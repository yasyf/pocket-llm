import { afterEach, expect, test } from "bun:test"

import { detect } from "../src/index.ts"

import { restoreGlobals, setGpuAdapter, setLanguageModel } from "./stubs.ts"

afterEach(restoreGlobals)

test("prompt-api wins when LanguageModel is available, even with a GPU present", async () => {
  setLanguageModel("available")
  setGpuAdapter({})
  expect(await detect()).toEqual({
    lane: "prompt-api",
    availability: "ready",
    model: "chrome-builtin",
    downloadBytes: 0,
  })
})

test("a downloadable Prompt API model reports needs-download with zero bytes", async () => {
  setLanguageModel("downloadable")
  expect(await detect()).toMatchObject({ lane: "prompt-api", availability: "needs-download", downloadBytes: 0 })
})

test("an unavailable Prompt API falls through to the next lane", async () => {
  setLanguageModel("unavailable")
  setGpuAdapter({})
  expect((await detect()).lane).toBe("webllm")
})

test("a downloading Prompt API is not treated as usable", async () => {
  setLanguageModel("downloading")
  setGpuAdapter({})
  expect((await detect()).lane).toBe("webllm")
})

test("webllm wins with no usable Prompt API and a real GPU adapter", async () => {
  setLanguageModel(null)
  setGpuAdapter({})
  expect(await detect()).toEqual({
    lane: "webllm",
    availability: "needs-download",
    model: "SmolLM2-135M-Instruct-q0f16-MLC",
    downloadBytes: 269_030_016,
  })
})

test("wllama is the fallback when no GPU is exposed", async () => {
  setLanguageModel(null)
  setGpuAdapter(undefined)
  expect(await detect()).toEqual({
    lane: "wllama",
    availability: "needs-download",
    model: "unsloth/SmolLM2-135M-Instruct-GGUF/SmolLM2-135M-Instruct-Q4_K_M.gguf",
    downloadBytes: 105_454_144,
  })
})

test("wllama is the fallback when requestAdapter yields null", async () => {
  setLanguageModel(null)
  setGpuAdapter(null)
  expect((await detect()).lane).toBe("wllama")
})

test("a forced lane list bypasses earlier eligible lanes", async () => {
  setLanguageModel("available")
  setGpuAdapter({})
  expect((await detect({ lanes: ["wllama"] })).lane).toBe("wllama")
})

test("a webllm model override is reported and clears the size estimate", async () => {
  setLanguageModel(null)
  setGpuAdapter({})
  expect(await detect({ lanes: ["webllm"], models: { webllm: "Custom-Model-MLC" } })).toMatchObject({
    lane: "webllm",
    model: "Custom-Model-MLC",
    downloadBytes: null,
  })
})

test("detect throws when no requested lane is eligible", async () => {
  setLanguageModel(null)
  setGpuAdapter(undefined)
  await expect(detect({ lanes: ["prompt-api", "webllm"] })).rejects.toThrow(/no on-device LLM lane/)
})
