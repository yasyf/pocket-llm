import type { CreateSessionOptions, Detection, DetectOptions, LaneDefinition, ProgressCallback, Session } from "../types.ts"

const MODEL = "chrome-builtin"

function isUsable(availability: LanguageModelAvailability): boolean {
  return availability === "available" || availability === "downloadable"
}

function downloadMonitor(onProgress: ProgressCallback): (monitor: LanguageModelDownloadMonitor) => void {
  return (monitor) => {
    monitor.addEventListener("downloadprogress", (event) => onProgress({ loaded: event.loaded, total: 1 }))
  }
}

export const promptApiLane: LaneDefinition = {
  lane: "prompt-api",

  async detect(_options: DetectOptions): Promise<Detection | null> {
    if (!("LanguageModel" in globalThis)) return null
    const availability = await LanguageModel.availability()
    if (!isUsable(availability)) return null
    return {
      lane: "prompt-api",
      availability: availability === "available" ? "ready" : "needs-download",
      model: MODEL,
      downloadBytes: 0,
    }
  },

  async create(options: CreateSessionOptions): Promise<Session> {
    const { system, responseSchema, onProgress } = options
    const session = await LanguageModel.create({
      ...(system ? { initialPrompts: [{ role: "system", content: system }] } : {}),
      ...(onProgress ? { monitor: downloadMonitor(onProgress) } : {}),
    })
    return {
      async prompt(text: string): Promise<unknown> {
        const output = await session.prompt(text, responseSchema ? { responseConstraint: responseSchema } : undefined)
        return responseSchema ? JSON.parse(output) : output
      },
      async destroy(): Promise<void> {
        session.destroy()
      },
    }
  },
}
