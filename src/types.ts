/** The on-device engine backing a session. Lanes are tried in this order. */
export type Lane = "prompt-api" | "webllm" | "wllama"

/** Whether the picked model can serve immediately or must download first. */
export type Availability = "ready" | "needs-download"

/** A JSON value, as produced by `JSON.parse`. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

/** The JSON Schema primitive types understood by the GBNF converter. */
export type JsonSchemaType = "object" | "array" | "string" | "number" | "integer" | "boolean" | "null"

/**
 * A JSON Schema, as passed to a lane's structured-output constraint. Only the
 * fields the library reads are typed; any other keyword is carried through
 * untouched (and ignored by the GBNF converter).
 */
export interface JsonSchema {
  readonly type?: JsonSchemaType
  readonly properties?: Readonly<Record<string, JsonSchema>>
  readonly required?: readonly string[]
  readonly items?: JsonSchema
  readonly enum?: readonly JsonValue[]
  readonly const?: JsonValue
  readonly [key: string]: unknown
}

/** Download-progress reporter. `total` is `null` when the size is unknown. */
export type ProgressCallback = (progress: { readonly loaded: number; readonly total: number | null }) => void

/** A GGUF model on the Hugging Face hub, for the wllama lane. `file` or `quant` selects the artifact. */
export interface WllamaModelSource {
  readonly repo: string
  readonly file?: string
  readonly quant?: string
}

/** Per-lane model overrides. The Prompt API lane's model is browser-managed and not overridable. */
export interface ModelOverrides {
  readonly webllm?: string
  readonly wllama?: WllamaModelSource
}

/** WebAssembly asset URLs for the wllama lane. `default` points at the single-thread `wllama.wasm`. */
export interface WllamaAssets {
  readonly default: string
  readonly "single-thread/wllama.wasm"?: string
  readonly "multi-thread/wllama.wasm"?: string
}

/** Per-lane asset URLs. The consumer supplies these; the library hardcodes no CDN. */
export interface LaneAssets {
  readonly wllama?: WllamaAssets
}

/** The result of feature detection. Never reflects a download in progress — `detect` never downloads. */
export interface Detection {
  readonly lane: Lane
  readonly availability: Availability
  readonly model: string
  readonly downloadBytes: number | null
}

/** Options for {@link detect}. Constrains and orders the lane chain. */
export interface DetectOptions {
  readonly lanes?: readonly Lane[]
  readonly models?: ModelOverrides
}

/** Options for {@link createSession}. */
export interface CreateSessionOptions {
  readonly system?: string
  readonly responseSchema?: JsonSchema
  readonly onProgress?: ProgressCallback
  readonly models?: ModelOverrides
  readonly assets?: LaneAssets
  readonly lanes?: readonly Lane[]
}

/** A live on-device LLM session. */
export interface Session {
  /** Runs one prompt. Returns a schema-parsed object when `responseSchema` was set, a plain string otherwise. */
  prompt(text: string): Promise<unknown>
  /** Releases the underlying engine and any worker it owns. */
  destroy(): Promise<void>
}

export interface LaneDefinition {
  readonly lane: Lane
  detect(options: DetectOptions): Promise<Detection | null>
  create(options: CreateSessionOptions): Promise<Session>
}
