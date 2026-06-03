import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildTaskContract } from "../../../task-contract/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

function renderContractMarkdown(task: string): string {
  const contract = buildTaskContract(task);
  const lines = [
    "# KRN Task Contract",
    "",
    `Task ID: ${contract.id}`,
    `Classification: ${contract.classification}`,
    `STOP: ${contract.stop ? "true" : "false"}`,
    "",
    "## Task",
    "",
    contract.task || "(empty)",
    "",
    "## Acceptance",
    "",
    ...contract.acceptance.map((item) => `- ${item}`),
    "",
    "## Proof",
    "",
    ...contract.proof.map((item) => `- ${item}`),
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
  await writeFile(path.join(currentDir, "task-contract.md"), renderContractMarkdown(task), "utf8");
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
