import type { TaskContract } from "./schema.js";

export function validateContract(contract: TaskContract): string[] {
  const issues: string[] = [];

  if (!contract.id) {
    issues.push("contract.id is required");
  }

  if (!contract.stop && !contract.task) {
    issues.push("contract.task is required unless STOP is set");
  }

  return issues;
}
