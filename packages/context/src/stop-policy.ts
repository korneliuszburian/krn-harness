import type { TaskContract } from "../../task-contract/src/index.js";
import type { ContextBuckets } from "./schema.js";

export function shouldStop(
  contract?: TaskContract,
  buckets?: Pick<ContextBuckets, "missingContext">,
): { stop: boolean; reason?: string } {
  if (!contract) {
    return {
      stop: false,
    };
  }

  if (contract.stop) {
    return {
      stop: true,
      reason: contract.stopReason ?? "Task contract requested STOP",
    };
  }

  if (buckets && buckets.missingContext.length > 0) {
    return {
      stop: true,
      reason: `Required context is missing: ${buckets.missingContext
        .map((item) => item.path)
        .join(", ")}`,
    };
  }

  return {
    stop: false,
  };
}
