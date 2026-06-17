import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRuntimeLayout, runtimePath } from "../../core/src/index.js";
import {
  createTraceEvent,
  defaultTracePath,
  type JsonValue,
  type TraceEvent,
  type TraceEventName,
  writeTraceEvent,
} from "../../trace/src/index.js";
import { readCurrentTaskId } from "./current-state.js";
import type { CliRuntime } from "./runtime.js";

export interface RunMetadataEvent {
  id: string;
  timestamp: string;
  name: TraceEventName;
}

export interface RunMetadata {
  schemaVersion: 1;
  taskId: string;
  startedAt: string;
  lastEventAt: string;
  events: RunMetadataEvent[];
  artifactPaths: Record<string, string>;
  current: true;
}

export interface CurrentRunPointer {
  schemaVersion: 1;
  taskId: string;
  runDir: string;
  tracePath: string;
  runMetadataPath: string;
  taskContractPath: string;
  contextPackagePath: string;
  graphArtifactPath: string;
  verifyResultPath: string;
  handoffPath: string;
  doctorResultPath: string;
  evalResultPath: string;
  operatorSummaryPath: string;
  reviewSummaryPath: string;
}

export interface EmitCliTraceInput {
  taskId?: string | undefined;
  data?: Record<string, JsonValue> | undefined;
  runScoped?: boolean | undefined;
}

export function runDirPath(cwd: string, taskId: string): string {
  return path.join(cwd, getRuntimeLayout(cwd).runsDir, taskId);
}

export function runTracePath(cwd: string, taskId: string): string {
  return path.join(runDirPath(cwd, taskId), "trace.jsonl");
}

export function runMetadataPath(cwd: string, taskId: string): string {
  return path.join(runDirPath(cwd, taskId), "run.json");
}

export function runSummaryPath(cwd: string, taskId: string): string {
  return path.join(runDirPath(cwd, taskId), "summary.md");
}

function currentRunPath(cwd: string): string {
  return path.join(cwd, getRuntimeLayout(cwd).currentDir, "run.json");
}

function runArtifactPaths(cwd: string, taskId: string): Record<string, string> {
  const layout = getRuntimeLayout(cwd);
  return {
    contextPackageJson: runtimePath(layout.currentDir, "context-package.json"),
    contextPackageMarkdown: runtimePath(layout.currentDir, "context-package.md"),
    doctorResultJson: runtimePath(layout.currentDir, "doctor-result.json"),
    doctorResultMarkdown: runtimePath(layout.currentDir, "doctor-result.md"),
    evalResultJson: runtimePath(layout.currentDir, "eval-result.json"),
    evalResultMarkdown: runtimePath(layout.currentDir, "eval-result.md"),
    globalTrace: runtimePath(layout.tracesDir, "trace.jsonl"),
    graphJson: runtimePath(layout.graphDir, "repo-graph.json"),
    graphMarkdown: runtimePath(layout.graphDir, "repo-graph.md"),
    handoffMarkdown: runtimePath(layout.currentDir, "handoff.md"),
    runMetadata: runtimePath(layout.runsDir, taskId, "run.json"),
    runSummary: runtimePath(layout.runsDir, taskId, "summary.md"),
    runTrace: runtimePath(layout.runsDir, taskId, "trace.jsonl"),
    operatorSummaryJson: runtimePath(layout.currentDir, "operator-summary.json"),
    operatorSummaryMarkdown: runtimePath(layout.currentDir, "operator-summary.md"),
    operatorReportHtml: runtimePath(layout.currentDir, "operator-report.html"),
    operatorReportJson: runtimePath(layout.currentDir, "operator-report.json"),
    operatorReportMarkdown: runtimePath(layout.currentDir, "operator-report.md"),
    reviewSummaryJson: runtimePath(layout.currentDir, "review-summary.json"),
    reviewSummaryMarkdown: runtimePath(layout.currentDir, "review-summary.md"),
    reviewResultJson: runtimePath(layout.currentDir, "review-result.json"),
    reviewResultMarkdown: runtimePath(layout.currentDir, "review-result.md"),
    taskContractJson: runtimePath(layout.currentDir, "task-contract.json"),
    taskContractMarkdown: runtimePath(layout.currentDir, "task-contract.md"),
    verifyResultJson: runtimePath(layout.currentDir, "verify-result.json"),
    verifyResultMarkdown: runtimePath(layout.currentDir, "verify-result.md"),
  };
}

