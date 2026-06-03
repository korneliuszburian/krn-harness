import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildTaskContract } from "../../../task-contract/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

function renderContractMarkdown(contract: ReturnType<typeof buildTaskContract>): string {
  const lines = [
    "# KRN Task Contract",
    "",
    `Task ID: ${contract.id}`,
    `Classification: ${contract.classification}`,
    `Mode: ${contract.mode}`,
    `Non-trivial: ${contract.nonTrivial ? "true" : "false"}`,
    `STOP: ${contract.stop ? "true" : "false"}`,
    "",
    "## Raw User Intent",
    "",
    contract.rawUserIntent || "(empty)",
    "",
    "## Interpreted Task",
    "",
    contract.task || "(empty)",
    "",
    "## Interpretation",
    "",
    contract.interpretation,
    "",
    "## Acceptance",
    "",
    ...contract.acceptance.map((item) => `- ${item}`),
    "",
    "## Proof",
    "",
    ...contract.proof.map((item) => `- ${item}`),
    "",
    "## Evidence Requirements",
    "",
    ...contract.evidenceRequirements.map((item) => `- ${item}`),
    "",
    "## Stop Conditions",
    "",
    ...contract.stopConditions.map(
      (condition) =>
        `- ${condition.code}: ${condition.active ? "active" : "inactive"} - ${condition.reason}`,
    ),
    "",
  ];

  if (contract.stopReason) {
    lines.splice(4, 0, `Stop reason: ${contract.stopReason}`);
  }

  return lines.join("\n");
}

export async function startCommand(taskParts: string[], runtime: CliRuntime): Promise<number> {
  const task = taskParts.join(" ").trim();

  if (!task) {
    runtime.stderr("KRN start: task text is required\n");
    return 1;
  }

  const contract = buildTaskContract(task);
  const currentDir = path.join(runtime.cwd, ".krn", "current");
  await mkdir(currentDir, { recursive: true });
  await writeFile(
    path.join(currentDir, "task-contract.md"),
    renderContractMarkdown(contract),
    "utf8",
  );
  await writeFile(
    path.join(currentDir, "task-contract.json"),
    `${JSON.stringify(contract, null, 2)}\n`,
    "utf8",
  );

  await writeTraceEvent(
    createTraceEvent("task.started", {
      taskId: contract.id,
      now: runtime.now?.(),
      data: {
        classification: contract.classification,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN start: task accepted
task_id: ${contract.id}
contract: .krn/current/task-contract.md
`);

  return 0;
}
