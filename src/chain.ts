import type { Lane, LaneDefinition } from "./types.ts"

import { promptApiLane } from "./lanes/prompt-api.ts"
import { webllmLane } from "./lanes/webllm.ts"
import { wllamaLane } from "./lanes/wllama.ts"

const LANES: Record<Lane, LaneDefinition> = {
  "prompt-api": promptApiLane,
  webllm: webllmLane,
  wllama: wllamaLane,
}

export const LANE_ORDER: readonly Lane[] = ["prompt-api", "webllm", "wllama"]

export function selectLanes(requested?: readonly Lane[]): readonly LaneDefinition[] {
  return (requested ?? LANE_ORDER).map((lane) => LANES[lane])
}
