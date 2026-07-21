/** Raised for every fault the library surfaces: no eligible lane, missing assets, unsupported schema. */
export class PocketLlmError extends Error {
  readonly name = "PocketLlmError"
}
