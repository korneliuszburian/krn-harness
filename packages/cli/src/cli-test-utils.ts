import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { expect } from "vitest";
import { runCli } from "./index.js";

export async function runInTemp(args: string[]) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
  const result = await runInCwd(cwd, args);

  return { cwd, ...result };
}

export async function copyFixtureRepo(name: string): Promise<string> {
  const parent = await mkdtemp(path.join(os.tmpdir(), "krn-harness-fixture-"));
  const cwd = path.join(parent, name);
  await cp(path.join(process.cwd(), "fixtures", "repos", name), cwd, { recursive: true });
  await rm(path.join(cwd, ".krn"), { force: true, recursive: true });
  return cwd;
}

export async function runInCwd(cwd: string, args: string[], input: { stdin?: string } = {}) {
  let stdout = "";
  let stderr = "";
  const runtime = {
    cwd,
    stdout: (text: string) => {
      stdout += text;
    },
    stderr: (text: string) => {
      stderr += text;
    },
    now: () => new Date("2026-06-03T00:00:00.000Z"),
  };

  const code = await runCli(
    args,
    input.stdin === undefined
      ? runtime
      : {
          ...runtime,
          stdin: async () => input.stdin ?? "",
        },
  );

  return { stdout, stderr, code };
}

export interface TraceEventFixture {
  name: string;
  taskId?: string;
  data?: Record<string, unknown>;
}

export const supportedP0CodexHookEvents = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "Stop",
];

export async function readTraceEvents(cwd: string): Promise<TraceEventFixture[]> {
  const raw = await readFile(path.join(cwd, ".krn", "traces", "trace.jsonl"), "utf8");
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TraceEventFixture);
}

export async function readRunTraceEvents(
  cwd: string,
  taskId: string,
): Promise<TraceEventFixture[]> {
  const raw = await readFile(path.join(cwd, ".krn", "runs", taskId, "trace.jsonl"), "utf8");
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TraceEventFixture);
}

export async function readJson<T>(cwd: string, relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(cwd, relativePath), "utf8")) as T;
}

export async function expectDirectory(cwd: string, relativePath: string): Promise<void> {
  await expect(stat(path.join(cwd, relativePath))).resolves.toMatchObject({
    isDirectory: expect.any(Function),
  });
  expect((await stat(path.join(cwd, relativePath))).isDirectory()).toBe(true);
}

export async function expectFile(cwd: string, relativePath: string): Promise<void> {
  await expect(stat(path.join(cwd, relativePath))).resolves.toMatchObject({
    isFile: expect.any(Function),
  });
  expect((await stat(path.join(cwd, relativePath))).isFile()).toBe(true);
}

export interface RealRepoPreflightSummary {
  schema: string;
  eligible: boolean;
  isGitRepo: boolean;
  dirtyWorktree: boolean;
  krnConfigExists: boolean;
  verifyProfileStatus: string;
  safeVerifyCommands: string[];
  unsafeVerifyCommands: string[];
  blockers: string[];
  warnings: string[];
  requiredOperatorDecisions: string[];
  pinnedKrnPath: string | null;
  krnIdentityValid: boolean;
  summaryJsonPath: string | null;
  summaryMarkdownPath: string | null;
  wouldInstall: string[];
}

export interface RealRepoDogfoodSummary {
  schema: string;
  runId: string;
  status: "skipped" | "blocked" | "readiness";
  outcomeKind: string;
  reason: string;
  validationClaim: string;
  repoPath: string | null;
  missingEnv: string[];
  missingEnvInstructions: string[];
  dogfoodApproved: boolean;
  codexApproved: boolean;
  preflightEligible: boolean | null;
  blockers: string[];
  warnings: string[];
  requiredOperatorDecisions: string[];
  pinnedKrnPath: string | null;
  krnIdentityValid: boolean;
  verifyProfileStatus: string | null;
  safeVerifyCommands: string[];
  summaryJsonPath: string;
  summaryMarkdownPath: string;
}

