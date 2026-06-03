import type { TaskContract } from "../../task-contract/src/index.js";
import { rankContext } from "./rank-context.js";
import type { ContextPackage } from "./schema.js";
import { shouldStop } from "./stop-policy.js";

export function buildContextPackage(contract?: TaskContract): ContextPackage {
  const stop = shouldStop(contract);
  const pkg: ContextPackage = {
    taskId: contract?.id,
    items: rankContext([
      {
        path: "AGENTS.md",
        reason: "Repo-level operating contract",
        priority: 100,
      },
      {
        path: "docs/architecture/architecture-spec-v0.1.md",
        reason: "P0 architecture canon when present",
        priority: 80,
      },
    ]),
    stop: stop.stop,
  };

  if (stop.reason) {
    pkg.stopReason = stop.reason;
  }

  return pkg;
}
