import type { TaskContract } from "../../task-contract/src/index.js";

export function shouldStop(contract?: TaskContract): { stop: boolean; reason?: string } {
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

  return {
    stop: false,
  };
}
