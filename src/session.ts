import type { CreateSessionOptions, DetectOptions, Session } from "./types.ts"

import { selectLanes } from "./chain.ts"
import { PocketLlmError } from "./errors.ts"

/**
 * Downloads (if needed) and starts a session on the first eligible lane. A lane
 * whose `create` throws falls through to the next eligible lane; the last
 * failure surfaces when none succeeds. Call {@link detect} first to preview.
 */
export async function createSession(options: CreateSessionOptions = {}): Promise<Session> {
  const detectOptions: DetectOptions = { lanes: options.lanes, models: options.models }
  const failures: Error[] = []
  for (const lane of selectLanes(options.lanes)) {
    if (!(await lane.detect(detectOptions))) continue
    try {
      return await lane.create(options)
    } catch (error) {
      failures.push(error instanceof Error ? error : new PocketLlmError(String(error)))
    }
  }
  const lastFailure = failures.at(-1)
  if (lastFailure) throw lastFailure
  throw new PocketLlmError("no on-device LLM lane is eligible in this environment")
}