function renderRunSummaryMarkdown(metadata: RunMetadata): string {
  const lastEvent = metadata.events.at(-1);
  const artifactLines = Object.entries(metadata.artifactPaths)
    .map(([name, artifactPath]) => `- ${name}: ${artifactPath}`)
    .join("\n");

  return `# KRN Run Summary

Task ID: ${metadata.taskId}
Event count: ${metadata.events.length}
Last event: ${lastEvent?.name ?? "none"}
Last event at: ${metadata.lastEventAt}

## Artifact Paths

${artifactLines}

## P0 Limits

This is local evidence only. It is not telemetry, monitoring, CI, or production audit infrastructure.
`;
}

function currentRunPointer(cwd: string, taskId: string): CurrentRunPointer {
  const layout = getRuntimeLayout(cwd);
  return {
    schemaVersion: 1,
    taskId,
    runDir: runtimePath(layout.runsDir, taskId),
    tracePath: runtimePath(layout.runsDir, taskId, "trace.jsonl"),
    runMetadataPath: runtimePath(layout.runsDir, taskId, "run.json"),
    taskContractPath: runtimePath(layout.currentDir, "task-contract.json"),
    contextPackagePath: runtimePath(layout.currentDir, "context-package.json"),
    graphArtifactPath: runtimePath(layout.graphDir, "repo-graph.json"),
    verifyResultPath: runtimePath(layout.currentDir, "verify-result.json"),
    handoffPath: runtimePath(layout.currentDir, "handoff.md"),
    doctorResultPath: runtimePath(layout.currentDir, "doctor-result.json"),
    evalResultPath: runtimePath(layout.currentDir, "eval-result.json"),
    operatorSummaryPath: runtimePath(layout.currentDir, "operator-summary.json"),
    reviewSummaryPath: runtimePath(layout.currentDir, "review-summary.json"),
  };
}

async function writeCurrentRunPointer(cwd: string, taskId: string): Promise<void> {
  await mkdir(path.join(cwd, getRuntimeLayout(cwd).currentDir), { recursive: true });
  await writeFile(
    currentRunPath(cwd),
    `${JSON.stringify(currentRunPointer(cwd, taskId), null, 2)}\n`,
    "utf8",
  );
}

async function readRunMetadata(cwd: string, taskId: string): Promise<RunMetadata | undefined> {
  try {
    return JSON.parse(await readFile(runMetadataPath(cwd, taskId), "utf8")) as RunMetadata;
  } catch {
    return undefined;
  }
}

async function updateRunMetadata(cwd: string, event: TraceEvent): Promise<void> {
  if (!event.taskId) {
    return;
  }

  const existing = await readRunMetadata(cwd, event.taskId);
  const metadata: RunMetadata = {
    schemaVersion: 1,
    taskId: event.taskId,
    startedAt: existing?.startedAt ?? event.timestamp,
    lastEventAt: event.timestamp,
    events: [
      ...(existing?.events ?? []),
      {
        id: event.id,
        timestamp: event.timestamp,
        name: event.name,
      },
    ],
    artifactPaths: runArtifactPaths(cwd, event.taskId),
    current: true,
  };

  await mkdir(runDirPath(cwd, event.taskId), { recursive: true });
  await writeFile(
    runMetadataPath(cwd, event.taskId),
    `${JSON.stringify(metadata, null, 2)}\n`,
    "utf8",
  );
  await writeFile(runSummaryPath(cwd, event.taskId), renderRunSummaryMarkdown(metadata), "utf8");
}

export async function emitCliTrace(
  runtime: CliRuntime,
  name: TraceEventName,
  input: EmitCliTraceInput = {},
): Promise<TraceEvent> {
  const taskId =
    input.taskId ?? (input.runScoped ? await readCurrentTaskId(runtime.cwd) : undefined);
  const event = createTraceEvent(name, {
    taskId,
    now: runtime.now?.(),
    data: input.data,
  });

  await writeTraceEvent(event, runtime.tracePath ?? defaultTracePath(runtime.cwd));

  if (input.runScoped && event.taskId) {
    await writeTraceEvent(event, runTracePath(runtime.cwd, event.taskId));
    await updateRunMetadata(runtime.cwd, event);
    await writeCurrentRunPointer(runtime.cwd, event.taskId);
  }

  return event;
}
