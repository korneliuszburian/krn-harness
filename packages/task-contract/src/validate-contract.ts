import { formatTaskContractIssues, type TaskContract, TaskContractSchema } from "./schema.js";

export function validateContract(contract: TaskContract): string[] {
  const parsed = TaskContractSchema.safeParse(contract);
  const issues = parsed.success ? [] : formatTaskContractIssues(parsed.error);

  if (!contract.stop && !contract.task) {
    issues.push("contract.task is required unless STOP is set");
  }

  if (!contract.rawUserIntent && !contract.stop) {
    issues.push("contract.rawUserIntent is required unless STOP is set");
  }

  if (!contract.mode || contract.mode === "unknown") {
    issues.push("contract.mode must be known");
  }

  return [...new Set(issues)];
}
