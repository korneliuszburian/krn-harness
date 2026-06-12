import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

export type DogfoodMode =
  | "baseline"
  | "krn-explicit-skill"
  | "krn-implicit-skill"
  | "krn-agents-only";

export type DogfoodRunStatus = "pass" | "fail" | "skipped";

export interface DogfoodTaskSpec {
  id: string;
  prompt: string;
  expectedTouchedFiles: string[];
  expectedUntouchedFiles?: string[] | undefined;
  forbiddenTouchedFiles: string[];
  expectedCommands: string[];
  requiredArtifacts: string[];
  requiredDoNotUsePaths?: string[] | undefined;
  requiredTraceEvents?: string[] | undefined;
  expectedVerifyStatus: string;
  expectedVerifyMode?: "record" | "execute" | undefined;
  minExecutedCommands?: number | undefined;
  handoffRequired: boolean;
  requireHandoffContent?: string[] | undefined;
  hooksExpected: boolean;
  expectedContextStop: boolean;
}

export interface DogfoodRunRecord {
  runId: string;
  mode: DogfoodMode;
  taskId: string;
  codexAvailable: boolean;
  codexCommand: string | null;
  startedAt: string;
  finishedAt: string;
  status: DogfoodRunStatus;
  touchedFiles: string[];
  forbiddenTouchedFiles: string[];
  requiredArtifactsPresent: string[];
  krnCommandsObserved: string[];
  hookTraceEvents: number;
  verifyStatus: string | null;
  handoffPresent: boolean;
  notes: string[];
}

export interface DogfoodGrade {
  name: string;
  status: "pass" | "fail";
  detail: string;
}

export interface DogfoodComplianceResult {
  status: "pass" | "fail";
  taskId: string;
  mode: DogfoodMode;
  passCount: number;
  failCount: number;
  grades: DogfoodGrade[];
}

interface CurrentRunShape {
  tracePath?: string;
}

interface VerifyShape {
  status?: string;
  mode?: string;
  summary?: {
    executedCommands?: number;
  };
}

interface ContextShape {
  stop?: boolean;
  buckets?: {
    doNotUse?: Array<{
      path?: string;
    }>;
  };
}

interface TraceShape {
  name?: string;
}

