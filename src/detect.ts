import type { Detection, DetectOptions } from "./types.ts"

import { selectLanes } from "./chain.ts"
import { PocketLlmError } from "./errors.ts"

/**
 * Feature-detects the fastest eligible engine and the smallest model it serves,
 * without triggering any download. Lanes are tried in order (Prompt API,
 * WebLLM, wllama) and the first eligible one wins.
 */
export async function detect(options: DetectOptions = {}): Promise<Detection> {
  for (const lane of selectLanes(options.lanes)) {
    const detection = await lane.detect(options)
    if (detection) return detection
  }
  throw new PocketLlmError("no on-device LLM lane is eligible in this environment")
}
