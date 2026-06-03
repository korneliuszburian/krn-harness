import type { TaskContract } from "./schema.js";

export function validateContract(contract: TaskContract): string[] {
  const issues: string[] = [];

  if (!contract.id) {
    issues.push("contract.id is required");
  }

  if (!contract.stop && !contract.task) {
    issues.push("contract.task is required unless STOP is set");
  }

  if (!contract.rawUserIntent && !contract.stop) {
    issues.push("contract.rawUserIntent is required unless STOP is set");
  }

  if (!contract.interpretation) {
    issues.push("contract.interpretation is required");
  }

  if (!contract.mode || contract.mode === "unknown") {
    issues.push("contract.mode must be known");
  }

  if (!Array.isArray(contract.evidenceRequirements) || contract.evidenceRequirements.length === 0) {
    issues.push("contract.evidenceRequirements must not be empty");
  }

  if (!Array.isArray(contract.stopConditions)) {
    issues.push("contract.stopConditions must be an array");
  }

  return issues;
}
