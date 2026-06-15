import type { BuildGraphOptions } from "../../graph/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";

export function graphScanOptionsForTaskContract(
  contract: TaskContract | undefined,
): BuildGraphOptions {
  return {
    excludePathPatterns: contract?.metadata?.requiredDoNotUsePaths ?? [],
    excludeProtectedPaths: true,
  };
}
