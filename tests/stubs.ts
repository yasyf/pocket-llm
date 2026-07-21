const ORIGINAL_NAVIGATOR = Object.getOwnPropertyDescriptor(globalThis, "navigator")

const DEFAULT_SESSION: LanguageModelApi["create"] = async () => ({
  prompt: async () => "",
  destroy: () => {},
})

export function setLanguageModel(
  availability: LanguageModelAvailability | null,
  create: LanguageModelApi["create"] = DEFAULT_SESSION,
): void {
  if (availability === null) {
    Reflect.deleteProperty(globalThis, "LanguageModel")
    return
  }
  globalThis.LanguageModel = { availability: async () => availability, create }
}

export function setGpuAdapter(adapter: GPUAdapter | null | undefined): void {
  const value = adapter === undefined ? {} : { gpu: { requestAdapter: async () => adapter } }
  Object.defineProperty(globalThis, "navigator", { value, configurable: true, writable: true })
}

export function restoreGlobals(): void {
  Reflect.deleteProperty(globalThis, "LanguageModel")
  if (ORIGINAL_NAVIGATOR) Object.defineProperty(globalThis, "navigator", ORIGINAL_NAVIGATOR)
  else Reflect.deleteProperty(globalThis, "navigator")
}
