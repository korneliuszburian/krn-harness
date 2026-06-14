import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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
  return path.join(cwd, ".krn", "runs", taskId);
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
  return path.join(cwd, ".krn", "current", "run.json");
}

function runArtifactPaths(taskId: string): Record<string, string> {
  return {
    contextPackageJson: ".krn/current/context-package.json",
    contextPackageMarkdown: ".krn/current/context-package.md",
    doctorResultJson: ".krn/current/doctor-result.json",
    doctorResultMarkdown: ".krn/current/doctor-result.md",
    evalResultJson: ".krn/current/eval-result.json",
    evalResultMarkdown: ".krn/current/eval-result.md",
    globalTrace: ".krn/traces/trace.jsonl",
    graphJson: ".krn/graph/repo-graph.json",
    graphMarkdown: ".krn/graph/repo-graph.md",
    handoffMarkdown: ".krn/current/handoff.md",
    runMetadata: `.krn/runs/${taskId}/run.json`,
    runSummary: `.krn/runs/${taskId}/summary.md`,
    runTrace: `.krn/runs/${taskId}/trace.jsonl`,
    operatorSummaryJson: ".krn/current/operator-summary.json",
    operatorSummaryMarkdown: ".krn/current/operator-summary.md",
    operatorReportHtml: ".krn/current/operator-report.html",
    operatorReportJson: ".krn/current/operator-report.json",
    operatorReportMarkdown: ".krn/current/operator-report.md",
    reviewSummaryJson: ".krn/current/review-summary.json",
    reviewSummaryMarkdown: ".krn/current/review-summary.md",
    reviewResultJson: ".krn/current/review-result.json",
    reviewResultMarkdown: ".krn/current/review-result.md",
    taskContractJson: ".krn/current/task-contract.json",
    taskContractMarkdown: ".krn/current/task-contract.md",
    verifyResultJson: ".krn/current/verify-result.json",
    verifyResultMarkdown: ".krn/current/verify-result.md",
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

function currentRunPointer(taskId: string): CurrentRunPointer {
  return {
    schemaVersion: 1,
    taskId,
    runDir: `.krn/runs/${taskId}`,
    tracePath: `.krn/runs/${taskId}/trace.jsonl`,
    runMetadataPath: `.krn/runs/${taskId}/run.json`,
    taskContractPath: ".krn/current/task-contract.json",
    contextPackagePath: ".krn/current/context-package.json",
    graphArtifactPath: ".krn/graph/repo-graph.json",
    verifyResultPath: ".krn/current/verify-result.json",
    handoffPath: ".krn/current/handoff.md",
    doctorResultPath: ".krn/current/doctor-result.json",
    evalResultPath: ".krn/current/eval-result.json",
    operatorSummaryPath: ".krn/current/operator-summary.json",
    reviewSummaryPath: ".krn/current/review-summary.json",
  };
}

async function writeCurrentRunPointer(cwd: string, taskId: string): Promise<void> {
  await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
  await writeFile(
    currentRunPath(cwd),
    `${JSON.stringify(currentRunPointer(taskId), null, 2)}\n`,
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
    artifactPaths: runArtifactPaths(event.taskId),
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
