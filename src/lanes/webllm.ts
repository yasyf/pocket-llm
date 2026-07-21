import type { ChatCompletionMessageParam, InitProgressReport, ResponseFormat } from "@mlc-ai/web-llm"

import type { CreateSessionOptions, Detection, DetectOptions, LaneDefinition, ProgressCallback, Session } from "../types.ts"

const DEFAULT_MODEL = "SmolLM2-135M-Instruct-q0f16-MLC"
const DEFAULT_DOWNLOAD_BYTES = 269_030_016

async function hasWebGPU(): Promise<boolean> {
  return navigator.gpu !== undefined && (await navigator.gpu.requestAdapter()) !== null
}

function initProgress(onProgress: ProgressCallback): (report: InitProgressReport) => void {
  return (report) => onProgress({ loaded: report.progress, total: 1 })
}

export const webllmLane: LaneDefinition = {
  lane: "webllm",

  async detect(options: DetectOptions): Promise<Detection | null> {
    if (!(await hasWebGPU())) return null
    const model = options.models?.webllm ?? DEFAULT_MODEL
    return {
      lane: "webllm",
      availability: "needs-download",
      model,
      downloadBytes: model === DEFAULT_MODEL ? DEFAULT_DOWNLOAD_BYTES : null,
    }
  },

  async create(options: CreateSessionOptions): Promise<Session> {
    const { CreateMLCEngine } = await import("@mlc-ai/web-llm")
    const { system, responseSchema, onProgress } = options
    const engine = await CreateMLCEngine(options.models?.webllm ?? DEFAULT_MODEL, {
      ...(onProgress ? { initProgressCallback: initProgress(onProgress) } : {}),
    })
    const systemMessages: ChatCompletionMessageParam[] = system ? [{ role: "system", content: system }] : []
    const responseFormat: ResponseFormat | undefined = responseSchema
      ? { type: "json_object", schema: JSON.stringify(responseSchema) }
      : undefined
    return {
      async prompt(text: string): Promise<unknown> {
        const completion = await engine.chat.completions.create({
          messages: [...systemMessages, { role: "user", content: text }],
          ...(responseFormat ? { response_format: responseFormat } : {}),
        })
        const content = completion.choices[0]?.message.content ?? ""
        return responseSchema ? JSON.parse(content) : content
      },
      async destroy(): Promise<void> {
        await engine.unload()
      },
    }
  },
}
