import { readFile, realpath } from "node:fs/promises";
import path from "node:path";
import { getRuntimeLayout, runtimePath } from "../../../core/src/index.js";
import { buildTaskContract, parseTaskSpecInput } from "../../../task-contract/src/index.js";
import { ensureCurrentStateDir, writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

type TaskContractForMarkdown = ReturnType<typeof buildTaskContract>;

function renderMetadataLines(contract: TaskContractForMarkdown): string[] {
  const metadata = contract.metadata;
  if (!metadata) {
    return [];
  }

  const boundaries = metadata.boundaries;
  const targetValidation = boundaries?.targetValidation;
  const visualProof = metadata.visualProof;
  const targetOwnedVisualCommand = visualProof?.targetOwnedVisualCommand;
  const lines = [
    ...(metadata.taskSpecPath ? [`- Task spec path: ${metadata.taskSpecPath}`] : []),
    ...(metadata.expectedTouchedFiles
      ? [`- Expected touched files: ${metadata.expectedTouchedFiles.join(", ")}`]
      : []),
    ...(metadata.forbiddenTouchedFiles
      ? [`- Forbidden touched files: ${metadata.forbiddenTouchedFiles.join(", ")}`]
      : []),
    ...(metadata.requiredDoNotUsePaths
      ? [`- Required do-not-use paths: ${metadata.requiredDoNotUsePaths.join(", ")}`]
      : []),
    ...(targetValidation
      ? [
          `- Target validation: ${targetValidation.command} (${targetValidation.coverage}, authority: ${targetValidation.authority})`,
          `- Target validation reason: ${targetValidation.reason}`,
        ]
      : []),
    ...(targetValidation?.limitations
      ? [`- Target validation limitations: ${targetValidation.limitations.join(", ")}`]
      : []),
    ...(targetValidation?.unsafeIf
      ? [`- Target validation unsafe if: ${targetValidation.unsafeIf.join(", ")}`]
      : []),
    ...(boundaries?.rollback ? [`- Rollback boundary: ${boundaries.rollback.boundary}`] : []),
    ...(boundaries?.noPush ? ["- No push: true"] : []),
    ...(boundaries?.noMerge ? ["- No merge: true"] : []),
    ...(boundaries?.targetApproval
      ? [
          `- Target approval required: ${boundaries.targetApproval.required ? "true" : "false"}`,
          ...(boundaries.targetApproval.approvalRef
            ? [`- Target approval reference: ${boundaries.targetApproval.approvalRef}`]
            : []),
        ]
      : []),
    ...(boundaries?.targetIsolation
      ? [
          `- Target isolated: ${boundaries.targetIsolation.isolated ? "true" : "false"}`,
          `- Source checkout rejected: ${
            boundaries.targetIsolation.sourceCheckoutRejected ? "true" : "false"
          }`,
          ...(boundaries.targetIsolation.isolatedPath
            ? [`- Target isolated path: ${boundaries.targetIsolation.isolatedPath}`]
            : []),
          ...(boundaries.targetIsolation.baseCommit
            ? [`- Target base commit: ${boundaries.targetIsolation.baseCommit}`]
            : []),
          ...(boundaries.targetIsolation.reason
            ? [`- Target isolation reason: ${boundaries.targetIsolation.reason}`]
            : []),
        ]
      : []),
    ...(boundaries?.protectedData
      ? [
          `- Protected data allowed: ${boundaries.protectedData.allowed ? "true" : "false"}`,
          ...(boundaries.protectedData.paths
            ? [`- Protected data paths: ${boundaries.protectedData.paths.join(", ")}`]
            : []),
          ...(boundaries.protectedData.reason
            ? [`- Protected data reason: ${boundaries.protectedData.reason}`]
            : []),
        ]
      : []),
    ...(visualProof?.route ? [`- Visual proof route: ${visualProof.route}`] : []),
    ...(visualProof?.component ? [`- Visual proof component: ${visualProof.component}`] : []),
    ...(visualProof?.viewports
      ? [`- Visual proof viewports: ${visualProof.viewports.join(", ")}`]
      : []),
    ...(visualProof?.designConstraints
      ? [`- Visual proof design constraints: ${visualProof.designConstraints.join(", ")}`]
      : []),
    ...(visualProof?.a11yExpectations
      ? [`- Visual proof a11y expectations: ${visualProof.a11yExpectations.join(", ")}`]
      : []),
    ...(visualProof?.copyStatus ? [`- Visual proof copy status: ${visualProof.copyStatus}`] : []),
    ...(visualProof?.manualVisualArtifact
      ? [`- Visual proof manual artifact: ${visualProof.manualVisualArtifact}`]
      : []),
    ...(targetOwnedVisualCommand
      ? [
          `- Visual proof target-owned command: ${targetOwnedVisualCommand.command} (authority: ${targetOwnedVisualCommand.authority})`,
          `- Visual proof target-owned command reason: ${targetOwnedVisualCommand.reason}`,
        ]
      : []),
    ...(targetOwnedVisualCommand?.limitations
      ? [
          `- Visual proof target-owned command limitations: ${targetOwnedVisualCommand.limitations.join(
            ", ",
          )}`,
        ]
      : []),
    ...(targetOwnedVisualCommand?.unsafeIf
      ? [
          `- Visual proof target-owned command unsafe if: ${targetOwnedVisualCommand.unsafeIf.join(
            ", ",
          )}`,
        ]
      : []),
  ];

  return lines;
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
    ...(contract.metadata ? ["## Metadata", "", ...renderMetadataLines(contract), ""] : []),
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

  const [repoRoot, resolvedTaskSpec] = await Promise.all([
    realpath(cwd),
    realpath(path.join(cwd, normalized)),
  ]);
  const relativeResolvedPath = path.relative(repoRoot, resolvedTaskSpec);

  if (relativeResolvedPath.startsWith("..") || path.isAbsolute(relativeResolvedPath)) {
    throw new Error("--task-spec must resolve inside the current repository");
  }

  const raw = await readFile(resolvedTaskSpec, "utf8");
  let taskSpecJson: unknown;
  try {
    taskSpecJson = JSON.parse(raw) as unknown;
  } catch {
    throw new Error("--task-spec JSON must be valid JSON");
  }

  let parsed: ReturnType<typeof parseTaskSpecInput>;
  try {
    parsed = parseTaskSpecInput(taskSpecJson);
  } catch (error) {
    throw new Error(`--task-spec JSON ${error instanceof Error ? error.message : String(error)}`);
  }

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
      ...(parsed.boundaries ? { boundaries: parsed.boundaries } : {}),
      ...(parsed.visualProof ? { visualProof: parsed.visualProof } : {}),
    },
  };
}

export async function startCommand(taskParts: string[], runtime: CliRuntime): Promise<number> {
  const layout = getRuntimeLayout(runtime.cwd);
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
contract: ${runtimePath(layout.currentDir, "task-contract.md")}
`);
  for (const warning of contract.intentWarnings) {
    runtime.stderr(`KRN start warning: ${warning}\n`);
  }

  return 0;
}
