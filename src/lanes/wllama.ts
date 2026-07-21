import type { ChatCompletionMessage } from "@wllama/wllama"

import type { CreateSessionOptions, Detection, DetectOptions, LaneDefinition, Session, WllamaModelSource } from "../types.ts"

import { PocketLlmError } from "../errors.ts"
import { jsonSchemaToGbnf } from "../gbnf.ts"

const DEFAULT_MODEL: WllamaModelSource = {
  repo: "unsloth/SmolLM2-135M-Instruct-GGUF",
  file: "SmolLM2-135M-Instruct-Q4_K_M.gguf",
}
const DEFAULT_DOWNLOAD_BYTES = 105_454_144

function modelLabel(source: WllamaModelSource): string {
  return source.file ? `${source.repo}/${source.file}` : `${source.repo}@${source.quant ?? "Q4_K_M"}`
}

function isDefault(source: WllamaModelSource): boolean {
  return source.repo === DEFAULT_MODEL.repo && source.file === DEFAULT_MODEL.file
}

export const wllamaLane: LaneDefinition = {
  lane: "wllama",

  async detect(options: DetectOptions): Promise<Detection | null> {
    const source = options.models?.wllama ?? DEFAULT_MODEL
    return {
      lane: "wllama",
      availability: "needs-download",
      model: modelLabel(source),
      downloadBytes: isDefault(source) ? DEFAULT_DOWNLOAD_BYTES : null,
    }
  },

  async create(options: CreateSessionOptions): Promise<Session> {
    const assets = options.assets?.wllama
    if (!assets) {
      throw new PocketLlmError(
        'the wllama lane requires WebAssembly asset URLs; pass createSession({ assets: { wllama: { default: "<url to wllama.wasm>" } } })',
      )
    }
    const { Wllama } = await import("@wllama/wllama")
    const { system, responseSchema, onProgress } = options
    const wllama = new Wllama(assets)
    await wllama.loadModelFromHF(options.models?.wllama ?? DEFAULT_MODEL, {
      n_threads: 1,
      ...(onProgress ? { progressCallback: onProgress } : {}),
    })
    const grammar = responseSchema ? jsonSchemaToGbnf(responseSchema) : undefined
    const systemMessages: ChatCompletionMessage[] = system ? [{ role: "system", content: system }] : []
    return {
      async prompt(text: string): Promise<unknown> {
        const completion = await wllama.createChatCompletion({
          messages: [...systemMessages, { role: "user", content: text }],
          ...(grammar ? { grammar } : {}),
        })
        const content = completion.choices[0]?.message.content ?? ""
        return responseSchema ? JSON.parse(content) : content
      },
      async destroy(): Promise<void> {
        await wllama.exit()
      },
    }
  },
}
