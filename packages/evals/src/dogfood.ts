import { spawnSync } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import path from "node:path";

export type DogfoodMode =
  | "baseline"
  | "krn-explicit-skill"
  | "krn-implicit-skill"
  | "krn-agents-only";

export type DogfoodRunStatus = "pass" | "fail" | "skipped";
export type DogfoodHookEvidenceSource = "real-codex" | "manual-probe" | "fixture" | "unknown";

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
  minTaskIntentQuality?: "medium" | "high" | undefined;
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
  ambientKrnCommandPath?: string | null | undefined;
  krnCommandPath?: string | null | undefined;
  krnIdentity?: string | null | undefined;
  krnIdentityValid?: boolean | undefined;
  globalKrnFallbackUsed?: boolean | undefined;
  krnCommandsObserved: string[];
  hookTraceEvents: number;
  hookEvidenceSource?: DogfoodHookEvidenceSource | undefined;
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
  evidence: DogfoodEvidenceSummary;
}

export interface DogfoodEvidenceSummary {
  requiredArtifactsPresent: string[];
  missingArtifacts: string[];
  taskContractPath: string | null;
  contextPath: string | null;
  verifyResultPath: string | null;
  handoffPath: string | null;
  currentRunPath: string | null;
  tracePath: string | null;
  traceEventNames: string[];
  touchedFiles: string[];
  expectedTouchedMissing: string[];
  expectedUntouchedTouched: string[];
  forbiddenTouchedFiles: string[];
  missingCommands: string[];
  verifyStatus: string | null;
  verifyMode: string | null;
  executedCommands: number;
  handoffPresent: boolean;
  hookTraceEvents: number;
  contextStop: boolean;
  requiredDoNotUsePaths: string[];
  observedDoNotUsePaths: string[];
  missingDoNotUsePaths: string[];
  krnIdentityRequired: boolean;
  krnIdentityValid: boolean | null;
  krnIdentityProblems: string[];
  ambientKrnCommandPath: string | null;
  krnCommandPath: string | null;
  globalKrnDiffersFromPinned: boolean | null;
  globalKrnFallbackUsed: boolean;
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

interface TaskContractShape {
  intentQuality?: "low" | "medium" | "high";
  intentWarnings?: string[];
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

interface TraceEvidence {
  tracePath: string | null;
  events: TraceShape[];
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

function resolveRepoPath(repoPath: string, filePath: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(repoPath, filePath);
}

async function existingRelativePath(
  repoPath: string,
  relativePath: string,
): Promise<string | null> {
  return (await pathExists(path.join(repoPath, relativePath))) ? relativePath : null;
}

async function readTraceEvidence(repoPath: string): Promise<TraceEvidence> {
  const currentRun = await readJson<CurrentRunShape>(
    path.join(repoPath, ".krn", "current", "run.json"),
  );
  const tracePaths = [currentRun?.tracePath, path.join(".krn", "traces", "trace.jsonl")].filter(
    (tracePath): tracePath is string => Boolean(tracePath),
  );

  for (const tracePath of tracePaths) {
    try {
      const raw = await readFile(resolveRepoPath(repoPath, tracePath), "utf8");
      return {
        tracePath,
        events: raw
          .trim()
          .split("\n")
          .filter(Boolean)
          .map((line) => JSON.parse(line) as TraceShape),
      };
    } catch {
      // Try the next trace location.
    }
  }

  return { tracePath: null, events: [] };
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

function evaluateKrnIdentity(run: DogfoodRunRecord): {
  required: boolean;
  valid: boolean | null;
  problems: string[];
} {
  if (run.mode === "baseline") {
    return { required: false, valid: null, problems: [] };
  }

  const identity = run.krnIdentity ?? "";
  const problems = [
    ...(!run.krnCommandPath ? ["missing krnCommandPath"] : []),
    ...(run.globalKrnFallbackUsed === true ? ["global krn fallback was used"] : []),
    ...(!identity ? ["missing krnIdentity"] : []),
    ...(run.krnIdentityValid !== true ? ["krnIdentityValid is not true"] : []),
    ...(!identity.includes("krn-harness-cli-identity-v1")
      ? ["missing krn-harness-cli-identity-v1 marker"]
      : []),
    ...(!identity.includes("@krn-harness/cli") ? ["missing @krn-harness/cli marker"] : []),
    ...(!identity.includes("required_commands_present: true")
      ? ["missing required_commands_present: true marker"]
      : []),
  ];

  return {
    required: true,
    valid: problems.length === 0,
    problems,
  };
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
    ambientKrnCommandPath: null,
    krnCommandPath: null,
    krnIdentity: null,
    krnIdentityValid: false,
    globalKrnFallbackUsed: false,
    krnCommandsObserved: [],
    hookTraceEvents: 0,
    hookEvidenceSource: "unknown",
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
  const requiredArtifactsPresent = requiredArtifactPresence
    .filter((artifact) => artifact.exists)
    .map((artifact) => artifact.artifactPath);
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
  const taskContract = await readJson<TaskContractShape>(
    path.join(input.repoPath, ".krn", "current", "task-contract.json"),
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
  const traceEvidence = await readTraceEvidence(input.repoPath);
  const traceEvents = traceEvidence.events;
  const hookTraceEvents = traceEvents.filter((event) => event.name === "hook.received").length;
  const runTracePresent = traceEvents.length > 0;
  const traceEventNames = traceEvents.flatMap((event) => (event.name ? [event.name] : []));
  const verifyStatus = verify?.status ?? input.run.verifyStatus;
  const verifyMode = verify?.mode ?? null;
  const executedCommands = verify?.summary?.executedCommands ?? 0;
  const contextStop = context?.stop ?? false;
  const doNotUsePaths =
    context?.buckets?.doNotUse?.flatMap((item) => (item.path ? [item.path] : [])) ?? [];
  const missingDoNotUsePaths = missingValues(input.task.requiredDoNotUsePaths ?? [], doNotUsePaths);
  const missingTraceEvents = missingValues(input.task.requiredTraceEvents ?? [], traceEventNames);
  const taskIntentRank = { low: 0, medium: 1, high: 2 } as const;
  const taskIntentQuality = taskContract?.intentQuality;
  const minTaskIntentQuality = input.task.minTaskIntentQuality;
  const taskSpecHasDoNotUsePaths = (input.task.requiredDoNotUsePaths?.length ?? 0) > 0;
  const isKrnMode = input.run.mode !== "baseline";
  const krnIdentity = evaluateKrnIdentity(input.run);
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
    ...(isKrnMode
      ? [
          grade(
            "krn-cli-identity",
            krnIdentity.valid === true,
            "KRN Harness CLI identity is valid",
            `KRN Harness CLI identity invalid: ${krnIdentity.problems.join(", ")}`,
          ),
        ]
      : []),
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
    ...(minTaskIntentQuality
      ? [
          grade(
            "task-spec-do-not-use-paths",
            taskSpecHasDoNotUsePaths,
            "Task spec declares required do-not-use paths",
            "Task spec is missing requiredDoNotUsePaths for context-quality grading",
          ),
        ]
      : []),
    ...(minTaskIntentQuality
      ? [
          grade(
            "task-intent-quality",
            taskIntentQuality !== undefined &&
              taskIntentRank[taskIntentQuality] >= taskIntentRank[minTaskIntentQuality],
            `Task intent quality is at least ${minTaskIntentQuality}`,
            `Expected task intent quality at least ${minTaskIntentQuality}, got ${taskIntentQuality ?? "missing"}`,
          ),
        ]
      : []),
  ];
  const passCount = grades.filter((item) => item.status === "pass").length;
  const failCount = grades.length - passCount;
  const ambientKrnCommandPath = input.run.ambientKrnCommandPath ?? null;
  const krnCommandPath = input.run.krnCommandPath ?? null;
  const globalKrnDiffersFromPinned =
    ambientKrnCommandPath && krnCommandPath ? ambientKrnCommandPath !== krnCommandPath : null;
  const evidence: DogfoodEvidenceSummary = {
    requiredArtifactsPresent,
    missingArtifacts,
    taskContractPath: await existingRelativePath(input.repoPath, ".krn/current/task-contract.json"),
    contextPath: await existingRelativePath(input.repoPath, ".krn/current/context-package.json"),
    verifyResultPath: await existingRelativePath(input.repoPath, ".krn/current/verify-result.json"),
    handoffPath: await existingRelativePath(input.repoPath, ".krn/current/handoff.md"),
    currentRunPath: await existingRelativePath(input.repoPath, ".krn/current/run.json"),
    tracePath: traceEvidence.tracePath,
    traceEventNames,
    touchedFiles,
    expectedTouchedMissing,
    expectedUntouchedTouched,
    forbiddenTouchedFiles: forbiddenTouched,
    missingCommands,
    verifyStatus: verifyStatus ?? null,
    verifyMode,
    executedCommands,
    handoffPresent,
    hookTraceEvents,
    contextStop,
    requiredDoNotUsePaths: input.task.requiredDoNotUsePaths ?? [],
    observedDoNotUsePaths: doNotUsePaths,
    missingDoNotUsePaths,
    krnIdentityRequired: krnIdentity.required,
    krnIdentityValid: krnIdentity.valid,
    krnIdentityProblems: krnIdentity.problems,
    ambientKrnCommandPath,
    krnCommandPath,
    globalKrnDiffersFromPinned,
    globalKrnFallbackUsed: input.run.globalKrnFallbackUsed === true,
  };

  return {
    status: failCount > 0 ? "fail" : "pass",
    taskId: input.task.id,
    mode: input.run.mode,
    passCount,
    failCount,
    grades,
    evidence,
  };
}

function markdownList(items: string[]): string {
  return items.length === 0 ? "- none" : items.map((item) => `- ${item}`).join("\n");
}

function markdownValue(value: string | null | undefined): string {
  return value && value.length > 0 ? value : "none";
}

function runValidity(input: { run: DogfoodRunRecord; evidence: DogfoodEvidenceSummary }): {
  status: "valid" | "invalid" | "not-required" | "skipped";
  reasons: string[];
} {
  if (input.run.status === "skipped") {
    return { status: "skipped", reasons: input.run.notes };
  }

  if (!input.evidence.krnIdentityRequired) {
    return { status: "not-required", reasons: [] };
  }

  if (input.evidence.krnIdentityValid === true) {
    return { status: "valid", reasons: [] };
  }

  return {
    status: "invalid",
    reasons: input.evidence.krnIdentityProblems,
  };
}

function hookStatus(input: { run: DogfoodRunRecord; evidence: DogfoodEvidenceSummary }): string {
  if (input.evidence.hookTraceEvents === 0) {
    return "unproven: no hook.received events recorded";
  }

  if (input.run.hookEvidenceSource === "real-codex") {
    return "observed: real Codex hook.received event recorded; enforcement is still not claimed";
  }

  return `unproven: ${input.evidence.hookTraceEvents} hook.received event(s) recorded, but real non-bypass Codex provenance is not recorded`;
}

export function renderDogfoodReport(input: {
  run: DogfoodRunRecord;
  task: DogfoodTaskSpec;
  result: DogfoodComplianceResult;
}): string {
  const evidence = input.result.evidence;
  const validity = runValidity({ run: input.run, evidence });
  const lines = [
    "# KRN Dogfood Report",
    "",
    "## Summary",
    "",
    `Verdict: ${input.result.status}`,
    `Pass/fail: ${input.result.passCount}/${input.result.failCount}`,
    `Run validity: ${validity.status}`,
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
    "## Run Validity",
    "",
    `Status: ${validity.status}`,
    `Reasons: ${validity.reasons.length === 0 ? "none" : validity.reasons.join("; ")}`,
    "",
    "## KRN Command Compliance",
    "",
    input.run.krnCommandsObserved.length === 0
      ? "- none"
      : input.run.krnCommandsObserved.map((command) => `- ${command}`).join("\n"),
    "",
    "## KRN CLI Identity",
    "",
    `Command path: ${markdownValue(evidence.krnCommandPath)}`,
    `Ambient krn: ${markdownValue(evidence.ambientKrnCommandPath)}`,
    `Global differs from pinned: ${String(evidence.globalKrnDiffersFromPinned ?? "unknown")}`,
    `Global fallback used: ${String(evidence.globalKrnFallbackUsed)}`,
    `Valid: ${String(evidence.krnIdentityValid ?? "not-required")}`,
    `Problems: ${evidence.krnIdentityProblems.length === 0 ? "none" : evidence.krnIdentityProblems.join("; ")}`,
    input.run.krnIdentity ? input.run.krnIdentity : "Identity: none",
    "",
    "## Evidence Artifacts",
    "",
    "Required artifacts present:",
    markdownList(evidence.requiredArtifactsPresent),
    "Missing required artifacts:",
    markdownList(evidence.missingArtifacts),
    `Trace path: ${markdownValue(evidence.tracePath)}`,
    `Verify result path: ${markdownValue(evidence.verifyResultPath)}`,
    `Handoff path: ${markdownValue(evidence.handoffPath)}`,
    `Context path: ${markdownValue(evidence.contextPath)}`,
    `Task contract path: ${markdownValue(evidence.taskContractPath)}`,
    `Current run path: ${markdownValue(evidence.currentRunPath)}`,
    "",
    "## Context Quality",
    "",
    `STOP: ${String(evidence.contextStop)}`,
    "Required do-not-use paths:",
    markdownList(evidence.requiredDoNotUsePaths),
    "Observed do-not-use paths:",
    markdownList(evidence.observedDoNotUsePaths),
    "Missing do-not-use paths:",
    markdownList(evidence.missingDoNotUsePaths),
    "",
    "## Hook Status",
    "",
    `hook.received events: ${evidence.hookTraceEvents}`,
    `Status: ${hookStatus({ run: input.run, evidence })}`,
    "",
    "## Verify",
    "",
    `Status: ${evidence.verifyStatus ?? "missing"}`,
    `Mode: ${evidence.verifyMode ?? "missing"}`,
    `Executed commands: ${evidence.executedCommands}`,
    "",
    "## Handoff",
    "",
    `Present: ${String(evidence.handoffPresent)}`,
    "",
    "## Touched Files",
    "",
    markdownList(evidence.touchedFiles),
    "",
    "## Forbidden File Safety",
    "",
    "Forbidden touched files:",
    markdownList(evidence.forbiddenTouchedFiles),
    "Expected untouched violations:",
    markdownList(evidence.expectedUntouchedTouched),
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