function gitDiffTouchedFiles(repoPath: string): string[] {
  const result = spawnSync("git", ["diff", "--name-only"], {
    cwd: repoPath,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    return [];
  }

  return result.stdout
    .trim()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function readTraceEvents(repoPath: string): Promise<TraceShape[]> {
  const currentRun = await readJson<CurrentRunShape>(
    path.join(repoPath, ".krn", "current", "run.json"),
  );
  const tracePaths = [currentRun?.tracePath, path.join(".krn", "traces", "trace.jsonl")].filter(
    (tracePath): tracePath is string => Boolean(tracePath),
  );

  for (const tracePath of tracePaths) {
    try {
      const raw = await readFile(path.join(repoPath, tracePath), "utf8");
      return raw
        .trim()
        .split("\n")
        .filter(Boolean)
        .map((line) => JSON.parse(line) as TraceShape);
    } catch {
      // Try the next trace location.
    }
  }

  return [];
}

function grade(name: string, pass: boolean, passDetail: string, failDetail: string): DogfoodGrade {
  return {
    name,
    status: pass ? "pass" : "fail",
    detail: pass ? passDetail : failDetail,
  };
}

function missingValues(expected: string[], actual: string[]): string[] {
  return expected.filter((value) => !actual.includes(value));
}

export async function loadDogfoodTaskSpec(filePath: string): Promise<DogfoodTaskSpec> {
  const parsed = await readJson<DogfoodTaskSpec>(filePath);

  if (!parsed) {
    throw new Error(`Unable to read dogfood task spec: ${filePath}`);
  }

  return parsed;
}

export function skippedDogfoodRunRecord(input: {
  runId: string;
  mode: DogfoodMode;
  taskId: string;
  startedAt: string;
  finishedAt: string;
  codexCommand?: string | undefined;
  note: string;
}): DogfoodRunRecord {
  return {
    runId: input.runId,
    mode: input.mode,
    taskId: input.taskId,
    codexAvailable: false,
    codexCommand: input.codexCommand ?? null,
    startedAt: input.startedAt,
    finishedAt: input.finishedAt,
    status: "skipped",
    touchedFiles: [],
    forbiddenTouchedFiles: [],
    requiredArtifactsPresent: [],
    krnCommandsObserved: [],
    hookTraceEvents: 0,
    verifyStatus: null,
    handoffPresent: false,
    notes: [input.note],
  };
}

export async function gradeDogfoodRun(input: {
  repoPath: string;
  task: DogfoodTaskSpec;
  run: DogfoodRunRecord;
}): Promise<DogfoodComplianceResult> {
  const requiredArtifactPresence = await Promise.all(
    input.task.requiredArtifacts.map(async (artifactPath) => ({
      artifactPath,
      exists: await pathExists(path.join(input.repoPath, artifactPath)),
    })),
  );
  const missingArtifacts = requiredArtifactPresence
    .filter((artifact) => !artifact.exists)
    .map((artifact) => artifact.artifactPath);
  const touchedFiles =
    input.run.touchedFiles.length > 0
      ? input.run.touchedFiles
      : gitDiffTouchedFiles(input.repoPath);
  const expectedTouchedMissing = missingValues(input.task.expectedTouchedFiles, touchedFiles);
  const expectedUntouchedTouched = (input.task.expectedUntouchedFiles ?? []).filter((filePath) =>
    touchedFiles.includes(filePath),
  );
  const forbiddenTouched = input.task.forbiddenTouchedFiles.filter((filePath) =>
    touchedFiles.includes(filePath),
  );
  const missingCommands = missingValues(input.task.expectedCommands, input.run.krnCommandsObserved);
  const verify = await readJson<VerifyShape>(
    path.join(input.repoPath, ".krn", "current", "verify-result.json"),
  );
  const context = await readJson<ContextShape>(
    path.join(input.repoPath, ".krn", "current", "context-package.json"),
  );
  const handoffPresent = await pathExists(
    path.join(input.repoPath, ".krn", "current", "handoff.md"),
  );
  const currentRunPresent = await pathExists(
    path.join(input.repoPath, ".krn", "current", "run.json"),
  );
  const traceEvents = await readTraceEvents(input.repoPath);
  const hookTraceEvents = traceEvents.filter((event) => event.name === "hook.received").length;
  const runTracePresent = traceEvents.length > 0;
  const traceEventNames = traceEvents.flatMap((event) => (event.name ? [event.name] : []));
  const verifyStatus = verify?.status ?? input.run.verifyStatus;
  const verifyMode = verify?.mode;
  const executedCommands = verify?.summary?.executedCommands ?? 0;
  const contextStop = context?.stop ?? false;
  const doNotUsePaths =
    context?.buckets?.doNotUse?.flatMap((item) => (item.path ? [item.path] : [])) ?? [];
  const missingDoNotUsePaths = missingValues(input.task.requiredDoNotUsePaths ?? [], doNotUsePaths);
  const missingTraceEvents = missingValues(input.task.requiredTraceEvents ?? [], traceEventNames);
  const handoffText = await readFile(
    path.join(input.repoPath, ".krn", "current", "handoff.md"),
    "utf8",
  ).catch(() => "");
  const missingHandoffContent = (input.task.requireHandoffContent ?? []).filter(
    (needle) => !handoffText.includes(needle),
  );
  const grades: DogfoodGrade[] = [
    grade(
      "required-artifacts",
      missingArtifacts.length === 0,
      "Required KRN artifacts are present",
      `Missing artifact(s): ${missingArtifacts.join(", ")}`,
    ),
    grade(
      "expected-touched-files",
      expectedTouchedMissing.length === 0,
      "Expected touched files are recorded",
      `Expected touched file(s) missing: ${expectedTouchedMissing.join(", ")}`,
    ),
    grade(
      "forbidden-touched-files",
      forbiddenTouched.length === 0,
      "No forbidden files were touched",
      `Forbidden file(s) touched: ${forbiddenTouched.join(", ")}`,
    ),
    ...(input.task.expectedUntouchedFiles
      ? [
          grade(
            "expected-untouched-files",
            expectedUntouchedTouched.length === 0,
            "Expected untouched files were not touched",
            `Expected untouched file(s) were touched: ${expectedUntouchedTouched.join(", ")}`,
          ),
        ]
      : []),
    grade(
      "krn-command-compliance",
      missingCommands.length === 0,
      "Expected KRN commands were observed",
      `Missing KRN command(s): ${missingCommands.join(", ")}`,
    ),
    grade(
      "verify-status",
      verifyStatus === input.task.expectedVerifyStatus,
      `Verify status is ${input.task.expectedVerifyStatus}`,
      `Expected verify status ${input.task.expectedVerifyStatus}, got ${verifyStatus ?? "missing"}`,
    ),
    ...(input.task.expectedVerifyMode
      ? [
          grade(
            "verify-mode",
            verifyMode === input.task.expectedVerifyMode,
            `Verify mode is ${input.task.expectedVerifyMode}`,
            `Expected verify mode ${input.task.expectedVerifyMode}, got ${verifyMode ?? "missing"}`,
          ),
        ]
      : []),
    ...(input.task.minExecutedCommands !== undefined
      ? [
          grade(
            "verify-executed-commands",
            executedCommands >= input.task.minExecutedCommands,
            `Verify executed at least ${input.task.minExecutedCommands} command(s)`,
            `Expected at least ${input.task.minExecutedCommands} executed command(s), got ${executedCommands}`,
          ),
        ]
      : []),
    grade(
      "handoff",
      !input.task.handoffRequired || handoffPresent || input.run.handoffPresent,
      "Handoff requirement is satisfied",
      "Handoff artifact is missing",
    ),
    ...(input.task.requireHandoffContent
      ? [
          grade(
            "handoff-content",
            missingHandoffContent.length === 0,
            "Handoff content requirement is satisfied",
            `Missing handoff content: ${missingHandoffContent.join(", ")}`,
          ),
        ]
      : []),
    grade(
      "current-run",
      currentRunPresent,
      "Current run artifact is present",
      ".krn/current/run.json is missing",
    ),
    grade(
      "trace",
      runTracePresent,
      "Run or global trace is present",
      "No run or global trace events were found",
    ),
    ...(input.task.requiredTraceEvents
      ? [
          grade(
            "trace-events",
            missingTraceEvents.length === 0,
            "Required trace events are present",
            `Missing trace event(s): ${missingTraceEvents.join(", ")}`,
          ),
        ]
      : []),
    grade(
      "hook-trace",
      !input.task.hooksExpected || hookTraceEvents > 0 || input.run.hookTraceEvents > 0,
      "Hook trace expectation is satisfied",
      "Expected hook.received trace events were missing",
    ),
    grade(
      "context-stop",
      contextStop === input.task.expectedContextStop,
      `Context STOP state is ${String(input.task.expectedContextStop)}`,
      `Expected context STOP ${String(input.task.expectedContextStop)}, got ${String(contextStop)}`,
    ),
    ...(input.task.requiredDoNotUsePaths
      ? [
          grade(
            "context-do-not-use",
            missingDoNotUsePaths.length === 0,
            "Required do-not-use context is present",
            `Missing do-not-use path(s): ${missingDoNotUsePaths.join(", ")}`,
          ),
        ]
      : []),
  ];
  const passCount = grades.filter((item) => item.status === "pass").length;
  const failCount = grades.length - passCount;

  return {
    status: failCount > 0 ? "fail" : "pass",
    taskId: input.task.id,
    mode: input.run.mode,
    passCount,
    failCount,
    grades,
  };
}

export function renderDogfoodReport(input: {
  run: DogfoodRunRecord;
  task: DogfoodTaskSpec;
  result: DogfoodComplianceResult;
}): string {
  const lines = [
    "# KRN Dogfood Report",
    "",
    "## Summary",
    "",
    `Verdict: ${input.result.status}`,
    `Pass/fail: ${input.result.passCount}/${input.result.failCount}`,
    "",
    "## Task",
    "",
    `Task ID: ${input.task.id}`,
    input.task.prompt,
    "",
    "## Mode",
    "",
    input.run.mode,
    "",
    "## Codex Availability",
    "",
    `Available: ${String(input.run.codexAvailable)}`,
    `Command: ${input.run.codexCommand ?? "none"}`,
    "",
    "## KRN Command Compliance",
    "",
    input.run.krnCommandsObserved.length === 0
      ? "- none"
      : input.run.krnCommandsObserved.map((command) => `- ${command}`).join("\n"),
    "",
    "## Artifacts",
    "",
    input.run.requiredArtifactsPresent.length === 0
      ? "- none recorded"
      : input.run.requiredArtifactsPresent.map((artifact) => `- ${artifact}`).join("\n"),
    "",
    "## Hooks",
    "",
    `hook.received events: ${input.run.hookTraceEvents}`,
    "",
    "## Verify",
    "",
    `Status: ${input.run.verifyStatus ?? "missing"}`,
    "",
    "## Handoff",
    "",
    `Present: ${String(input.run.handoffPresent)}`,
    "",
    "## Touched Files",
    "",
    input.run.touchedFiles.length === 0
      ? "- none"
      : input.run.touchedFiles.map((filePath) => `- ${filePath}`).join("\n"),
    "",
    "## Forbidden File Violations",
    "",
    input.run.forbiddenTouchedFiles.length === 0
      ? "- none"
      : input.run.forbiddenTouchedFiles.map((filePath) => `- ${filePath}`).join("\n"),
    "",
    "## Notes",
    "",
    input.run.notes.length === 0 ? "- none" : input.run.notes.map((note) => `- ${note}`).join("\n"),
    "",
    "## Verdict",
    "",
    ...input.result.grades.map((item) => `- ${item.name}: ${item.status} - ${item.detail}`),
    "",
  ];

  return lines.join("\n");
}
