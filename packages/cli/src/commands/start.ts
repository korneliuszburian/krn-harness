import { readFile } from "node:fs/promises";
import path from "node:path";
import { buildTaskContract } from "../../../task-contract/src/index.js";
import { ensureCurrentStateDir, writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

interface TaskSpecInput {
  prompt: string;
  expectedTouchedFiles?: string[] | undefined;
  forbiddenTouchedFiles?: string[] | undefined;
  requiredDoNotUsePaths?: string[] | undefined;
}

function renderContractMarkdown(contract: ReturnType<typeof buildTaskContract>): string {
  const lines = [
    "# KRN Task Contract",
    "",
    `Task ID: ${contract.id}`,
    `Classification: ${contract.classification}`,
    `Mode: ${contract.mode}`,
    `Non-trivial: ${contract.nonTrivial ? "true" : "false"}`,
    `Intent quality: ${contract.intentQuality}`,
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
    "## Intent Warnings",
    "",
    ...(contract.intentWarnings.length === 0
      ? ["- none"]
      : contract.intentWarnings.map((item) => `- ${item}`)),
    "",
    ...(contract.metadata
      ? [
          "## Metadata",
          "",
          ...(contract.metadata.taskSpecPath
            ? [`- Task spec path: ${contract.metadata.taskSpecPath}`]
            : []),
          ...(contract.metadata.expectedTouchedFiles
            ? [`- Expected touched files: ${contract.metadata.expectedTouchedFiles.join(", ")}`]
            : []),
          ...(contract.metadata.forbiddenTouchedFiles
            ? [`- Forbidden touched files: ${contract.metadata.forbiddenTouchedFiles.join(", ")}`]
            : []),
          ...(contract.metadata.requiredDoNotUsePaths
            ? [`- Required do-not-use paths: ${contract.metadata.requiredDoNotUsePaths.join(", ")}`]
            : []),
          "",
        ]
      : []),
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

function parseStartArgs(taskParts: string[]): {
  taskParts: string[];
  taskSpecPath?: string;
  taskSpecPathMissing: boolean;
} {
  const task: string[] = [];
  let taskSpecPath: string | undefined;
  let taskSpecPathMissing = false;

  for (let index = 0; index < taskParts.length; index += 1) {
    const part = taskParts[index];
    if (part === undefined) {
      continue;
    }

    if (part === "--task-spec") {
      const nextPart = taskParts[index + 1];
      taskSpecPathMissing = nextPart === undefined;
      if (nextPart !== undefined) {
        taskSpecPath = nextPart;
      }
      index += 1;
      continue;
    }

    task.push(part);
  }

  return {
    taskParts: task,
    ...(taskSpecPath !== undefined ? { taskSpecPath } : {}),
    taskSpecPathMissing,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalStringArray(value: unknown, key: string): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string" || item.trim().length === 0)
  ) {
    throw new Error(`--task-spec JSON ${key} must be an array of non-empty strings`);
  }

  return value;
}

function parseTaskSpec(raw: string): TaskSpecInput {
  const parsed = JSON.parse(raw) as unknown;

  if (!isRecord(parsed)) {
    throw new Error("--task-spec JSON must be an object");
  }

  if (typeof parsed.prompt !== "string" || parsed.prompt.trim().length === 0) {
    throw new Error("--task-spec JSON must include a prompt");
  }

  return {
    prompt: parsed.prompt,
    expectedTouchedFiles: optionalStringArray(parsed.expectedTouchedFiles, "expectedTouchedFiles"),
    forbiddenTouchedFiles: optionalStringArray(
      parsed.forbiddenTouchedFiles,
      "forbiddenTouchedFiles",
    ),
    requiredDoNotUsePaths: optionalStringArray(
      parsed.requiredDoNotUsePaths,
      "requiredDoNotUsePaths",
    ),
  };
}

async function loadTaskSpec(
  cwd: string,
  taskSpecPath: string,
): Promise<{ task: string; metadata: ReturnType<typeof buildTaskContract>["metadata"] }> {
  if (path.isAbsolute(taskSpecPath)) {
    throw new Error("--task-spec must be a relative local path");
  }

  const normalized = path.normalize(taskSpecPath);
  if (normalized.startsWith("..") || normalized.includes(`${path.sep}..${path.sep}`)) {
    throw new Error("--task-spec must stay inside the current repository");
  }

  const raw = await readFile(path.join(cwd, normalized), "utf8");
  const parsed = parseTaskSpec(raw);

  return {
    task: parsed.prompt,
    metadata: {
      taskSpecPath: normalized,
      ...(parsed.expectedTouchedFiles ? { expectedTouchedFiles: parsed.expectedTouchedFiles } : {}),
      ...(parsed.forbiddenTouchedFiles
        ? { forbiddenTouchedFiles: parsed.forbiddenTouchedFiles }
        : {}),
      ...(parsed.requiredDoNotUsePaths
        ? { requiredDoNotUsePaths: parsed.requiredDoNotUsePaths }
        : {}),
    },
  };
}

export async function startCommand(taskParts: string[], runtime: CliRuntime): Promise<number> {
  const parsedArgs = parseStartArgs(taskParts);

  if (parsedArgs.taskSpecPathMissing || parsedArgs.taskSpecPath === "") {
    runtime.stderr("KRN start: --task-spec path is required\n");
    return 1;
  }

  let task = parsedArgs.taskParts.join(" ").trim();
  let metadata: ReturnType<typeof buildTaskContract>["metadata"];

  if (parsedArgs.taskSpecPath) {
    try {
      const spec = await loadTaskSpec(runtime.cwd, parsedArgs.taskSpecPath);
      task = spec.task.trim();
      metadata = spec.metadata;
    } catch (error) {
      runtime.stderr(`KRN start: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }

  if (!task) {
    runtime.stderr("KRN start: task text is required\n");
    return 1;
  }

  const contract = buildTaskContract(task, { metadata });
  await ensureCurrentStateDir(runtime.cwd);
  await writeCurrentMarkdown(runtime.cwd, "task-contract.md", renderContractMarkdown(contract));
  await writeCurrentJson(runtime.cwd, "task-contract.json", contract);

  await emitCliTrace(runtime, "task.started", {
    taskId: contract.id,
    runScoped: true,
    data: {
      classification: contract.classification,
      intentQuality: contract.intentQuality,
    },
  });

  runtime.stdout(`KRN start: task accepted
task_id: ${contract.id}
intent_quality: ${contract.intentQuality}
contract: .krn/current/task-contract.md
`);
  for (const warning of contract.intentWarnings) {
    runtime.stderr(`KRN start warning: ${warning}\n`);
  }

  return 0;
}