export interface RealRepoExecutionResultSummary {
  schema: string;
  runId: string;
  status: string;
  executionKind: string;
  targetRepoPath: string | null;
  executionWorktreePath: string | null;
  targetRepoCleanBefore: boolean;
  targetRepoCleanAfter: boolean;
  validationStatus: string;
  changedFiles: string[];
  forbiddenTouchedFiles: string[];
  committedTargetRepo: boolean;
  pushedTargetRepo: boolean;
  hookTrustStatus: string;
  productionProof: boolean;
  summaryJsonPath: string;
  summaryMarkdownPath: string;
}

export interface ReviewResultFixture {
  schema: string;
  status: string;
  reviewers: Array<{
    reviewer: string;
    reviewerId: string;
    status: string;
    summary: string;
    evidence: string[];
    findings: string[];
  }>;
  records: Array<{
    reviewer: string;
    status: string;
    findings: string[];
  }>;
  blockers: string[];
  warnings: string[];
  nextActions: string[];
}

export interface OperatorSummaryFixture {
  schema: string;
  status: string;
  currentTask: { status: string; id?: string };
  verify: { status: string; mode?: string; executedCommands?: number };
  hooks: {
    status: string;
    hookReceivedCount: number;
    hookTrustStatus?: string;
    summary: string;
  };
  realRepoDogfood: {
    status: string;
    summary?: string;
    latestPath?: string;
    repoPath?: string | null;
    executionWorktreePath?: string | null;
    outcomeKind?: string;
    executionKind?: string;
    validationStatus?: string;
    productionProof?: boolean;
    hookTrustStatus?: string;
    missingEnv?: string[];
  };
  reviewers: { status: string; total?: number };
  blockers: string[];
  warnings: string[];
  nextActions: string[];
}

export interface ArtifactsListFixture {
  schema: string;
  scope: string;
  artifacts: Array<{ path: string; scope: string; reason: string }>;
}

export interface ArchivePlanFixture {
  schema: string;
  dryRun: boolean;
  confirm: boolean;
  archiveDir: string;
  candidates: Array<{ path: string; scope: string; archivePath: string }>;
  refused: Array<{ path: string; reason: string }>;
}

export interface OperatorReportFixture {
  schema: string;
  verdict: string;
  task: { text?: string; classification?: string };
  realRepoEvidence: { status: string; staleHistoricalBlocker: boolean };
  hookTrust: { status: string };
  productionProof: { value: boolean; summary: string };
  blockers: string[];
  warnings: string[];
  historicalCaveats: Array<{ path: string; scope: string }>;
}

export interface ReleaseCheckFixture {
  schema: string;
  status: string;
  checks: Array<{ id: string; status: string; summary: string }>;
  blockers: string[];
  warnings: string[];
  nextActions: string[];
}

export interface RunResultFixture {
  schema: string;
  status: string;
  coreStatus: string;
  dryRun: boolean;
  executeVerify: boolean;
  taskText?: string;
  taskSpecPath?: string;
  steps: {
    start: { status: string; summary: string };
    graph: { status: string; summary: string };
    context: { status: string; summary: string };
    verify: { status: string; summary: string };
    handoff: { status: string; summary: string };
    review: { status: string; summary: string };
    summary: { status: string; summary: string };
    report: { status: string; summary: string };
    releaseCheck?: { status: string; summary: string };
  };
  context: { stop: boolean };
  verify: {
    mode?: string;
    status?: string;
    executedCommands?: number;
    totalCommands?: number;
    profileName?: string;
  };
  proof: {
    productionProof: boolean;
    hookTrustStatus: string;
    fixture: string;
    config: string;
    productCode: string;
    notes: string[];
  };
  supportingProjection: {
    reportVerdict?: string;
    reportStepStatus: string;
    releaseCheckStatus?: string;
    releaseCheckStepStatus?: string;
    releaseCheckBlocking: boolean;
    nonBlockingReleaseCheckFailure: boolean;
  };
  blockers: string[];
  warnings: string[];
  nextActions: string[];
  artifacts: Record<string, string>;
}

export interface RunBundleManifestFixture {
  schema: string;
  runStatus: string;
  productionProof: boolean;
  hookTrustStatus: string;
  files: Array<{ path: string; present: boolean; required: boolean }>;
}

