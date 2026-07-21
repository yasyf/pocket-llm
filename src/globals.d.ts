export {}

declare global {
  interface GPUAdapter {
    readonly isFallbackAdapter?: boolean
  }

  interface GPU {
    requestAdapter(): Promise<GPUAdapter | null>
  }

  interface Navigator {
    readonly gpu?: GPU
  }

  type LanguageModelAvailability = "unavailable" | "downloadable" | "downloading" | "available"

  interface LanguageModelDownloadProgressEvent extends Event {
    readonly loaded: number
  }

  interface LanguageModelDownloadMonitor extends EventTarget {
    addEventListener(
      type: "downloadprogress",
      listener: (event: LanguageModelDownloadProgressEvent) => void,
    ): void
  }

  interface LanguageModelMessage {
    readonly role: "system" | "user" | "assistant"
    readonly content: string
  }

  interface LanguageModelCreateOptions {
    initialPrompts?: readonly LanguageModelMessage[]
    monitor?: (monitor: LanguageModelDownloadMonitor) => void
    signal?: AbortSignal
    temperature?: number
    topK?: number
  }

  interface LanguageModelPromptOptions {
    responseConstraint?: object
    signal?: AbortSignal
  }

  interface LanguageModelSession {
    prompt(input: string, options?: LanguageModelPromptOptions): Promise<string>
    destroy(): void
  }

  interface LanguageModelApi {
    availability(): Promise<LanguageModelAvailability>
    create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>
  }

  var LanguageModel: LanguageModelApi
}
