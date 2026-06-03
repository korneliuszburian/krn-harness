import { taskIdFor } from "../../trace/src/index.js";
import { classifyTask } from "./classify-task.js";
import type { TaskContract } from "./schema.js";

export function buildTaskContract(task: string): TaskContract {
  const trimmed = task.trim();
  const stop = trimmed.length === 0;

  const contract: TaskContract = {
    id: taskIdFor(trimmed || "empty-task"),
    task: trimmed,
    classification: classifyTask(trimmed),
    acceptance: [
      "Scope is explicit",
      "Relevant context is gathered",
      "Validation evidence is recorded",
    ],
    proof: ["krn verify", "krn handoff"],
    stop,
  };

  if (stop) {
    contract.stopReason = "Task text is empty";
  }

  return contract;
}