export function parseRealRepoPreflightSummary(stdout: string): RealRepoPreflightSummary {
  const start = stdout.indexOf("{\n");
  const end = stdout.indexOf("\n--- markdown ---", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return JSON.parse(stdout.slice(start, end)) as RealRepoPreflightSummary;
}

export function parseRealRepoDogfoodSummary(stdout: string): RealRepoDogfoodSummary {
  const start = stdout.indexOf("{\n");
  const end = stdout.indexOf("\n--- markdown ---", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return JSON.parse(stdout.slice(start, end)) as RealRepoDogfoodSummary;
}

export function parseRealRepoExecutionResultSummary(
  stdout: string,
): RealRepoExecutionResultSummary {
  const start = stdout.indexOf("{\n");
  const end = stdout.indexOf("\n--- markdown ---", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return JSON.parse(stdout.slice(start, end)) as RealRepoExecutionResultSummary;
}

export async function createGitRepoForPreflight(
  input: { config?: unknown; dirty?: boolean } = {},
): Promise<string> {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-real-preflight-test-"));
  await writeFile(path.join(cwd, "README.md"), "# Fixture\n", "utf8");

  if (input.config) {
    await writeFile(
      path.join(cwd, "krn.config.json"),
      `${JSON.stringify(input.config, null, 2)}\n`,
      "utf8",
    );
  }

  spawnSync("git", ["init", "-q"], { cwd, encoding: "utf8" });
  spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });
  spawnSync(
    "git",
    [
      "-c",
      "user.email=krn@example.invalid",
      "-c",
      "user.name=KRN Test",
      "commit",
      "-q",
      "-m",
      "fixture baseline",
    ],
    {
      cwd,
      encoding: "utf8",
    },
  );

  if (input.dirty) {
    await writeFile(path.join(cwd, "dirty.txt"), "dirty\n", "utf8");
  }

  return cwd;
}

export async function writeReleaseCheckFixtureFiles(cwd: string): Promise<void> {
  const files = [
    "packages/cli/src/commands/run.ts",
    "packages/cli/src/commands/report.ts",
    "packages/cli/src/commands/artifacts.ts",
    "packages/cli/src/commands/uninstall.ts",
    "packages/cli/src/commands/config.ts",
    "docs/specs/install-result.schema.md",
    "docs/specs/uninstall-result.schema.md",
    "docs/specs/config-doctor.schema.md",
    "docs/specs/run-result.schema.md",
    "docs/specs/operator-report.schema.md",
    "docs/specs/release-check.schema.md",
    "docs/product/evidence-matrix.md",
    "docs/product/mvp-state.md",
    ".github/workflows/verify.yml",
    "packages/verify/src/command-policy.ts",
  ];

  await writeFile(
    path.join(cwd, "package.json"),
    JSON.stringify({
      scripts: {
        lint: "biome check .",
        typecheck: "tsc --noEmit",
        test: "vitest",
        "verify:local": "pnpm lint && pnpm typecheck && pnpm test",
      },
    }),
    "utf8",
  );

  for (const relativePath of files) {
    await mkdir(path.dirname(path.join(cwd, relativePath)), { recursive: true });
    await writeFile(path.join(cwd, relativePath), `${relativePath}\n`, "utf8");
  }
}

export function runRealRepoPreflight(repoPath: string, env: Record<string, string> = {}) {
  const result = spawnSync(
    path.join(process.cwd(), "scripts/krn-real-repo-preflight.sh"),
    [repoPath],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      env: {
        ...process.env,
        ...env,
      },
    },
  );

  return {
    result,
    summary: parseRealRepoPreflightSummary(result.stdout),
  };
}

export function runRealRepoDogfood(env: Record<string, string> = {}) {
  const result = spawnSync(path.join(process.cwd(), "scripts/krn-real-repo-dogfood.sh"), {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });

  return {
    result,
    summary: parseRealRepoDogfoodSummary(result.stdout),
  };
}

export function runRealRepoExecutionReport(env: Record<string, string> = {}) {
  const result = spawnSync(path.join(process.cwd(), "scripts/krn-real-repo-execution-report.sh"), {
    cwd: process.cwd(),
    encoding: "utf8",
    env: {
      ...process.env,
      ...env,
    },
  });

  return {
    result,
    summary: parseRealRepoExecutionResultSummary(result.stdout),
  };
}
