import { taskIdFor } from "../../trace/src/index.js";
import { classifyTask, isNonTrivialTask, modeForClassification } from "./classify-task.js";
import type { TaskContract } from "./schema.js";

export function buildTaskContract(task: string): TaskContract {
  const trimmed = task.trim();
  const stop = trimmed.length === 0;
  const classification = classifyTask(trimmed);
  const nonTrivial = isNonTrivialTask(trimmed);
  const stopConditions = [
    {
      code: "task.empty",
      reason: "Task text is empty",
      active: stop,
    },
  ];

  const contract: TaskContract = {
    id: taskIdFor(trimmed || "empty-task"),
    rawUserIntent: task,
    task: trimmed,
    interpretation: stop
      ? "No task intent was provided."
      : `Treat this as ${classification} work and gather context before edits.`,
    classification,
    mode: modeForClassification(classification),
    nonTrivial,
    acceptance: [
      "Scope is explicit",
      "Relevant context is gathered",
      "Validation evidence is recorded",
    ],
    proof: ["krn verify", "krn handoff"],
    evidenceRequirements: [
      "current task contract",
      "current context package",
      "trace event for task start",
      "validation command output or explicit reason it could not run",
    ],
    stopConditions,
    stop,
  };

  if (stop) {
    contract.stopReason = "Task text is empty";
  }

  return contract;
}
