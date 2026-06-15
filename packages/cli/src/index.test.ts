import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { artifactPathIsArchiveSafe } from "./artifact-scope.js";
import { parseGitStatusPath } from "./commands/handoff.js";
import { runCli } from "./index.js";

async function runInTemp(args: string[]) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
  const result = await runInCwd(cwd, args);

  return { cwd, ...result };
}

async function copyFixtureRepo(name: string): Promise<string> {
  const parent = await mkdtemp(path.join(os.tmpdir(), "krn-harness-fixture-"));
  const cwd = path.join(parent, name);
  await cp(path.join(process.cwd(), "fixtures", "repos", name), cwd, { recursive: true });
  await rm(path.join(cwd, ".krn"), { force: true, recursive: true });
  return cwd;
}

async function runInCwd(cwd: string, args: string[], input: { stdin?: string } = {}) {
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

interface TraceEventFixture {
  name: string;
  taskId?: string;
  data?: Record<string, unknown>;
}

const supportedP0CodexHookEvents = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "Stop",
];

async function readTraceEvents(cwd: string): Promise<TraceEventFixture[]> {
  const raw = await readFile(path.join(cwd, ".krn", "traces", "trace.jsonl"), "utf8");
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TraceEventFixture);
}

async function readRunTraceEvents(cwd: string, taskId: string): Promise<TraceEventFixture[]> {
  const raw = await readFile(path.join(cwd, ".krn", "runs", taskId, "trace.jsonl"), "utf8");
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TraceEventFixture);
}

async function readJson<T>(cwd: string, relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(cwd, relativePath), "utf8")) as T;
}

async function expectDirectory(cwd: string, relativePath: string): Promise<void> {
  await expect(stat(path.join(cwd, relativePath))).resolves.toMatchObject({
    isDirectory: expect.any(Function),
  });
  expect((await stat(path.join(cwd, relativePath))).isDirectory()).toBe(true);
}

async function expectFile(cwd: string, relativePath: string): Promise<void> {
  await expect(stat(path.join(cwd, relativePath))).resolves.toMatchObject({
    isFile: expect.any(Function),
  });
  expect((await stat(path.join(cwd, relativePath))).isFile()).toBe(true);
}

interface RealRepoPreflightSummary {
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

interface RealRepoDogfoodSummary {
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

interface RealRepoExecutionResultSummary {
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

interface ReviewResultFixture {
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
}

interface OperatorSummaryFixture {
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

interface ArtifactsListFixture {
  schema: string;
  scope: string;
  artifacts: Array<{ path: string; scope: string; reason: string }>;
}

interface ArchivePlanFixture {
  schema: string;
  dryRun: boolean;
  confirm: boolean;
  archiveDir: string;
  candidates: Array<{ path: string; scope: string; archivePath: string }>;
  refused: Array<{ path: string; reason: string }>;
}

interface OperatorReportFixture {
  schema: string;
  verdict: string;
  task: { text?: string };
  realRepoEvidence: { status: string; staleHistoricalBlocker: boolean };
  hookTrust: { status: string };
  productionProof: { value: boolean; summary: string };
  blockers: string[];
  warnings: string[];
  historicalCaveats: Array<{ path: string; scope: string }>;
}

interface ReleaseCheckFixture {
  schema: string;
  status: string;
  checks: Array<{ id: string; status: string; summary: string }>;
  blockers: string[];
  warnings: string[];
  nextActions: string[];
}

function parseRealRepoPreflightSummary(stdout: string): RealRepoPreflightSummary {
  const start = stdout.indexOf("{\n");
  const end = stdout.indexOf("\n--- markdown ---", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return JSON.parse(stdout.slice(start, end)) as RealRepoPreflightSummary;
}

function parseRealRepoDogfoodSummary(stdout: string): RealRepoDogfoodSummary {
  const start = stdout.indexOf("{\n");
  const end = stdout.indexOf("\n--- markdown ---", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return JSON.parse(stdout.slice(start, end)) as RealRepoDogfoodSummary;
}

function parseRealRepoExecutionResultSummary(stdout: string): RealRepoExecutionResultSummary {
  const start = stdout.indexOf("{\n");
  const end = stdout.indexOf("\n--- markdown ---", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);

  return JSON.parse(stdout.slice(start, end)) as RealRepoExecutionResultSummary;
}

async function createGitRepoForPreflight(
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

function runRealRepoPreflight(repoPath: string, env: Record<string, string> = {}) {
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

function runRealRepoDogfood(env: Record<string, string> = {}) {
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

function runRealRepoExecutionReport(env: Record<string, string> = {}) {
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

describe("krn CLI", () => {
  it("parses git status paths for handoff changed files", () => {
    expect(parseGitStatusPath(" M packages/cli/src/commands/handoff.ts")).toBe(
      "packages/cli/src/commands/handoff.ts",
    );
    expect(parseGitStatusPath("?? docs/specs/handoff.md")).toBe("docs/specs/handoff.md");
    expect(parseGitStatusPath("R  old/path.ts -> new/path.ts")).toBe("new/path.ts");
  });

  it("prints help", async () => {
    const result = await runInTemp(["--help"]);

    expect(result.code).toBe(0);
    for (const command of [
      "krn status",
      'krn start "<task>"',
      "krn graph",
      "krn context",
      "krn verify [--profile <name>] [--execute]",
      "krn handoff",
      "krn doctor",
      "krn doctor cli",
      "krn eval",
      "krn install",
      "krn install --dry-run",
      "krn uninstall --dry-run",
      "krn config <command>",
      "krn summary",
      "krn review",
      "krn report",
      "krn release-check",
      "krn artifacts <command>",
      "krn memory <command>",
      "krn hook codex <event>",
    ]) {
      expect(result.stdout).toContain(command);
    }
  });

  it("lists current and historical runtime artifacts by scope", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await mkdir(path.join(cwd, ".krn", "dogfood", "real-repo-skipped", "test-source-checkout"), {
      recursive: true,
    });
    await writeFile(
      path.join(cwd, ".krn", "current", "operator-summary.json"),
      JSON.stringify({ schema: "krn-operator-summary-v1" }),
      "utf8",
    );
    await writeFile(
      path.join(
        cwd,
        ".krn",
        "dogfood",
        "real-repo-skipped",
        "test-source-checkout",
        "summary.json",
      ),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "blocked" }),
      "utf8",
    );

    const all = await runInCwd(cwd, ["artifacts", "list", "--json", "--scope", "all"]);
    const current = await runInCwd(cwd, ["artifacts", "list", "--json", "--scope", "current"]);
    const historical = await runInCwd(cwd, [
      "artifacts",
      "list",
      "--json",
      "--scope",
      "historical",
    ]);

    expect(all.code).toBe(0);
    expect(current.code).toBe(0);
    expect(historical.code).toBe(0);
    expect((JSON.parse(all.stdout) as ArtifactsListFixture).artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ".krn/current/operator-summary.json",
          scope: "current",
        }),
        expect.objectContaining({
          path: ".krn/dogfood/real-repo-skipped/test-source-checkout/summary.json",
          scope: "stale-blocking",
        }),
      ]),
    );
    expect((JSON.parse(current.stdout) as ArtifactsListFixture).artifacts).toEqual([
      expect.objectContaining({ path: ".krn/current/operator-summary.json", scope: "current" }),
    ]);
    expect((JSON.parse(historical.stdout) as ArtifactsListFixture).artifacts).toEqual([
      expect.objectContaining({
        path: ".krn/dogfood/real-repo-skipped/test-source-checkout/summary.json",
        scope: "stale-blocking",
      }),
    ]);
  });

  it("archives historical artifacts only when confirmed", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const historicalPath = ".krn/dogfood/real-repo-skipped/test-missing-env/summary.json";
    await mkdir(path.dirname(path.join(cwd, historicalPath)), { recursive: true });
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, historicalPath),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "skipped" }),
      "utf8",
    );
    await writeFile(path.join(cwd, ".krn", "current", "operator-summary.json"), "{}", "utf8");

    const dryRun = await runInCwd(cwd, ["artifacts", "archive", "--dry-run", "--json"]);
    const dryRunPlan = JSON.parse(dryRun.stdout) as ArchivePlanFixture;
    expect(dryRun.code).toBe(0);
    expect(dryRunPlan.dryRun).toBe(true);
    expect(dryRunPlan.candidates).toEqual([
      expect.objectContaining({ path: historicalPath, scope: "stale-blocking" }),
    ]);
    await expectFile(cwd, historicalPath);

    const confirmed = await runInCwd(cwd, ["artifacts", "archive", "--confirm", "--json"]);
    const confirmedPlan = JSON.parse(confirmed.stdout) as ArchivePlanFixture;
    expect(confirmed.code).toBe(0);
    expect(confirmedPlan.confirm).toBe(true);
    const archivedPath = confirmedPlan.candidates[0]?.archivePath;
    expect(archivedPath).toBeDefined();
    await expect(stat(path.join(cwd, historicalPath))).rejects.toThrow();
    await expectFile(cwd, archivedPath ?? "");
    await expectFile(cwd, ".krn/current/operator-summary.json");
  });

  it("refuses unsafe artifact archive candidates", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const unsafePath = ".krn/dogfood/secret-run/summary.json";
    await mkdir(path.dirname(path.join(cwd, unsafePath)), { recursive: true });
    await writeFile(
      path.join(cwd, unsafePath),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "skipped" }),
      "utf8",
    );

    const result = await runInCwd(cwd, ["artifacts", "archive", "--dry-run", "--json"]);
    const plan = JSON.parse(result.stdout) as ArchivePlanFixture;
    expect(result.code).toBe(0);
    expect(plan.candidates).toEqual([]);
    expect(plan.refused).toEqual([
      expect.objectContaining({ path: unsafePath, reason: expect.stringContaining("not safe") }),
    ]);
    expect(artifactPathIsArchiveSafe("../outside.json")).toBe(false);
  });

  it("prints operator report JSON without requiring existing current state", async () => {
    const result = await runInTemp(["report", "--json"]);
    const report = JSON.parse(result.stdout) as OperatorReportFixture;

    expect(result.code).toBe(0);
    expect(report.schema).toBe("krn-operator-report-v1");
    expect(report.verdict).toBe("warn");
    expect(report.productionProof).toMatchObject({
      value: false,
      summary: expect.stringContaining("production proof remains false"),
    });
    expect(report.hookTrust.status).toBe("unproven");
  });

  it("writes markdown, JSON, and static HTML operator reports", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await runInCwd(cwd, ["start", "Review <script>alert(1)</script> report output"]);

    const result = await runInCwd(cwd, ["report", "--write"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(".krn/current/operator-report.md");
    expect(result.stdout).toContain(".krn/current/operator-report.json");
    expect(result.stdout).toContain(".krn/current/operator-report.html");

    const report = await readJson<OperatorReportFixture>(cwd, ".krn/current/operator-report.json");
    const markdown = await readFile(
      path.join(cwd, ".krn", "current", "operator-report.md"),
      "utf8",
    );
    const html = await readFile(path.join(cwd, ".krn", "current", "operator-report.html"), "utf8");

    expect(report.schema).toBe("krn-operator-report-v1");
    expect(markdown).toContain("# KRN Operator Report");
    expect(markdown).toContain("Production proof: false");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Local file only");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("writes a local static report bundle with a manifest", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await runInCwd(cwd, ["start", "Bundle report artifacts for operator handoff"]);
    await runInCwd(cwd, ["summary", "--write"]);
    await runInCwd(cwd, ["config", "doctor"]);

    const result = await runInCwd(cwd, ["report", "--bundle"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("bundle: .krn/current/report-bundle/manifest.json");

    const manifest = await readJson<{
      schema: string;
      productionProof: boolean;
      files: Array<{ path: string; present: boolean; required: boolean }>;
    }>(cwd, ".krn/current/report-bundle/manifest.json");
    const bundleHtml = await readFile(
      path.join(cwd, ".krn", "current", "report-bundle", "operator-report.html"),
      "utf8",
    );

    expect(manifest.schema).toBe("krn-report-bundle-manifest-v1");
    expect(manifest.productionProof).toBe(false);
    expect(manifest.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "operator-report.md", present: true, required: true }),
        expect.objectContaining({ path: "operator-report.html", present: true, required: true }),
        expect.objectContaining({ path: "operator-summary.json", present: true, required: true }),
        expect.objectContaining({ path: "config-doctor.json", present: true }),
        expect.objectContaining({ path: "verify-result.json", present: false }),
      ]),
    );
    expect(bundleHtml).toContain("Local file only");
    expect(bundleHtml).not.toMatch(/https?:\/\//);
  });

  it("keeps stale source dogfood blockers as report caveats", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const stalePath = ".krn/dogfood/real-repo-skipped/test-source-checkout/summary.json";
    await mkdir(path.dirname(path.join(cwd, stalePath)), { recursive: true });
    await writeFile(
      path.join(cwd, stalePath),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "blocked" }),
      "utf8",
    );

    const summary = await runInCwd(cwd, ["summary", "--write"]);
    expect(summary.code).toBe(0);
    expect(summary.stdout).toContain("KRN summary: warn");

    const operatorSummary = await readJson<OperatorSummaryFixture>(
      cwd,
      ".krn/current/operator-summary.json",
    );
    expect(operatorSummary.realRepoDogfood).toMatchObject({
      status: "warn",
      latestPath: stalePath,
    });
    expect(operatorSummary.realRepoDogfood.summary).toContain("stale source-local test caveat");

    const result = await runInCwd(cwd, ["report", "--json"]);
    const report = JSON.parse(result.stdout) as OperatorReportFixture;
    expect(result.code).toBe(0);
    expect(report.verdict).toBe("warn");
    expect(report.realRepoEvidence).toMatchObject({
      status: "warn",
      staleHistoricalBlocker: false,
    });
    expect(report.blockers).not.toEqual(
      expect.arrayContaining([expect.stringContaining("realRepoDogfood")]),
    );
    expect(report.historicalCaveats).toEqual([
      expect.objectContaining({ path: stalePath, scope: "stale-blocking" }),
    ]);
  });

  it("runs a local release readiness check and writes artifacts", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const files = [
      "packages/cli/src/commands/report.ts",
      "packages/cli/src/commands/artifacts.ts",
      "packages/cli/src/commands/uninstall.ts",
      "packages/cli/src/commands/config.ts",
      "docs/specs/install-result.schema.md",
      "docs/specs/uninstall-result.schema.md",
      "docs/specs/config-doctor.schema.md",
      "docs/specs/operator-report.schema.md",
      "docs/specs/release-check.schema.md",
      "docs/product/evidence-matrix.md",
      "docs/product/mvp-state.md",
      ".github/workflows/verify.yml",
      "packages/verify/src/command-policy.ts",
      ".krn/current/operator-report.md",
      ".krn/current/operator-report.json",
      ".krn/current/operator-report.html",
      ".krn/current/report-bundle/manifest.json",
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

    const result = await runInCwd(cwd, ["release-check", "--json", "--write"]);
    const releaseCheck = JSON.parse(result.stdout) as ReleaseCheckFixture;

    expect(result.code).toBe(0);
    expect(releaseCheck.schema).toBe("krn-release-check-v1");
    expect(releaseCheck.status).toBe("pass");
    expect(releaseCheck.blockers).toEqual([]);
    expect(releaseCheck.nextActions).toEqual([]);
    expect(releaseCheck.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "package-scripts", status: "pass" }),
        expect.objectContaining({ id: "uninstall-command", status: "pass" }),
        expect.objectContaining({ id: "config-command", status: "pass" }),
        expect.objectContaining({ id: "release-check-schema", status: "pass" }),
        expect.objectContaining({ id: "ci-workflow", status: "pass" }),
        expect.objectContaining({ id: "operator-report-artifacts", status: "pass" }),
        expect.objectContaining({ id: "operator-report-bundle", status: "pass" }),
      ]),
    );
    await expectFile(cwd, ".krn/current/release-check.json");
    await expectFile(cwd, ".krn/current/release-check.md");
  });

  it("fails release readiness when required local contracts are missing", async () => {
    const result = await runInTemp(["release-check", "--json"]);
    const releaseCheck = JSON.parse(result.stdout) as ReleaseCheckFixture;

    expect(result.code).toBe(1);
    expect(releaseCheck.status).toBe("fail");
    expect(releaseCheck.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("package-scripts"),
        expect.stringContaining("mvp-state"),
        expect.stringContaining("ci-workflow"),
      ]),
    );
    expect(releaseCheck.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("operator-report-artifacts"),
        expect.stringContaining("operator-report-bundle"),
      ]),
    );
  });

  it("keeps the local CLI bin entrypoint linkable for dogfood", async () => {
    const packageJson = await readJson<{
      bin: { krn: string };
    }>(process.cwd(), "packages/cli/package.json");
    const bin = await readFile(path.join(process.cwd(), "packages/cli/src/bin.js"), "utf8");

    expect(packageJson.bin.krn).toBe("./src/bin.js");
    expect(bin.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(bin).toContain("node_modules/tsx/dist/esm/index.mjs");
    expect(bin).toContain("cwd: process.cwd()");
    expect(bin).toContain("KRN_HARNESS_BIN_WRAPPER");
    expect(bin).toContain("KRN_HARNESS_SOURCE_ROOT");
  });

  it("prints KRN CLI identity without writing runtime artifacts", async () => {
    const result = await runInTemp(["doctor", "cli"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN Harness CLI identity");
    expect(result.stdout).toContain("schema: krn-harness-cli-identity-v1");
    expect(result.stdout).toContain("package: @krn-harness/cli");
    expect(result.stdout).toContain(
      "supported_commands: status,start,graph,context,verify,handoff,doctor,eval,install,uninstall,config,summary,review,report,release-check,artifacts,memory,hook",
    );
    expect(result.stdout).toContain("required_commands_present: true");
    expect(result.stdout).toContain(`runtime_cwd: ${result.cwd}`);
    await expect(stat(path.join(result.cwd, ".krn"))).rejects.toThrow();
  });

  it("runs the local CLI bin wrapper from a downstream cwd", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");
    const binPath = path.join(process.cwd(), "packages/cli/src/bin.js");
    const result = spawnSync(process.execPath, [binPath, "install"], {
      cwd,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("KRN install: installed");
    await expectFile(cwd, "AGENTS.md");
    await expectFile(cwd, ".codex/hooks.json");
    await expectFile(cwd, ".agents/skills/krn-harness/SKILL.md");
  });

  it("generates a pinned local shim that preserves downstream cwd", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");
    const binDir = await mkdtemp(path.join(os.tmpdir(), "krn-harness-bin-"));
    const shimResult = spawnSync(path.join(process.cwd(), "scripts/krn-local-shim.sh"), [binDir], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(shimResult.status).toBe(0);
    const shimPath = shimResult.stdout.trim();
    const identity = spawnSync(shimPath, ["doctor", "cli"], {
      cwd,
      encoding: "utf8",
    });

    expect(identity.status).toBe(0);
    expect(identity.stdout).toContain("schema: krn-harness-cli-identity-v1");
    expect(identity.stdout).toContain(`command_path: ${shimPath}`);
    expect(identity.stdout).toContain(`bin_wrapper_path: ${shimPath}`);
    expect(identity.stdout).toContain(`source_root_path: ${process.cwd()}`);
    expect(identity.stdout).toContain(`runtime_cwd: ${cwd}`);

    const install = spawnSync(shimPath, ["install"], {
      cwd,
      encoding: "utf8",
    });

    expect(install.status).toBe(0);
    expect(install.stdout).toContain("KRN install: installed");
    await expectFile(cwd, "AGENTS.md");
    await expectFile(cwd, ".krn/traces/trace.jsonl");
  }, 10_000);

  it("runs dogfood preflight through a pinned shim without source checkout mutation", () => {
    const result = spawnSync(path.join(process.cwd(), "scripts/krn-dogfood-preflight.sh"), {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("KRN dogfood preflight: pass");
    expect(result.stdout).toContain("schema: krn-harness-cli-identity-v1");
    expect(result.stdout).toContain("required_commands_present: true");
  }, 30_000);

  it("rejects the KRN source checkout as a real-repo preflight target", () => {
    const { result, summary } = runRealRepoPreflight(process.cwd());

    expect(result.status).toBe(1);
    expect(summary.eligible).toBe(false);
    expect(summary.blockers).toContain("repo_path_is_krn_source_checkout");
    expect(summary.pinnedKrnPath).toBeNull();
    expect(summary.summaryJsonPath).toBeNull();
  });

  it("warns on dirty real-repo preflight worktrees and missing config", async () => {
    const repo = await createGitRepoForPreflight({ dirty: true });
    const { result, summary } = runRealRepoPreflight(repo, {
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-dirty"),
    });

    expect(result.status).toBe(0);
    expect(summary.eligible).toBe(true);
    expect(summary.dirtyWorktree).toBe(true);
    expect(summary.krnConfigExists).toBe(false);
    expect(summary.verifyProfileStatus).toBe("missing");
    expect(summary.warnings).toEqual(
      expect.arrayContaining(["dirty_worktree", "missing_krn_config_json"]),
    );
    expect(summary.requiredOperatorDecisions).toEqual(
      expect.arrayContaining([
        "clean_or_branch_isolate_before_paid_dogfood",
        "create_or_accept_record_only_krn_config",
        "krn_install_not_run",
      ]),
    );
  }, 20_000);

  it("detects safe verify profile evidence in real-repo preflight", async () => {
    const repo = await createGitRepoForPreflight({
      config: {
        version: 1,
        verify: {
          defaultProfile: "unit",
          profiles: {
            unit: {
              commands: [
                { command: "node", args: ["src/index.test.ts"] },
                { command: "pnpm", args: ["test", "--coverage"] },
              ],
            },
          },
        },
      },
    });
    const { result, summary } = runRealRepoPreflight(repo, {
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-safe"),
    });

    expect(result.status).toBe(0);
    expect(summary.eligible).toBe(true);
    expect(summary.krnConfigExists).toBe(true);
    expect(summary.verifyProfileStatus).toBe("safe");
    expect(summary.safeVerifyCommands).toEqual(["node src/index.test.ts", "pnpm test --coverage"]);
    expect(summary.krnIdentityValid).toBe(true);
    expect(summary.pinnedKrnPath).toBe(path.join(repo, "..", "bin-safe", "krn"));
  }, 20_000);

  it("detects safe python3 readonly verify profile evidence in real-repo preflight", async () => {
    const repo = await createGitRepoForPreflight({
      config: {
        version: 1,
        verify: {
          defaultProfile: "readonly",
          profiles: {
            readonly: {
              commands: [
                {
                  command: "python3",
                  args: ["tools/check_all_readonly.py"],
                  label: "readonly suite",
                },
              ],
            },
          },
        },
      },
    });
    const { result, summary } = runRealRepoPreflight(repo, {
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-python"),
    });

    expect(result.status).toBe(0);
    expect(summary.eligible).toBe(true);
    expect(summary.krnConfigExists).toBe(true);
    expect(summary.verifyProfileStatus).toBe("safe");
    expect(summary.safeVerifyCommands).toEqual(["python3 tools/check_all_readonly.py"]);
    expect(summary.unsafeVerifyCommands).toEqual([]);
  }, 20_000);

  it("writes deterministic real-repo preflight summary files", async () => {
    const repo = await createGitRepoForPreflight({
      config: {
        version: 1,
        verify: {
          commands: ["pnpm lint"],
        },
      },
    });
    const { summary } = runRealRepoPreflight(repo, {
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-shape"),
    });

    expect(Object.keys(summary)).toEqual([
      "schema",
      "eligible",
      "repoPath",
      "sourceRootPath",
      "isGitRepo",
      "dirtyWorktree",
      "krnConfigExists",
      "verifyProfileStatus",
      "verifyDefaultProfile",
      "verifyProfiles",
      "safeVerifyCommands",
      "unsafeVerifyCommands",
      "configIssues",
      "blockers",
      "warnings",
      "requiredOperatorDecisions",
      "pinnedKrnPath",
      "krnIdentityValid",
      "krnIdentity",
      "krnStatusOk",
      "krnStatusOutput",
      "installRun",
      "installOutput",
      "wouldInstall",
      "recommendedNextCommand",
      "summaryJsonPath",
      "summaryMarkdownPath",
    ]);
    expect(summary.wouldInstall).toEqual([
      "AGENTS.md",
      ".codex/hooks.json",
      ".agents/skills/krn-harness/SKILL.md",
      ".krn/",
    ]);
    expect(summary.summaryJsonPath).toBe(
      path.join(repo, ".krn/dogfood/real-repo-preflight/latest/summary.json"),
    );
    expect(summary.summaryMarkdownPath).toBe(
      path.join(repo, ".krn/dogfood/real-repo-preflight/latest/summary.md"),
    );
    expect(
      await readJson<RealRepoPreflightSummary>(
        repo,
        ".krn/dogfood/real-repo-preflight/latest/summary.json",
      ),
    ).toMatchObject({
      schema: "krn-real-repo-preflight-v1",
      verifyProfileStatus: "safe",
      safeVerifyCommands: ["pnpm lint"],
    });
    await expectFile(repo, ".krn/dogfood/real-repo-preflight/latest/summary.md");
  }, 20_000);

  it("writes a skipped real-repo dogfood report when approval env is missing", async () => {
    const { result, summary } = runRealRepoDogfood({
      KRN_REAL_REPO_DOGFOOD_RUN_ID: "test-missing-env",
      KRN_REAL_REPO_DOGFOOD_PATH: "",
      KRN_REAL_REPO_DOGFOOD_APPROVED: "",
    });

    expect(result.status).toBe(0);
    expect(summary).toMatchObject({
      schema: "krn-real-repo-dogfood-v1",
      runId: "test-missing-env",
      status: "skipped",
      outcomeKind: "skipped-missing-env",
      validationClaim: "not validated; no real repository was preflighted or executed",
      dogfoodApproved: false,
      preflightEligible: null,
      krnIdentityValid: false,
    });
    expect(summary.missingEnv).toEqual([
      "KRN_REAL_REPO_DOGFOOD_PATH",
      "KRN_REAL_REPO_DOGFOOD_APPROVED=1",
    ]);
    expect(summary.missingEnvInstructions).toEqual([
      "Choose an absolute path to a safe non-protected git repository.",
      "export KRN_REAL_REPO_DOGFOOD_PATH=/absolute/path/to/safe-non-protected-repo",
      "export KRN_REAL_REPO_DOGFOOD_APPROVED=1",
      "scripts/krn-real-repo-dogfood.sh",
    ]);
    expect(summary.requiredOperatorDecisions).toEqual(
      expect.arrayContaining([
        "set_KRN_REAL_REPO_DOGFOOD_PATH",
        "set_KRN_REAL_REPO_DOGFOOD_APPROVED",
      ]),
    );
    expect(summary.summaryJsonPath).toContain(".krn/dogfood/real-repo-skipped/test-missing-env");
    await expectFile(process.cwd(), ".krn/dogfood/real-repo-skipped/test-missing-env/summary.md");
    await expect(
      readFile(
        path.join(process.cwd(), ".krn/dogfood/real-repo-skipped/test-missing-env/summary.md"),
        "utf8",
      ),
    ).resolves.toContain("Skipped and readiness reports are not real-repo validation.");
  });

  it("blocks real-repo dogfood when preflight rejects the source checkout", () => {
    const { result, summary } = runRealRepoDogfood({
      KRN_REAL_REPO_DOGFOOD_RUN_ID: "test-source-checkout",
      KRN_REAL_REPO_DOGFOOD_PATH: process.cwd(),
      KRN_REAL_REPO_DOGFOOD_APPROVED: "1",
    });

    expect(result.status).toBe(0);
    expect(summary.status).toBe("blocked");
    expect(summary.preflightEligible).toBe(false);
    expect(summary.blockers).toContain("repo_path_is_krn_source_checkout");
    expect(summary.pinnedKrnPath).toBeNull();
    expect(summary.summaryJsonPath).toContain(
      ".krn/dogfood/real-repo-skipped/test-source-checkout",
    );
  });

  it("writes a real-repo dogfood readiness report for an eligible repo without paid Codex", async () => {
    const repo = await createGitRepoForPreflight({
      config: {
        version: 1,
        verify: {
          defaultProfile: "unit",
          profiles: {
            unit: {
              commands: [{ command: "node", args: ["src/index.test.ts"] }],
            },
          },
        },
      },
    });
    const { result, summary } = runRealRepoDogfood({
      KRN_REAL_REPO_DOGFOOD_RUN_ID: "test-readiness",
      KRN_REAL_REPO_DOGFOOD_PATH: repo,
      KRN_REAL_REPO_DOGFOOD_APPROVED: "1",
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-dogfood"),
    });

    expect(result.status).toBe(0);
    expect(summary.status).toBe("readiness");
    expect(summary.preflightEligible).toBe(true);
    expect(summary.codexApproved).toBe(false);
    expect(summary.warnings).toContain("paid_codex_execution_not_approved");
    expect(summary.requiredOperatorDecisions).toEqual(
      expect.arrayContaining(["approve_paid_codex_or_run_manual_protocol", "krn_install_not_run"]),
    );
    expect(summary.pinnedKrnPath).toBe(path.join(repo, "..", "bin-dogfood", "krn"));
    expect(summary.krnIdentityValid).toBe(true);
    expect(summary.verifyProfileStatus).toBe("safe");
    expect(summary.safeVerifyCommands).toEqual(["node src/index.test.ts"]);
    await expectFile(repo, ".krn/dogfood/real-repo-dogfood/test-readiness/summary.json");
    await expectFile(repo, ".krn/dogfood/real-repo-dogfood/test-readiness/summary.md");
  }, 20_000);

  it("writes a manual real-repo execution result without committing or claiming production proof", async () => {
    const repo = await createGitRepoForPreflight();
    await writeFile(path.join(repo, "README.md"), "# Fixture\n\nTiny wording change.\n", "utf8");

    const { result, summary } = runRealRepoExecutionReport({
      KRN_REAL_REPO_EXECUTION_RUN_ID: "test-manual-execution",
      KRN_REAL_REPO_EXECUTION_TARGET_REPO_PATH: repo,
      KRN_REAL_REPO_EXECUTION_WORKTREE_PATH: repo,
      KRN_REAL_REPO_EXECUTION_TARGET_CLEAN_BEFORE: "1",
      KRN_REAL_REPO_EXECUTION_KIND: "manual-codex",
      KRN_REAL_REPO_EXECUTION_CODEX_SESSION_ID: "session-test",
      KRN_REAL_REPO_EXECUTION_CODEX_EXIT_CODE: "0",
      KRN_REAL_REPO_EXECUTION_CODEX_COMMAND_SHAPE:
        "codex -a never -s workspace-write -C <repo> exec <prompt>",
      KRN_REAL_REPO_EXECUTION_PINNED_KRN_PATH: path.join(repo, "..", "bin", "krn"),
      KRN_REAL_REPO_EXECUTION_KRN_IDENTITY_VALID: "1",
      KRN_REAL_REPO_EXECUTION_VALIDATION_COMMAND: "python3 tools/check_all_readonly.py",
      KRN_REAL_REPO_EXECUTION_VALIDATION_STATUS: "pass",
      KRN_REAL_REPO_EXECUTION_VALIDATION_DURATION_SECONDS: "1.25",
      KRN_REAL_REPO_EXECUTION_HOOK_TRUST_STATUS: "unproven",
    });

    expect(result.status).toBe(0);
    expect(summary).toMatchObject({
      schema: "krn-real-repo-execution-result-v1",
      runId: "test-manual-execution",
      status: "pass",
      executionKind: "manual-codex",
      targetRepoPath: repo,
      executionWorktreePath: repo,
      targetRepoCleanBefore: true,
      targetRepoCleanAfter: false,
      validationStatus: "pass",
      changedFiles: ["README.md"],
      forbiddenTouchedFiles: [],
      committedTargetRepo: false,
      pushedTargetRepo: false,
      hookTrustStatus: "unproven",
      productionProof: false,
    });
    expect(summary.summaryJsonPath).toBe(
      path.join(repo, ".krn/dogfood/real-repo-execution/test-manual-execution/summary.json"),
    );
    await expectFile(repo, ".krn/dogfood/real-repo-execution/test-manual-execution/summary.md");
  });

  it("prints helpful output for unknown commands", async () => {
    const result = await runInTemp(["unknown-command"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unknown command: unknown-command");
    expect(result.stdout).toContain("KRN Harness CLI");
    expect(result.stdout).toContain("krn memory <command>");
    expect(result.stdout).toContain("krn hook codex <event>");
  });

  it("runs status and writes a trace event", async () => {
    const result = await runInTemp(["status"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN status: ready");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([{ name: "cli.status" }]);
  });

  it("runs the full P0 local loop and writes current graph trace artifacts", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));

    for (const args of [
      ["status"],
      ["start", "Update", "a", "frontend", "section", "using", "only", "relevant", "context"],
      ["graph"],
      ["context"],
      ["verify"],
      ["handoff"],
      ["doctor"],
      ["eval"],
      ["review", "--write"],
      ["summary", "--write"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const contract = await readJson<{ id: string }>(cwd, ".krn/current/task-contract.json");
    const expectedFiles = [
      ".krn/current/task-contract.json",
      ".krn/current/task-contract.md",
      ".krn/current/run.json",
      ".krn/graph/repo-graph.json",
      ".krn/graph/repo-graph.md",
      ".krn/current/context-package.json",
      ".krn/current/context-package.md",
      ".krn/current/verify-result.json",
      ".krn/current/verify-result.md",
      ".krn/current/handoff.md",
      ".krn/current/doctor-result.json",
      ".krn/current/doctor-result.md",
      ".krn/current/eval-result.json",
      ".krn/current/eval-result.md",
      ".krn/current/operator-summary.json",
      ".krn/current/operator-summary.md",
      ".krn/current/review-summary.json",
      ".krn/current/review-summary.md",
      ".krn/current/review-result.json",
      ".krn/current/review-result.md",
      ".krn/traces/trace.jsonl",
      `.krn/runs/${contract.id}/trace.jsonl`,
      `.krn/runs/${contract.id}/run.json`,
      `.krn/runs/${contract.id}/summary.md`,
    ];

    for (const file of expectedFiles) {
      await expectFile(cwd, file);
    }

    expect((await readTraceEvents(cwd)).map((event) => event.name)).toEqual([
      "cli.status",
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
      "review.ran",
      "summary.ran",
    ]);
    expect((await readRunTraceEvents(cwd, contract.id)).map((event) => event.name)).toEqual([
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
      "review.ran",
      "summary.ran",
    ]);
  });

  it("rejects unsupported review options", async () => {
    const result = await runInTemp(["review", "--llm"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("KRN review: `--llm` is not implemented");
  });

  it("runs deterministic reviewers without executing model or verify commands", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");

    for (const args of [
      ["install"],
      ["start", "Review deterministic local artifacts after safe fixture verification."],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const review = await runInCwd(cwd, ["review", "--write"]);

    expect(review.code).toBe(0);
    expect(review.stdout).toContain("KRN review:");
    expect(review.stdout).toContain("records: 7");
    await expectFile(cwd, ".krn/current/review-summary.json");
    await expectFile(cwd, ".krn/current/review-summary.md");
    await expectFile(cwd, ".krn/current/review-result.json");
    await expectFile(cwd, ".krn/current/review-result.md");

    const result = await readJson<ReviewResultFixture>(cwd, ".krn/current/review-summary.json");
    expect(result.schema).toBe("krn-review-summary-v1");
    expect(result.reviewers.map((item) => item.reviewer)).toEqual([
      "safety",
      "evidence",
      "context",
      "verify",
      "handoff",
      "dogfood",
      "release",
    ]);
    expect(result.reviewers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reviewer: "evidence", status: "pass" }),
        expect.objectContaining({ reviewer: "verify", status: "pass" }),
        expect.objectContaining({ reviewer: "handoff", status: "pass" }),
        expect.objectContaining({ reviewer: "release", status: "warn" }),
      ]),
    );
    expect(result.reviewers.find((item) => item.reviewer === "dogfood")?.status).toBe("warn");
    expect((await readTraceEvents(cwd)).map((event) => event.name)).toContain("review.ran");
  }, 20_000);

  it("keeps dogfood reviewer findings focused when historical skips accumulate", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));

    for (const runId of ["run-1", "run-2", "run-3"]) {
      const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-skipped", runId);
      await mkdir(runDir, { recursive: true });
      await writeFile(
        path.join(runDir, "summary.json"),
        JSON.stringify(
          {
            schema: "krn-real-repo-dogfood-v1",
            status: "skipped",
            outcomeKind: "skipped-missing-env",
          },
          null,
          2,
        ),
      );
    }

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "warn",
      summary:
        "Found 3 dogfood summary artifact(s): 0 failing, 0 invalid, 0 blocked, 3 skipped, 0 readiness-only, 0 preflight-only, 0 execution-result.",
    });
    expect(dogfood?.evidence).toHaveLength(3);
    expect(dogfood?.findings).toEqual([
      "skipped dogfood summary: .krn/dogfood/real-repo-skipped/run-3/summary.json",
      "skipped dogfood summary: 2 older artifact(s) omitted; see evidence list.",
    ]);
  });

  it("treats readiness-only dogfood as warning rather than execution proof", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-dogfood", "readiness-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-dogfood-v1",
          status: "readiness",
          outcomeKind: "readiness-only",
          validationClaim: "readiness-only; not real-repo execution validation",
        },
        null,
        2,
      ),
    );

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "warn",
      summary:
        "Found 1 dogfood summary artifact(s): 0 failing, 0 invalid, 0 blocked, 0 skipped, 1 readiness-only, 0 preflight-only, 0 execution-result.",
      findings: [
        "readiness-only dogfood summary: .krn/dogfood/real-repo-dogfood/readiness-run/summary.json",
      ],
      nextActions: [
        "Review blocked/skipped/readiness/preflight/execution dogfood reports before claiming execution proof.",
      ],
    });
  });

  it("treats preflight-only dogfood as warning rather than execution proof", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-preflight", "latest");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-preflight-v1",
          eligible: true,
          krnIdentityValid: true,
          blockers: [],
          warnings: ["missing_krn_config_json"],
        },
        null,
        2,
      ),
    );

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "warn",
      summary:
        "Found 1 dogfood summary artifact(s): 0 failing, 0 invalid, 0 blocked, 0 skipped, 0 readiness-only, 1 preflight-only, 0 execution-result.",
      findings: [
        "preflight-only dogfood summary: .krn/dogfood/real-repo-preflight/latest/summary.json",
      ],
      nextActions: [
        "Review blocked/skipped/readiness/preflight/execution dogfood reports before claiming execution proof.",
      ],
    });
  });

  it("treats manual execution with unproven hook trust as warning evidence", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "manual-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "pass",
          executionKind: "manual-codex",
          validationStatus: "pass",
          forbiddenTouchedFiles: [],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "unproven",
          productionProof: false,
        },
        null,
        2,
      ),
    );

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "warn",
      summary:
        "Found 1 dogfood summary artifact(s): 0 failing, 0 invalid, 0 blocked, 0 skipped, 0 readiness-only, 0 preflight-only, 1 execution-result.",
      findings: [
        "execution-result warning: .krn/dogfood/real-repo-execution/manual-run/summary.json",
      ],
      nextActions: [
        "Review blocked/skipped/readiness/preflight/execution dogfood reports before claiming execution proof.",
      ],
    });
  });

  it("fails unsafe real-repo execution results", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "unsafe-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "pass",
          executionKind: "manual-codex",
          validationStatus: "pass",
          forbiddenTouchedFiles: [".env"],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "partially-proven",
          productionProof: false,
        },
        null,
        2,
      ),
    );

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "fail",
      findings: [
        "unsafe execution result: .krn/dogfood/real-repo-execution/unsafe-run/summary.json",
      ],
      nextActions: ["Inspect failing, invalid, or unsafe dogfood reports."],
    });
  });

  it("prints operator summary JSON without requiring existing .krn state", async () => {
    const result = await runInTemp(["summary", "--json"]);

    expect(result.code).toBe(0);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;
    expect(summary.schema).toBe("krn-operator-summary-v1");
    expect(summary.status).toBe("warn");
    expect(summary.currentTask.status).toBe("missing");
    expect(summary.hooks.status).toBe("unproven");
    expect(summary.realRepoDogfood.status).toBe("unproven");
    expect(summary.reviewers.status).toBe("missing");
    await expect(
      stat(path.join(result.cwd, ".krn", "current", "operator-summary.json")),
    ).rejects.toThrow();
  });

  it("prints conservative operator summary limits in markdown", async () => {
    const result = await runInTemp(["summary"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(
      "Skipped, readiness, missing, unproven, manual-diagnostic-only, and partially-proven are never production proof states.",
    );
  });

  it("surfaces missing real-repo dogfood env in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-skipped", "missing-env");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-dogfood-v1",
          status: "skipped",
          outcomeKind: "skipped-missing-env",
          missingEnv: ["KRN_REAL_REPO_DOGFOOD_PATH", "KRN_REAL_REPO_DOGFOOD_APPROVED=1"],
          repoPath: null,
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "skipped",
      outcomeKind: "skipped-missing-env",
      missingEnv: ["KRN_REAL_REPO_DOGFOOD_PATH", "KRN_REAL_REPO_DOGFOOD_APPROVED=1"],
    });
    expect(summary.realRepoDogfood.summary).toBe(
      "Real-repo dogfood was skipped because required environment is missing: KRN_REAL_REPO_DOGFOOD_PATH, KRN_REAL_REPO_DOGFOOD_APPROVED=1.",
    );
    expect(summary.nextActions).toContain(
      "Set KRN_REAL_REPO_DOGFOOD_PATH and KRN_REAL_REPO_DOGFOOD_APPROVED=1, then rerun scripts/krn-real-repo-dogfood.sh.",
    );
  });

  it("uses readiness dogfood next command in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-dogfood", "readiness-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-dogfood-v1",
          status: "readiness",
          outcomeKind: "readiness-only",
          repoPath: cwd,
          nextCommand: "Review readiness artifact before approving paid/manual execution.",
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "readiness",
      outcomeKind: "readiness-only",
    });
    expect(summary.nextActions).toContain(
      "Review readiness artifact before approving paid/manual execution.",
    );
    expect(summary.nextActions).not.toContain(
      "Run real-repo dogfood on an approved non-protected repository.",
    );
  });

  it("surfaces preflight-only dogfood as unproven in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-preflight", "latest");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-preflight-v1",
          eligible: true,
          repoPath: cwd,
          blockers: [],
          warnings: ["missing_krn_config_json"],
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "unproven",
      outcomeKind: "preflight-only",
      summary: "Only real-repo preflight summary exists; readiness/execution remains unproven.",
    });
    expect(summary.nextActions).toContain(
      "Run scripts/krn-real-repo-dogfood.sh with approved env to produce readiness or execution state.",
    );
  });

  it("surfaces manual real-repo execution evidence without production proof", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "manual-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "pass",
          executionKind: "manual-codex",
          targetRepoPath: cwd,
          executionWorktreePath: cwd,
          validationStatus: "pass",
          forbiddenTouchedFiles: [],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "unproven",
          productionProof: false,
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "execution-evidence",
      repoPath: cwd,
      executionWorktreePath: cwd,
      outcomeKind: "manual-codex",
      executionKind: "manual-codex",
      validationStatus: "pass",
      productionProof: false,
      hookTrustStatus: "unproven",
      summary:
        "Real-repo dogfood has manual-codex execution evidence; production proof remains false.",
    });
    expect(summary.nextActions).toContain(
      "Run a non-bypass Codex hook trust probe before claiming hook validation.",
    );
  });

  it("fails unsafe real-repo execution evidence in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "unsafe-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "pass",
          executionKind: "manual-codex",
          repoPath: cwd,
          validationStatus: "pass",
          forbiddenTouchedFiles: [".env"],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "partially-proven",
          productionProof: false,
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "fail",
      summary:
        "Real-repo execution result is unsafe: forbidden files, target commit/push, or production-proof overclaim detected.",
    });
    expect(summary.blockers).toContain(
      "realRepoDogfood: Real-repo execution result is unsafe: forbidden files, target commit/push, or production-proof overclaim detected.",
    );
  });

  it("uses execution-result blocker next action in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "blocked-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "blocked",
          executionKind: "blocked",
          targetRepoPath: cwd,
          executionWorktreePath: cwd,
          validationStatus: "pass",
          forbiddenTouchedFiles: [],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "unproven",
          productionProof: false,
          nextActions: ["Set KRN_REAL_REPO_CODEX_APPROVED=1 only after operator approval."],
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "blocked",
      executionKind: "blocked",
      validationStatus: "pass",
      productionProof: false,
    });
    expect(summary.nextActions).toContain(
      "Set KRN_REAL_REPO_CODEX_APPROVED=1 only after operator approval.",
    );
  });

  it("writes operator summary with reviewer aggregate when review summary exists", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");

    for (const args of [
      ["install"],
      ["start", "Summarize deterministic operator evidence."],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
      ["review", "--write"],
      ["summary", "--write"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    await expectFile(cwd, ".krn/current/operator-summary.json");
    await expectFile(cwd, ".krn/current/operator-summary.md");
    const summary = await readJson<OperatorSummaryFixture>(
      cwd,
      ".krn/current/operator-summary.json",
    );

    expect(summary.schema).toBe("krn-operator-summary-v1");
    expect(summary.currentTask.status).toBe("pass");
    expect(summary.verify).toMatchObject({
      status: "pass",
      mode: "execute",
      executedCommands: 1,
    });
    expect(summary.hooks.status).toBe("unproven");
    expect(summary.realRepoDogfood.status).toBe("unproven");
    expect(summary.reviewers).toMatchObject({
      status: "warn",
      total: 7,
    });
    expect(summary.nextActions).toContain(
      "Run a non-bypass Codex hook trust probe before claiming hook validation.",
    );
    expect((await readTraceEvents(cwd)).map((event) => event.name)).toContain("summary.ran");
  }, 20_000);

  it("classifies manual hook trace evidence as diagnostic-only in operator summary", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");

    for (const args of [
      ["install"],
      ["start", "Check manual hook evidence semantics."],
      ["graph"],
      ["context"],
      ["hook", "codex", "SessionStart"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const summary = await runInCwd(cwd, ["summary", "--json"]);
    const result = JSON.parse(summary.stdout) as OperatorSummaryFixture;

    expect(result.hooks).toMatchObject({
      status: "manual-diagnostic-only",
      hookReceivedCount: 1,
      hookTrustStatus: "manual-diagnostic-only",
    });
    expect(result.hooks.summary).toContain("Only diagnostic-level hook.received events exist");
  }, 20_000);

  it("classifies trusted hook trace markers as partially proven in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "traces"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "traces", "trace.jsonl"),
      `${JSON.stringify({
        id: "trace-trusted-hook",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          payloadSource: "codex-trusted-hook",
          trustedHookLoad: true,
          decision: "allow",
          enforced: false,
        },
      })}\n`,
      "utf8",
    );

    const summary = await runInCwd(cwd, ["summary", "--json"]);
    const result = JSON.parse(summary.stdout) as OperatorSummaryFixture;

    expect(result.hooks).toMatchObject({
      status: "partially-proven",
      hookReceivedCount: 1,
      hookTrustStatus: "partially-proven",
    });
    expect(result.hooks.summary).toContain("only partially proven");
    expect(result.nextActions).not.toContain(
      "Run a non-bypass Codex hook trust probe before claiming hook validation.",
    );
  });

  it("runs graph and writes deterministic graph artifacts", async () => {
    const result = await runInTemp(["graph"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`KRN graph: ready
nodes: 0
edges: 0
json: .krn/graph/repo-graph.json
markdown: .krn/graph/repo-graph.md
`);

    const graphJson = await readJson<{
      schemaVersion: number;
      generatedAt: string;
      nodeCount: number;
      edgeCount: number;
      detectors: string[];
      relationKindCounts: Record<string, number>;
      nodeKindCounts: Record<string, number>;
      statusCounts: Record<string, number>;
      nodes: unknown[];
      edges: unknown[];
    }>(result.cwd, ".krn/graph/repo-graph.json");
    const graphMarkdown = await readFile(path.join(result.cwd, ".krn/graph/repo-graph.md"), "utf8");

    expect(graphJson).toMatchObject({
      schemaVersion: 1,
      generatedAt: "2026-06-03T00:00:00.000Z",
      nodeCount: 0,
      edgeCount: 0,
      relationKindCounts: {},
      nodeKindCounts: {},
      statusCounts: {},
      nodes: [],
      edges: [],
    });
    expect(graphJson.detectors).toEqual([
      "acf-json",
      "composer-json",
      "css-class",
      "docs-links",
      "filesystem",
      "package-conventions",
      "package-json",
      "wordpress-bedrock",
    ]);
    expect(graphMarkdown).toContain("# Graph-Lite Repository Graph");
    expect(graphMarkdown).toContain("## Detectors");
    expect(graphMarkdown).toContain("## Relation Kinds");
    expect(graphMarkdown).toContain("## Evidence Examples");
    expect(graphMarkdown).toContain("Graph-lite is shallow P0 evidence");
    await expect(stat(path.join(result.cwd, ".krn", "runs"))).rejects.toThrow();
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "graph.built",
        data: {
          nodeCount: 0,
          edgeCount: 0,
          detectors: graphJson.detectors,
          relationKindCounts: {},
          nodeKindCounts: {},
        },
      },
    ]);
  });

  it("installs deterministic downstream onboarding artifacts safely and idempotently", async () => {
    const install = await runInTemp(["install"]);

    expect(install.code).toBe(0);
    expect(install.stdout).toContain("KRN install: installed");
    expect(install.stdout).toContain("created: 11");
    expect(install.stdout).toContain("skipped: 0");

    await expectDirectory(install.cwd, ".krn/current");
    await expectDirectory(install.cwd, ".krn/graph");
    await expectDirectory(install.cwd, ".krn/traces");
    await expectDirectory(install.cwd, ".krn/runs");
    await expectDirectory(install.cwd, ".krn/memory");
    await expectDirectory(install.cwd, ".krn/bin");
    await expectFile(install.cwd, ".krn/bin/krn");
    await expectFile(install.cwd, ".krn/current/install-result.json");
    await expectFile(install.cwd, ".krn/current/install-result.md");

    await expect(readJson(install.cwd, "krn.config.json")).resolves.toEqual({
      version: 1,
      runtime: {
        dir: ".krn",
      },
    });

    const agents = await readFile(path.join(install.cwd, "AGENTS.md"), "utf8");
    const hooks = await readJson<{
      hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
    }>(install.cwd, ".codex/hooks.json");
    const runtimeSkill = await readFile(
      path.join(install.cwd, ".agents/skills/krn-harness/SKILL.md"),
      "utf8",
    );

    expect(agents).toContain("KRN Harness");
    expect(agents).toContain("KRN-HARNESS-MANAGED:v1");
    expect(agents).toContain("krn start");
    expect(agents).toContain("STOP");
    expect(agents.length).toBeLessThan(2200);
    expect(agents).not.toContain("Architecture Spec");
    for (const event of supportedP0CodexHookEvents) {
      expect(hooks.hooks[event]?.[0]?.hooks[0]?.command).toBe(`./.krn/bin/krn hook codex ${event}`);
    }
    expect((hooks as { _krnManaged?: string })._krnManaged).toBe("KRN-HARNESS-MANAGED:v1");
    expect(runtimeSkill).toContain("krn status");
    expect(runtimeSkill).toContain("KRN-HARNESS-MANAGED:v1");
    expect(runtimeSkill).toContain("krn start");
    expect(runtimeSkill).toContain("krn context");
    expect(runtimeSkill).toContain("krn verify");
    expect(runtimeSkill).toContain("krn handoff");
    expect(runtimeSkill.length).toBeLessThan(1600);
    expect(runtimeSkill).not.toContain("Architecture Spec");

    await expect(readTraceEvents(install.cwd)).resolves.toMatchObject([
      {
        name: "install.ran",
        data: {
          status: "installed",
          created: 11,
          skipped: 0,
          reason: null,
          actions: [
            { path: ".krn/current", kind: "directory", status: "created" },
            { path: ".krn/graph", kind: "directory", status: "created" },
            { path: ".krn/traces", kind: "directory", status: "created" },
            { path: ".krn/runs", kind: "directory", status: "created" },
            { path: ".krn/memory", kind: "directory", status: "created" },
            { path: ".krn/bin", kind: "directory", status: "created" },
            { path: "krn.config.json", kind: "file", status: "created" },
            { path: "AGENTS.md", kind: "file", status: "created" },
            { path: ".krn/bin/krn", kind: "file", status: "created" },
            { path: ".codex/hooks.json", kind: "file", status: "created" },
            {
              path: ".agents/skills/krn-harness/SKILL.md",
              kind: "file",
              status: "created",
            },
          ],
        },
      },
    ]);

    const secondInstall = await runInCwd(install.cwd, ["install"]);
    expect(secondInstall).toMatchObject({ code: 0 });
    expect(secondInstall.stdout).toContain("created: 0");
    expect(secondInstall.stdout).toContain("skipped: 11");
    await expect(readTraceEvents(install.cwd)).resolves.toMatchObject([
      { name: "install.ran" },
      {
        name: "install.ran",
        data: {
          status: "installed",
          created: 0,
          skipped: 11,
          reason: null,
          actions: [
            { path: ".krn/current", kind: "directory", status: "skipped" },
            { path: ".krn/graph", kind: "directory", status: "skipped" },
            { path: ".krn/traces", kind: "directory", status: "skipped" },
            { path: ".krn/runs", kind: "directory", status: "skipped" },
            { path: ".krn/memory", kind: "directory", status: "skipped" },
            { path: ".krn/bin", kind: "directory", status: "skipped" },
            { path: "krn.config.json", kind: "file", status: "skipped" },
            { path: "AGENTS.md", kind: "file", status: "skipped" },
            { path: ".krn/bin/krn", kind: "file", status: "skipped" },
            { path: ".codex/hooks.json", kind: "file", status: "skipped" },
            {
              path: ".agents/skills/krn-harness/SKILL.md",
              kind: "file",
              status: "skipped",
            },
          ],
        },
      },
    ]);

    const doctor = await runInCwd(install.cwd, ["doctor"]);
    expect(doctor).toMatchObject({ code: 0 });
    const doctorJson = await readJson<{
      checks: Array<{ name: string; status: string }>;
    }>(install.cwd, ".krn/current/doctor-result.json");

    expect(doctorJson.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "config",
          status: "pass",
          detail: "krn.config.json is valid",
        }),
        expect.objectContaining({
          name: "downstream-agents",
          status: "pass",
          detail: "AGENTS.md is present; downstream guidance may be project-owned",
        }),
        expect.objectContaining({
          name: "downstream-runtime-skill",
          status: "pass",
          detail: ".agents/skills/krn-harness/SKILL.md is present and routes through the KRN CLI",
        }),
        expect.objectContaining({
          name: "downstream-hooks-template",
          status: "pass",
          detail: ".codex/hooks.json covers 7 P0 Codex hook event(s)",
        }),
      ]),
    );
  });

  it("plans install without writing files in dry-run mode", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const result = await runInCwd(cwd, ["install", "--dry-run", "--json"]);
    const plan = JSON.parse(result.stdout) as {
      schema: string;
      dryRun: boolean;
      status: string;
      actions: Array<{ path: string; status: string }>;
    };

    expect(result.code).toBe(0);
    expect(plan.schema).toBe("krn-install-result-v1");
    expect(plan.dryRun).toBe(true);
    expect(plan.status).toBe("planned");
    expect(plan.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "AGENTS.md", status: "would-create" }),
        expect.objectContaining({ path: ".codex/hooks.json", status: "would-create" }),
        expect.objectContaining({ path: ".krn/bin/krn", status: "would-create" }),
      ]),
    );
    await expect(stat(path.join(cwd, ".krn"))).rejects.toThrow();
    await expect(stat(path.join(cwd, "AGENTS.md"))).rejects.toThrow();
  });

  it("uninstalls only managed files and preserves runtime evidence", async () => {
    const install = await runInTemp(["install"]);
    await writeFile(
      path.join(install.cwd, ".krn", "current", "operator-report.json"),
      "{}",
      "utf8",
    );

    const dryRun = await runInCwd(install.cwd, ["uninstall", "--dry-run", "--json"]);
    const dryRunPlan = JSON.parse(dryRun.stdout) as {
      schema: string;
      dryRun: boolean;
      candidates: Array<{ path: string; status: string }>;
      refused: Array<{ path: string; reason: string }>;
      preserved: string[];
    };

    expect(dryRun.code).toBe(0);
    expect(dryRunPlan.schema).toBe("krn-uninstall-result-v1");
    expect(dryRunPlan.dryRun).toBe(true);
    expect(dryRunPlan.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "AGENTS.md", status: "would-remove" }),
        expect.objectContaining({ path: ".codex/hooks.json", status: "would-remove" }),
        expect.objectContaining({
          path: ".agents/skills/krn-harness/SKILL.md",
          status: "would-remove",
        }),
        expect.objectContaining({ path: ".krn/bin/krn", status: "would-remove" }),
      ]),
    );
    expect(dryRunPlan.refused).toEqual([]);
    expect(dryRunPlan.preserved).toContain(".krn/current");
    await expectFile(install.cwd, "AGENTS.md");

    const confirmed = await runInCwd(install.cwd, ["uninstall", "--confirm", "--json"]);
    const result = JSON.parse(confirmed.stdout) as { status: string; removed: number };
    expect(confirmed.code).toBe(0);
    expect(result).toMatchObject({ status: "uninstalled", removed: 4 });
    await expect(stat(path.join(install.cwd, "AGENTS.md"))).rejects.toThrow();
    await expect(stat(path.join(install.cwd, ".codex", "hooks.json"))).rejects.toThrow();
    await expect(stat(path.join(install.cwd, ".krn", "bin", "krn"))).rejects.toThrow();
    await expectFile(install.cwd, ".krn/current/operator-report.json");
    await expectFile(install.cwd, ".krn/current/uninstall-result.json");
  });

  it("refuses to uninstall user-owned files without a managed marker", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "AGENTS.md"), "# User instructions\n", "utf8");

    const result = await runInCwd(cwd, ["uninstall", "--dry-run", "--json"]);
    const plan = JSON.parse(result.stdout) as {
      candidates: Array<{ path: string }>;
      refused: Array<{ path: string; reason: string }>;
    };

    expect(result.code).toBe(0);
    expect(plan.candidates).toEqual([]);
    expect(plan.refused).toEqual([
      expect.objectContaining({
        path: "AGENTS.md",
        reason: expect.stringContaining("no KRN managed marker"),
      }),
    ]);
    await expect(readFile(path.join(cwd, "AGENTS.md"), "utf8")).resolves.toBe(
      "# User instructions\n",
    );
  });

  it("validates config and initializes safe starter profiles", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const missing = await runInCwd(cwd, ["config", "doctor", "--json"]);
    const missingReport = JSON.parse(missing.stdout) as { status: string; source: string };
    expect(missing.code).toBe(0);
    expect(missingReport).toMatchObject({ status: "warn", source: "default" });

    const dryRun = await runInCwd(cwd, [
      "config",
      "init",
      "--dry-run",
      "--profile",
      "readonly-python",
      "--json",
    ]);
    const initPlan = JSON.parse(dryRun.stdout) as {
      status: string;
      dryRun: boolean;
      profile: string;
      config: { verify?: { defaultProfile?: string } };
    };
    expect(initPlan).toMatchObject({
      status: "planned",
      dryRun: true,
      profile: "readonly-python",
    });
    expect(initPlan.config.verify?.defaultProfile).toBe("readonly");
    await expect(stat(path.join(cwd, "krn.config.json"))).rejects.toThrow();

    const write = await runInCwd(cwd, [
      "config",
      "init",
      "--write",
      "--profile",
      "readonly-python",
    ]);
    expect(write.code).toBe(0);
    await expectFile(cwd, "krn.config.json");

    const doctor = await runInCwd(cwd, ["config", "doctor", "--json"]);
    const doctorReport = JSON.parse(doctor.stdout) as {
      status: string;
      source: string;
      commands: Array<{ command: string; allowed: boolean }>;
    };
    expect(doctor.code).toBe(0);
    expect(doctorReport).toMatchObject({ status: "pass", source: "file" });
    expect(doctorReport.commands).toEqual([
      { command: "python3 tools/check_all_readonly.py", allowed: true },
    ]);

    const overwrite = await runInCwd(cwd, ["config", "init", "--write", "--json"]);
    expect(overwrite.code).toBe(1);
    expect(JSON.parse(overwrite.stdout)).toMatchObject({ status: "blocked" });
  });

  it("fails config doctor on unsafe verify commands", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(
      path.join(cwd, "krn.config.json"),
      JSON.stringify({
        version: 1,
        verify: {
          commands: ["pnpm test && rm -rf .krn"],
        },
      }),
      "utf8",
    );

    const result = await runInCwd(cwd, ["config", "doctor", "--json"]);
    const report = JSON.parse(result.stdout) as {
      status: string;
      commands: Array<{ allowed: boolean; reason?: string }>;
    };
    expect(result.code).toBe(1);
    expect(report.status).toBe("fail");
    expect(report.commands).toEqual([
      expect.objectContaining({
        allowed: false,
        reason: "shell syntax is not allowed",
      }),
    ]);
  });

  it("preserves existing downstream instructions during install", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "AGENTS.md"), "# Existing Instructions\n", "utf8");
    await mkdir(path.join(cwd, ".codex"), { recursive: true });
    await writeFile(path.join(cwd, ".codex/hooks.json"), '{\n  "hooks": {}\n}\n', "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      '{\n  "version": 1,\n  "runtime": {\n    "dir": ".custom-krn"\n  }\n}\n',
      "utf8",
    );

    const install = await runInCwd(cwd, ["install"]);

    expect(install.code).toBe(0);
    expect(install.stdout).toContain("- skipped AGENTS.md: existing file preserved");
    expect(install.stdout).toContain("- skipped krn.config.json: existing file preserved");
    expect(install.stdout).toContain("- skipped .codex/hooks.json: existing file preserved");
    await expect(readFile(path.join(cwd, "AGENTS.md"), "utf8")).resolves.toBe(
      "# Existing Instructions\n",
    );
    await expect(readJson(cwd, ".codex/hooks.json")).resolves.toEqual({
      hooks: {},
    });
    await expect(readJson(cwd, "krn.config.json")).resolves.toEqual({
      version: 1,
      runtime: {
        dir: ".custom-krn",
      },
    });
  });

  it("runs the downstream-basic acceptance loop on a temp fixture copy", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");

    await expect(runInCwd(cwd, ["install"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["status"])).resolves.toMatchObject({ code: 0 });
    const start = await runInCwd(cwd, [
      "start",
      "Harden",
      "downstream",
      "basic",
      "fixture",
      "context",
    ]);
    expect(start).toMatchObject({ code: 0 });

    const contract = await readJson<{ id: string; task: string }>(
      cwd,
      ".krn/current/task-contract.json",
    );
    await expect(runInCwd(cwd, ["graph"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    const contextJson = await readJson<{
      stop: boolean;
      bucketSummaries: {
        mustRead: { totalItems: number; hiddenFromMarkdown: number };
        shouldRead: { totalItems: number; hiddenFromMarkdown: number };
        referenceOnly: { totalItems: number; hiddenFromMarkdown: number };
        doNotUse: { totalItems: number; hiddenFromMarkdown: number };
      };
      compactness: {
        totalItems: number;
        markdownVisibleItems: number;
        markdownHiddenItems: number;
      };
      overInclusion: {
        risk: string;
        score: number;
        reasons: string[];
      };
      buckets: {
        mustRead: Array<{
          path: string;
          selector?: string;
          operatorMessage?: string;
        }>;
        shouldRead: Array<{
          path: string;
          selector?: string;
          relationKind?: string;
          operatorMessage?: string;
        }>;
        referenceOnly: Array<{
          path: string;
          selector?: string;
          operatorMessage?: string;
        }>;
        doNotUse: Array<{
          path: string;
          selector?: string;
        }>;
      };
    }>(cwd, ".krn/current/context-package.json");
    const contextMarkdown = await readFile(
      path.join(cwd, ".krn/current/context-package.md"),
      "utf8",
    );
    expect(contextJson.stop).toBe(false);
    expect(contextJson.bucketSummaries).toMatchObject({
      mustRead: { totalItems: 2, hiddenFromMarkdown: 0 },
      shouldRead: { totalItems: 4, hiddenFromMarkdown: 0 },
      referenceOnly: { totalItems: 3, hiddenFromMarkdown: 0 },
      doNotUse: { totalItems: 1, hiddenFromMarkdown: 0 },
    });
    expect(contextJson.compactness).toMatchObject({
      totalItems: 10,
      markdownVisibleItems: 10,
      markdownHiddenItems: 0,
    });
    expect(contextJson.overInclusion).toMatchObject({
      risk: "low",
      score: 3,
      reasons: ["within-p0-budget"],
    });
    expect(contextJson.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "src/index.ts",
        selector: "package-owned-source",
        operatorMessage: "Read source owned by the matched package.",
      }),
    );
    expect(contextJson.buckets.shouldRead).toContainEqual(
      expect.objectContaining({
        path: "src/index.test.ts",
        selector: "tests-source-for-owned-source",
        relationKind: "tests-source",
        operatorMessage: "Review the paired test for the selected source.",
      }),
    );
    expect(contextJson.buckets.shouldRead).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "krn.config.json",
          selector: "package-owned-config",
        }),
        expect.objectContaining({
          path: "package.json",
          selector: "package-owned-config",
        }),
      ]),
    );
    expect(contextJson.buckets.referenceOnly).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "README.md",
          selector: "package-owned-doc",
          operatorMessage: "Use package docs as reference; code remains source of truth.",
        }),
        expect.objectContaining({
          path: "docs/overview.md",
          selector: "package-owned-doc",
        }),
      ]),
    );
    expect(contextJson.buckets.doNotUse).toContainEqual(
      expect.objectContaining({
        path: "docs/stale.md",
      }),
    );
    expect(
      contextJson.buckets.mustRead
        .map((item) => item.path)
        .some((item) => item.startsWith("fixtures/repos/")),
    ).toBe(false);
    expect(contextMarkdown).toContain("Read source owned by the matched package.");
    expect(contextMarkdown).toContain("Items: 10 total, 10 shown, 0 hidden from markdown");
    expect(contextMarkdown).toContain("Summary: 2 total, showing 2/8, hidden 0");
    expect(contextMarkdown).toContain("selector: tests-source-for-owned-source");

    const sessionStart = await runInCwd(cwd, ["hook", "codex", "SessionStart"]);
    expect(sessionStart).toMatchObject({ code: 0 });
    expect(JSON.parse(sessionStart.stdout)).toMatchObject({
      event: "SessionStart",
      decision: "allow",
      status: "ok",
      enforced: false,
    });
    const hook = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({ tool: "Read", filePath: "src/index.ts" }),
    });
    expect(hook).toMatchObject({ code: 0 });
    expect(JSON.parse(hook.stdout)).toMatchObject({
      event: "PreToolUse",
      decision: "allow",
      status: "ok",
      enforced: false,
    });
    const outOfScopeHook = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({ toolName: "Write", filePath: "src/out-of-scope.ts" }),
    });
    expect(outOfScopeHook).toMatchObject({ code: 0 });
    expect(JSON.parse(outOfScopeHook.stdout)).toMatchObject({
      event: "PreToolUse",
      decision: "block",
      status: "blocked",
      enforced: false,
      findings: [expect.objectContaining({ code: "out-of-scope-edit" })],
    });

    await expect(runInCwd(cwd, ["verify"])).resolves.toMatchObject({ code: 0 });
    const executeVerify = await runInCwd(cwd, ["verify", "--execute"]);
    expect(executeVerify).toMatchObject({ code: 0 });
    expect(executeVerify.stdout).toContain("KRN verify: pass");
    await expect(readJson(cwd, ".krn/current/verify-result.json")).resolves.toMatchObject({
      status: "pass",
      mode: "execute",
      summary: { executedCommands: 1 },
      executedCommands: ["node src/index.test.ts"],
    });
    await expect(runInCwd(cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });
    const doctor = await runInCwd(cwd, ["doctor"]);
    const evalResult = await runInCwd(cwd, ["eval"]);

    expect(doctor).toMatchObject({ code: 0 });
    expect(evalResult).toMatchObject({ code: 0 });
    const handoffMarkdown = await readFile(path.join(cwd, ".krn/current/handoff.md"), "utf8");
    expect(handoffMarkdown).toContain("## Install\n\nStatus: present");
    expect(handoffMarkdown).toContain("Profile: unit");
    expect(handoffMarkdown).toContain("Mode: execute");
    expect(handoffMarkdown).toContain("Commands: total 1, blocked 0, executed 1");
    await expectFile(cwd, "krn.config.json");
    await expectFile(cwd, "AGENTS.md");
    await expectFile(cwd, ".codex/hooks.json");
    await expectFile(cwd, ".agents/skills/krn-harness/SKILL.md");
    await expectFile(cwd, ".krn/current/handoff.md");
    await expectFile(cwd, ".krn/current/doctor-result.json");
    await expectFile(cwd, ".krn/current/eval-result.json");
    await expectFile(cwd, ".krn/current/verify-result.json");
    await expectFile(cwd, ".krn/graph/repo-graph.json");
    await expectFile(cwd, ".krn/traces/trace.jsonl");
    await expectFile(cwd, `.krn/runs/${contract.id}/trace.jsonl`);
    await expectFile(cwd, `.krn/runs/${contract.id}/run.json`);

    const doctorJson = await readJson<{
      checks: Array<{ name: string; status: string; detail: string }>;
    }>(cwd, ".krn/current/doctor-result.json");
    expect(doctorJson.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "downstream-agents", status: "pass" }),
        expect.objectContaining({ name: "downstream-runtime-skill", status: "pass" }),
        expect.objectContaining({ name: "downstream-hooks-template", status: "pass" }),
      ]),
    );

    const evalJson = await readJson<{
      status: string;
      downstream?: { status: string };
    }>(cwd, ".krn/current/eval-result.json");
    expect(evalJson).toMatchObject({
      status: "pass",
      downstream: { status: "pass" },
    });

    expect((await readTraceEvents(cwd)).map((event) => event.name)).toEqual([
      "install.ran",
      "cli.status",
      "task.started",
      "graph.built",
      "context.built",
      "hook.received",
      "hook.received",
      "hook.received",
      "verify.ran",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
    ]);
    expect((await readRunTraceEvents(cwd, contract.id)).map((event) => event.name)).toEqual([
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
    ]);
  });

  it("handles Codex hook events with deterministic trace output", async () => {
    const result = await runInTemp(["hook", "codex", "SessionStart"]);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      provider: "codex",
      event: "SessionStart",
      supported: true,
      status: "ok",
      decision: "allow",
      enforced: false,
      payloadSource: "placeholder",
      findings: [],
      detail: "P0 hook guardrails passed; hooks remain guardrails and trace points, not a sandbox",
      operatorMessageVersion: "hook-operator-message-v1",
      userFacingMessage: {
        en: "Hook guardrails passed. Continue.",
        pl: "Guardrails hooka przeszły. Możesz kontynuować.",
      },
      remediationCodes: [],
      remediationHints: [],
    });

    for (const event of supportedP0CodexHookEvents) {
      const supported = await runInCwd(result.cwd, ["hook", "codex", event]);
      expect(supported.code).toBe(0);
      expect(JSON.parse(supported.stdout)).toMatchObject({
        provider: "codex",
        event,
        supported: true,
        decision: expect.any(String),
        enforced: false,
        payloadSource: "placeholder",
        findings: expect.any(Array),
        operatorMessageVersion: "hook-operator-message-v1",
        userFacingMessage: expect.objectContaining({
          en: expect.any(String),
          pl: expect.any(String),
        }),
        remediationCodes: expect.any(Array),
        remediationHints: expect.any(Array),
      });
    }

    const unknown = await runInCwd(result.cwd, ["hook", "codex", "UnknownEvent"]);
    expect(unknown.code).toBe(0);
    expect(JSON.parse(unknown.stdout)).toMatchObject({
      provider: "codex",
      event: "UnknownEvent",
      supported: false,
      status: "ignored",
      decision: "allow",
      enforced: false,
      payloadSource: "placeholder",
      findings: [],
      operatorMessageVersion: "hook-operator-message-v1",
      remediationCodes: [],
    });

    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          provider: "codex",
          event: "SessionStart",
          supported: true,
          status: "ok",
          decision: "allow",
          enforced: false,
          payloadSource: "placeholder",
          detail:
            "P0 hook guardrails passed; hooks remain guardrails and trace points, not a sandbox",
          findingCodes: [],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: [],
          tracePayloadMode: "full",
        },
      },
      ...supportedP0CodexHookEvents.map((event) => ({
        name: "hook.received",
        data: {
          provider: "codex",
          event,
          supported: true,
          status: expect.any(String),
          decision: expect.any(String),
          enforced: false,
          payloadSource: "placeholder",
          findingCodes: expect.any(Array),
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: expect.any(Array),
          tracePayloadMode: "full",
        },
      })),
      {
        name: "hook.received",
        data: {
          provider: "codex",
          event: "UnknownEvent",
          supported: false,
          status: "ignored",
          decision: "allow",
          enforced: false,
          payloadSource: "placeholder",
          detail: "Unsupported Codex hook event ignored by P0 hook guardrail",
          findingCodes: [],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: [],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("warns on missing current-state guardrails for hook events without edit payloads", async () => {
    const result = await runInTemp(["hook", "codex", "PreToolUse"]);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      provider: "codex",
      event: "PreToolUse",
      supported: true,
      status: "warn",
      decision: "warn",
      enforced: false,
      findings: [
        expect.objectContaining({ code: "missing-task-contract", severity: "warn" }),
        expect.objectContaining({ code: "missing-context-package", severity: "warn" }),
      ],
      userFacingMessage: {
        en: 'Current task and context are missing. Run `krn start "<task>"`, then run `krn context`.',
        pl: 'Brakuje aktualnego zadania i kontekstu. Uruchom `krn start "<zadanie>"`, potem `krn context`.',
      },
      remediationCodes: ["run-krn-start", "run-krn-context"],
    });

    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "warn",
          decision: "warn",
          enforced: false,
          findingCodes: ["missing-task-contract", "missing-context-package"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-start", "run-krn-context"],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("blocks missing current-state guardrails for edit hook payloads", async () => {
    const result = await runInTemp(["hook", "codex", "PreToolUse"]);
    const blocked = await runInCwd(result.cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        tool: "apply_patch",
        arguments: {
          patch: "*** Begin Patch\n*** Update File: src/in-scope.ts\n@@\n+test\n*** End Patch\n",
        },
      }),
    });

    expect(blocked.code).toBe(0);
    expect(JSON.parse(blocked.stdout)).toMatchObject({
      status: "blocked",
      decision: "block",
      payloadSource: "stdin-json",
      findings: [
        expect.objectContaining({ code: "missing-task-contract", severity: "block" }),
        expect.objectContaining({ code: "missing-context-package", severity: "block" }),
      ],
      remediationCodes: ["run-krn-start", "run-krn-context"],
    });
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      { name: "hook.received" },
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "blocked",
          decision: "block",
          payloadSource: "stdin-json",
          findingCodes: ["missing-task-contract", "missing-context-package"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-start", "run-krn-context"],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("records out-of-scope edit guardrail decisions from stdin payload", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      '{"id":"task-hook","task":"Edit scoped file"}\n',
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          taskId: "task-hook",
          items: [],
          buckets: {
            mustRead: [
              {
                path: "src/in-scope.ts",
                reason: "In scope",
                priority: 10,
                bucket: "must-read",
                status: "available",
              },
            ],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 1, present: 1, missing: 0, confidence: "high" },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        tool: "apply_patch",
        arguments: {
          patch:
            "*** Begin Patch\n*** Update File: src/out-of-scope.ts\n@@\n+test\n*** End Patch\n",
        },
      }),
    });

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: "blocked",
      decision: "block",
      payloadSource: "stdin-json",
      findings: [
        expect.objectContaining({
          code: "out-of-scope-edit",
          path: "src/out-of-scope.ts",
        }),
      ],
      userFacingMessage: {
        en: "Blocked: this edit is outside the current context. Run `krn context` or add this path to the task scope.",
        pl: "Zablokowano: ta zmiana jest poza aktualnym kontekstem. Uruchom `krn context` albo dodaj tę ścieżkę do zakresu zadania.",
      },
      remediationCodes: ["run-krn-context", "scope-path"],
    });
    const traceEvents = await readTraceEvents(cwd);
    expect(traceEvents).toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "blocked",
          decision: "block",
          payloadSource: "stdin-json",
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "full",
        },
      },
    ]);
    expect(traceEvents[0]?.data).not.toHaveProperty("userFacingMessage");
    expect(traceEvents[0]?.data).not.toHaveProperty("remediationHints");
  });

  it("records task-owned proof path hints for hook guardrail decisions", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      '{"id":"task-hook","task":"Harden hook guardrail ownership hints"}\n',
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          taskId: "task-hook",
          items: [],
          buckets: {
            mustRead: [
              {
                path: "src/in-scope.ts",
                reason: "In scope",
                priority: 10,
                bucket: "must-read",
                status: "available",
              },
            ],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 1, present: 1, missing: 0, confidence: "high" },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const owned = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        toolName: "Write",
        filePath: "docs/specs/hooks-pack.md",
      }),
    });
    const unowned = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        toolName: "Write",
        filePath: "docs/unowned-proof.md",
      }),
    });

    expect(owned.code).toBe(0);
    expect(JSON.parse(owned.stdout)).toMatchObject({
      status: "warn",
      decision: "warn",
      ownershipModel: "task-context-owned-proof-paths-v1",
      ownedProofPathHintLimit: 4,
      tracePayloadByteLimit: 1024,
      ownedProofPathHints: ["docs/specs/hooks-pack.md"],
      findings: [
        expect.objectContaining({
          code: "proof-path-exception",
          path: "docs/specs/hooks-pack.md",
          ownershipHint: "docs/specs/hooks-pack.md",
        }),
      ],
      userFacingMessage: {
        en: "Warning: allowed as an owned proof path. Review it before handoff.",
        pl: "Ostrzeżenie: dozwolone jako owned proof path. Sprawdź to przed handoffem.",
      },
      remediationCodes: ["review-owned-proof-path"],
    });
    expect(unowned.code).toBe(0);
    expect(JSON.parse(unowned.stdout)).toMatchObject({
      status: "blocked",
      decision: "block",
      findings: [
        expect.objectContaining({
          code: "out-of-scope-edit",
          path: "docs/unowned-proof.md",
        }),
      ],
    });
    await expect(readTraceEvents(cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "warn",
          decision: "warn",
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: ["docs/specs/hooks-pack.md"],
          findingCodes: ["proof-path-exception"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["review-owned-proof-path"],
          tracePayloadMode: "full",
        },
      },
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "blocked",
          decision: "block",
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: [],
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("records non-hook package-owned proof path hints from current context", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      '{"id":"task-config","task":"Harden config loading behavior"}\n',
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          taskId: "task-config",
          items: [],
          buckets: {
            mustRead: [
              {
                path: "packages/config/src/load-config.ts",
                reason: "Config package source",
                priority: 10,
                bucket: "must-read",
                status: "available",
              },
            ],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 1, present: 1, missing: 0, confidence: "high" },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const owned = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        toolName: "Write",
        filePath: "packages/config/src/load-config.test.ts",
      }),
    });
    const crossPackage = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        toolName: "Write",
        filePath: "packages/context/src/build-context-package.test.ts",
      }),
    });

    expect(owned.code).toBe(0);
    expect(JSON.parse(owned.stdout)).toMatchObject({
      status: "warn",
      decision: "warn",
      ownershipModel: "task-context-owned-proof-paths-v1",
      ownedProofPathHintLimit: 4,
      tracePayloadByteLimit: 1024,
      ownedProofPathHints: ["packages/config"],
      findings: [
        expect.objectContaining({
          code: "proof-path-exception",
          path: "packages/config/src/load-config.test.ts",
          ownershipHint: "packages/config",
        }),
      ],
      remediationCodes: ["review-owned-proof-path"],
    });
    expect(crossPackage.code).toBe(0);
    expect(JSON.parse(crossPackage.stdout)).toMatchObject({
      status: "blocked",
      decision: "block",
      findings: [
        expect.objectContaining({
          code: "out-of-scope-edit",
          path: "packages/context/src/build-context-package.test.ts",
        }),
      ],
    });
    await expect(readTraceEvents(cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "warn",
          decision: "warn",
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: ["packages/config"],
          findingCodes: ["proof-path-exception"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["review-owned-proof-path"],
          tracePayloadMode: "full",
        },
      },
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "blocked",
          decision: "block",
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: [],
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("runs the manual governed memory workflow without auto-approval", async () => {
    const proposed = await runInTemp([
      "memory",
      "propose",
      "Prefer",
      "manual",
      "memory",
      "--evidence",
      "docs/specs/memory.schema.md",
    ]);

    expect(proposed.code).toBe(0);
    expect(proposed.stdout).toContain("KRN memory: proposed");
    expect(proposed.stdout).toContain("status: pending");
    expect(proposed.stdout).toContain("store: .krn/memory/pending.json");

    const pendingStore = await readJson<{
      status: string;
      records: Array<{ id: string; status: string; summary: string; evidencePath?: string }>;
    }>(proposed.cwd, ".krn/memory/pending.json");
    const approvedStoreAfterPropose = await readJson<{
      status: string;
      records: Array<{ id: string }>;
    }>(proposed.cwd, ".krn/memory/approved.json");
    const memoryId = pendingStore.records[0]?.id ?? "";

    expect(pendingStore).toMatchObject({
      status: "pending",
      records: [
        {
          id: memoryId,
          status: "pending",
          summary: "Prefer manual memory",
          evidencePath: "docs/specs/memory.schema.md",
        },
      ],
    });
    expect(approvedStoreAfterPropose).toMatchObject({
      status: "approved",
      records: [],
    });

    const approved = await runInCwd(proposed.cwd, ["memory", "approve", memoryId]);

    expect(approved.code).toBe(0);
    expect(approved.stdout).toContain("KRN memory: approved");
    expect(approved.stdout).toContain("store: .krn/memory/approved.json");
    await expect(readJson(proposed.cwd, ".krn/memory/pending.json")).resolves.toMatchObject({
      records: [],
    });
    await expect(readJson(proposed.cwd, ".krn/memory/approved.json")).resolves.toMatchObject({
      records: [
        {
          id: memoryId,
          status: "approved",
          approvedAt: "2026-06-03T00:00:00.000Z",
        },
      ],
    });

    const deprecated = await runInCwd(proposed.cwd, [
      "memory",
      "deprecate",
      memoryId,
      "superseded",
      "by",
      "canon",
    ]);

    expect(deprecated.code).toBe(0);
    expect(deprecated.stdout).toContain("KRN memory: deprecated");
    expect(deprecated.stdout).toContain("reason: superseded by canon");
    await expect(readJson(proposed.cwd, ".krn/memory/approved.json")).resolves.toMatchObject({
      records: [],
    });
    await expect(readJson(proposed.cwd, ".krn/memory/deprecated.json")).resolves.toMatchObject({
      records: [
        {
          id: memoryId,
          status: "deprecated",
          deprecationReason: "superseded by canon",
        },
      ],
    });

    const listed = await runInCwd(proposed.cwd, ["memory", "list"]);

    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain("pending: 0");
    expect(listed.stdout).toContain("approved: 0");
    expect(listed.stdout).toContain("deprecated: 1");
    expect(listed.stdout).toContain(`- deprecated ${memoryId}: Prefer manual memory`);

    await expect(readTraceEvents(proposed.cwd)).resolves.toMatchObject([
      {
        name: "memory.proposed",
        data: {
          id: memoryId,
          status: "pending",
          evidencePath: "docs/specs/memory.schema.md",
          pending: 1,
          approved: 0,
          deprecated: 0,
        },
      },
      {
        name: "memory.approved",
        data: {
          id: memoryId,
          status: "approved",
          pending: 0,
          approved: 1,
          deprecated: 0,
        },
      },
      {
        name: "memory.deprecated",
        data: {
          id: memoryId,
          status: "deprecated",
          reason: "superseded by canon",
          pending: 0,
          approved: 0,
          deprecated: 1,
        },
      },
      {
        name: "memory.listed",
        data: {
          pending: 0,
          approved: 0,
          deprecated: 1,
        },
      },
    ]);
  });

  it("reports missing memory records without crashing", async () => {
    const approved = await runInTemp(["memory", "approve", "memory-missing"]);
    const deprecated = await runInCwd(approved.cwd, ["memory", "deprecate", "memory-missing"]);

    expect(approved.code).toBe(1);
    expect(approved.stderr).toContain("KRN memory approve: memory not found: memory-missing");
    expect(deprecated.code).toBe(1);
    expect(deprecated.stderr).toContain("KRN memory deprecate: memory not found: memory-missing");
  });

  it("surfaces approved memory in context only after manual approval", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Graph",
      "selector",
      "should",
      "stay",
      "generic",
      "--evidence",
      "docs/specs/graph-lite.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{
      records: Array<{ id: string }>;
    }>(cwd, ".krn/memory/pending.json");
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["start", "Harden", "graph", "selector"])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const contextBeforeApproval = await readJson<{
      buckets: { referenceOnly: Array<{ source?: string; memoryId?: string }> };
    }>(cwd, ".krn/current/context-package.json");
    expect(
      contextBeforeApproval.buckets.referenceOnly.some((item) => item.source === "memory"),
    ).toBe(false);

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const contextAfterApproval = await readJson<{
      buckets: {
        mustRead: Array<{ memoryId?: string }>;
        shouldRead: Array<{ memoryId?: string }>;
        referenceOnly: Array<{
          path: string;
          source?: string;
          selector?: string;
          memoryId?: string;
          approvedAt?: string;
          evidencePath?: string;
          matchedTerms?: string[];
        }>;
      };
    }>(cwd, ".krn/current/context-package.json");
    const markdown = await readFile(path.join(cwd, ".krn/current/context-package.md"), "utf8");

    expect(contextAfterApproval.buckets.mustRead.some((item) => item.memoryId === memoryId)).toBe(
      false,
    );
    expect(contextAfterApproval.buckets.shouldRead.some((item) => item.memoryId === memoryId)).toBe(
      false,
    );
    expect(contextAfterApproval.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: `.krn/memory/approved.json#${memoryId}`,
        source: "memory",
        selector: "approved-memory-task-match",
        memoryId,
        approvedAt: "2026-06-03T00:00:00.000Z",
        evidencePath: "docs/specs/graph-lite.md",
        matchedTerms: ["graph", "selector"],
      }),
    );
    expect(markdown).toContain(`.krn/memory/approved.json#${memoryId}`);
    expect(markdown).toContain("source: memory, selector: approved-memory-task-match");
  });

  it("honors memory opt-out when building current context from approved memory", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Graph",
      "selector",
      "should",
      "stay",
      "generic",
      "--evidence",
      "docs/specs/graph-lite.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{ records: Array<{ id: string }> }>(
      cwd,
      ".krn/memory/pending.json",
    );
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(
      runInCwd(cwd, [
        "start",
        "Harden",
        "graph",
        "selector",
        "behavior",
        "without",
        "approved",
        "memory",
      ]),
    ).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const context = await readJson<{
      items: Array<{ source?: string; memoryId?: string }>;
      buckets: { referenceOnly: Array<{ source?: string; memoryId?: string }> };
    }>(cwd, ".krn/current/context-package.json");

    expect(context.items.some((item) => item.source === "memory")).toBe(false);
    expect(context.buckets.referenceOnly.some((item) => item.memoryId === memoryId)).toBe(false);
  });

  it("honors Polish memory opt-out when building current context from approved memory", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Graph",
      "selector",
      "should",
      "stay",
      "generic",
      "--evidence",
      "docs/specs/graph-lite.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{ records: Array<{ id: string }> }>(
      cwd,
      ".krn/memory/pending.json",
    );
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(
      runInCwd(cwd, ["start", "Harden", "graph", "selector", "behavior", "bez", "pamięci"]),
    ).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const context = await readJson<{
      items: Array<{ source?: string; memoryId?: string }>;
      buckets: { referenceOnly: Array<{ source?: string; memoryId?: string }> };
    }>(cwd, ".krn/current/context-package.json");

    expect(context.items.some((item) => item.source === "memory")).toBe(false);
    expect(context.buckets.referenceOnly.some((item) => item.memoryId === memoryId)).toBe(false);
  });

  it("surfaces approved memory for explicit Polish memory request through the CLI", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Prefer",
      "short",
      "handoff",
      "summaries",
      "--evidence",
      "docs/specs/handoff.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{ records: Array<{ id: string }> }>(
      cwd,
      ".krn/memory/pending.json",
    );
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(
      runInCwd(cwd, ["start", "Użyj", "zatwierdzonej", "pamięci", "do", "tego", "zadania"]),
    ).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const context = await readJson<{
      buckets: {
        referenceOnly: Array<{
          source?: string;
          selector?: string;
          memoryId?: string;
          evidencePath?: string;
        }>;
      };
    }>(cwd, ".krn/current/context-package.json");

    expect(context.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        source: "memory",
        selector: "approved-memory-explicit",
        memoryId,
        evidencePath: "docs/specs/handoff.md",
      }),
    );
  });

  it("runs start and context with task trace behavior", async () => {
    const result = await runInTemp(["start", "Implement", "a", "slice"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN start: task accepted");

    const context = await runCli(["context"], {
      cwd: result.cwd,
      stdout: (text) => {
        result.stdout += text;
      },
      stderr: (text) => {
        result.stderr += text;
      },
      now: () => new Date("2026-06-03T00:00:00.000Z"),
    });

    expect(context).toBe(0);
    expect(result.stdout).toContain("KRN context: package written");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      { name: "task.started" },
      { name: "context.built" },
    ]);
  });

  it("writes run-scoped trace and run metadata for the current loop", async () => {
    const start = await runInTemp(["start", "goal", "run", "trace", "task"]);
    expect(start.code).toBe(0);

    const contract = await readJson<{ id: string }>(start.cwd, ".krn/current/task-contract.json");
    await expect(runInCwd(start.cwd, ["graph"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["verify"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["doctor"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["eval"])).resolves.toMatchObject({ code: 0 });

    const expectedNames = [
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
    ];
    const globalEvents = await readTraceEvents(start.cwd);
    const runEvents = await readRunTraceEvents(start.cwd, contract.id);
    const runMetadata = await readJson<{
      schemaVersion: number;
      taskId: string;
      startedAt: string;
      lastEventAt: string;
      current: boolean;
      events: Array<{ name: string; timestamp: string }>;
      artifactPaths: Record<string, string>;
    }>(start.cwd, `.krn/runs/${contract.id}/run.json`);
    const runSummary = await readFile(
      path.join(start.cwd, ".krn", "runs", contract.id, "summary.md"),
      "utf8",
    );
    const currentRun = await readJson<{
      schemaVersion: number;
      taskId: string;
      runDir: string;
      tracePath: string;
      graphArtifactPath: string;
    }>(start.cwd, ".krn/current/run.json");

    expect(globalEvents.map((event) => event.name)).toEqual(expectedNames);
    expect(runEvents.map((event) => event.name)).toEqual(expectedNames);
    expect(runEvents.every((event) => event.taskId === contract.id)).toBe(true);
    expect(runMetadata).toMatchObject({
      schemaVersion: 1,
      taskId: contract.id,
      startedAt: "2026-06-03T00:00:00.000Z",
      lastEventAt: "2026-06-03T00:00:00.000Z",
      current: true,
      artifactPaths: {
        globalTrace: ".krn/traces/trace.jsonl",
        graphJson: ".krn/graph/repo-graph.json",
        runSummary: `.krn/runs/${contract.id}/summary.md`,
        runTrace: `.krn/runs/${contract.id}/trace.jsonl`,
        taskContractJson: ".krn/current/task-contract.json",
      },
    });
    expect(runMetadata.events.map((event) => event.name)).toEqual(expectedNames);
    expect(runSummary).toContain("# KRN Run Summary");
    expect(runSummary).toContain(`Task ID: ${contract.id}`);
    expect(runSummary).toContain("Event count: 7");
    expect(runSummary).toContain("Last event: eval.ran");
    expect(runSummary).toContain("This is local evidence only.");
    expect(currentRun).toMatchObject({
      schemaVersion: 1,
      taskId: contract.id,
      runDir: `.krn/runs/${contract.id}`,
      tracePath: `.krn/runs/${contract.id}/trace.jsonl`,
      graphArtifactPath: ".krn/graph/repo-graph.json",
    });
  });

  it("writes deterministic task-contract current artifacts", async () => {
    const result = await runInTemp(["start", "goal", "2", "smoke", "task"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("task_id: task-1354ea37dd50");

    const contract = await readJson<Record<string, unknown>>(
      result.cwd,
      ".krn/current/task-contract.json",
    );
    const markdown = await readFile(path.join(result.cwd, ".krn/current/task-contract.md"), "utf8");

    expect(contract).toMatchObject({
      id: "task-1354ea37dd50",
      rawUserIntent: "goal 2 smoke task",
      task: "goal 2 smoke task",
      intentQuality: "medium",
      intentWarnings: ["Task intent is very short."],
      classification: "implementation",
      mode: "edit",
      nonTrivial: true,
      stop: false,
    });
    expect(contract.evidenceRequirements).toEqual([
      "current task contract",
      "current context package",
      "trace event for task start",
      "validation command output or explicit reason it could not run",
    ]);
    expect(markdown).toContain("## Raw User Intent");
    expect(markdown).toContain("Intent quality: medium");
    expect(markdown).toContain("## Intent Warnings");
    expect(markdown).toContain("## Evidence Requirements");
    expect(markdown).toContain("## Stop Conditions");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "task.started",
        taskId: "task-1354ea37dd50",
        data: {
          classification: "implementation",
          intentQuality: "medium",
        },
      },
    ]);
  });

  it("warns but accepts a slug-like start task", async () => {
    const result = await runInTemp(["start", "wp-acf-field-mapping"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("intent_quality: low");
    expect(result.stderr).toContain("KRN start warning:");

    const contract = await readJson<Record<string, unknown>>(
      result.cwd,
      ".krn/current/task-contract.json",
    );

    expect(contract).toMatchObject({
      task: "wp-acf-field-mapping",
      intentQuality: "low",
    });
    expect(contract.intentWarnings).toEqual(
      expect.arrayContaining([
        "Task intent looks like a slug or task id; pass the full user intent to krn start.",
      ]),
    );
  });

  it("starts from a local dogfood task spec", async () => {
    const cwd = await copyFixtureRepo("wordpress-acf-theme");
    await mkdir(path.join(cwd, "fixtures", "dogfood", "tasks"), { recursive: true });
    await writeFile(
      path.join(cwd, "fixtures", "dogfood", "tasks", "wp-acf-field-mapping.json"),
      JSON.stringify(
        {
          prompt:
            "Update the active hero ACF field mapping and paired static proof without using legacy ACF notes.",
          expectedTouchedFiles: ["acf/group_hero.json", "tests/theme.test.js"],
          forbiddenTouchedFiles: ["acf/legacy_group.json", "docs/stale-acf-notes.md"],
          requiredDoNotUsePaths: ["acf/legacy_group.json", "docs/stale-acf-notes.md"],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runInCwd(cwd, [
      "start",
      "--task-spec",
      "fixtures/dogfood/tasks/wp-acf-field-mapping.json",
    ]);

    expect(result.code).toBe(0);
    const contract = await readJson<Record<string, unknown>>(
      cwd,
      ".krn/current/task-contract.json",
    );
    const markdown = await readFile(path.join(cwd, ".krn/current/task-contract.md"), "utf8");

    expect(contract).toMatchObject({
      task: "Update the active hero ACF field mapping and paired static proof without using legacy ACF notes.",
      metadata: {
        taskSpecPath: "fixtures/dogfood/tasks/wp-acf-field-mapping.json",
        expectedTouchedFiles: ["acf/group_hero.json", "tests/theme.test.js"],
        forbiddenTouchedFiles: ["acf/legacy_group.json", "docs/stale-acf-notes.md"],
        requiredDoNotUsePaths: ["acf/legacy_group.json", "docs/stale-acf-notes.md"],
      },
    });
    expect(markdown).toContain("## Metadata");
    expect(markdown).toContain("Task spec path: fixtures/dogfood/tasks/wp-acf-field-mapping.json");
  });

  it("rejects task spec symlinks that resolve outside the repository", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const externalDir = await mkdtemp(path.join(os.tmpdir(), "krn-harness-external-"));
    await writeFile(
      path.join(externalDir, "task.json"),
      `${JSON.stringify({ prompt: "outside" })}\n`,
      "utf8",
    );
    await symlink(path.join(externalDir, "task.json"), path.join(cwd, "task-link.json"));

    const result = await runInCwd(cwd, ["start", "--task-spec", "task-link.json"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--task-spec must resolve inside the current repository");
  });

  it("rejects malformed task spec metadata before rendering artifacts", async () => {
    const cwd = await copyFixtureRepo("wordpress-acf-theme");
    await mkdir(path.join(cwd, "fixtures", "dogfood", "tasks"), { recursive: true });
    await writeFile(
      path.join(cwd, "fixtures", "dogfood", "tasks", "bad-task-spec.json"),
      JSON.stringify({
        prompt: "Update active ACF mapping.",
        expectedTouchedFiles: "acf/group_hero.json",
      }),
      "utf8",
    );

    const result = await runInCwd(cwd, [
      "start",
      "--task-spec",
      "fixtures/dogfood/tasks/bad-task-spec.json",
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      "--task-spec JSON expectedTouchedFiles must be an array of non-empty strings",
    );
  });

  it("writes STOP context-package current artifacts", async () => {
    const result = await runInTemp([
      "start",
      "Stop",
      "when",
      "required",
      "context",
      "is",
      "missing",
    ]);
    expect(result.code).toBe(0);

    const contextCode = await runCli(["context"], {
      cwd: result.cwd,
      stdout: (text) => {
        result.stdout += text;
      },
      stderr: (text) => {
        result.stderr += text;
      },
      now: () => new Date("2026-06-03T00:00:00.000Z"),
    });

    expect(contextCode).toBe(0);
    expect(result.stdout).toContain("stop: true");

    const pkg = await readJson<{
      stop: boolean;
      stopReason: string;
      buckets: {
        missingContext: Array<{ path: string }>;
        doNotUse: Array<{ path: string }>;
      };
    }>(result.cwd, ".krn/current/context-package.json");
    const markdown = await readFile(
      path.join(result.cwd, ".krn/current/context-package.md"),
      "utf8",
    );

    expect(pkg.stop).toBe(true);
    expect(pkg.stopReason).toBe("Required context is missing: docs/required-context.md");
    expect(pkg.buckets.missingContext).toEqual([
      {
        path: "docs/required-context.md",
        reason: "Required context is absent",
        priority: 100,
        bucket: "missing-context",
        status: "missing",
        source: "task-policy",
        selector: "missing-context-policy",
      },
    ]);
    expect(markdown).toContain("## Missing Context");
    expect(markdown).toContain("STOP: true");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      { name: "task.started" },
      {
        name: "context.built",
        taskId: "task-739518f3ddd0",
        data: {
          stop: true,
        },
      },
    ]);
  });

  it("writes verify and handoff artifacts with full trace order", async () => {
    const start = await runInTemp(["start", "goal", "3", "smoke", "task"]);
    expect(start.code).toBe(0);

    await expect(runInCwd(start.cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    const verify = await runInCwd(start.cwd, ["verify"]);
    expect(verify).toMatchObject({ code: 0 });
    expect(verify.stdout).toContain("KRN verify: not-runnable");

    const handoff = await runInCwd(start.cwd, ["handoff"]);
    expect(handoff).toMatchObject({ code: 0 });
    expect(handoff.stdout).toContain("KRN handoff: ready");

    const verifyResult = await readJson<{
      schemaVersion: number;
      status: string;
      profileName: string;
      mode: string;
      taskId: string;
      summary: {
        totalCommands: number;
        allowedCommands: number;
        blockedCommands: number;
        executedCommands: number;
      };
      contextStop: boolean;
      graphArtifactPresent: boolean;
      currentRunTracePresent: boolean;
      configuredCommands: string[];
      executedCommands: string[];
      notRunnableReason: string;
    }>(start.cwd, ".krn/current/verify-result.json");
    const verifyMarkdown = await readFile(
      path.join(start.cwd, ".krn/current/verify-result.md"),
      "utf8",
    );
    const handoffMarkdown = await readFile(path.join(start.cwd, ".krn/current/handoff.md"), "utf8");

    expect(verifyResult).toEqual({
      schemaVersion: 1,
      generatedAt: "2026-06-03T00:00:00.000Z",
      profileName: "generic",
      profile: "generic",
      mode: "record-only",
      status: "not-runnable",
      summary: {
        totalCommands: 0,
        allowedCommands: 0,
        blockedCommands: 0,
        executedCommands: 0,
      },
      configSource: "default",
      limits: {
        timeoutMs: 120000,
        maxOutputBytes: 12000,
      },
      taskId: "task-d62ea4fbc009",
      contextStop: false,
      graphArtifactPresent: false,
      currentRunTracePresent: true,
      commands: [],
      configuredCommands: [],
      executedCommands: [],
      notRunnableReason: "No verify commands are configured",
      checks: [
        {
          name: "verify-profile",
          status: "pass",
          detail: "Profile generic resolved in record-only mode",
        },
        {
          name: "configured-commands",
          status: "warn",
          detail: "No verify commands are configured",
        },
        {
          name: "graph-artifact",
          status: "warn",
          detail: ".krn/graph/repo-graph.json is missing",
        },
        {
          name: "current-run-trace",
          status: "pass",
          detail: "Current run trace is present",
        },
      ],
    });
    expect(verifyMarkdown).toContain("Status: not-runnable");
    expect(handoffMarkdown).toContain("Task ID: task-d62ea4fbc009");
    expect(handoffMarkdown).toContain("Context STOP: false");
    expect(handoffMarkdown).toContain("Status: not-runnable");
    expect(handoffMarkdown).toContain("Profile: generic");
    expect(handoffMarkdown).toContain("Mode: record-only");
    expect(handoffMarkdown).toContain("Commands: total 0, blocked 0, executed 0");
    expect(handoffMarkdown).toContain("## Graph");
    expect(handoffMarkdown).toContain("Nodes: missing");
    expect(handoffMarkdown).toContain("Current run trace: .krn/runs/task-d62ea4fbc009/trace.jsonl");
    expect(handoffMarkdown).toContain("Global trace: .krn/traces/trace.jsonl");
    expect(handoffMarkdown).toContain("## Install\n\nStatus: missing");
    expect(handoffMarkdown).toContain("## Artifact Pointers");
    expect(handoffMarkdown).toContain("- Task contract: .krn/current/task-contract.json");

    await expect(readTraceEvents(start.cwd)).resolves.toMatchObject([
      { name: "task.started", taskId: "task-d62ea4fbc009" },
      { name: "context.built", taskId: "task-d62ea4fbc009", data: { stop: false } },
      {
        name: "verify.ran",
        taskId: "task-d62ea4fbc009",
        data: {
          profileName: "generic",
          mode: "record-only",
          status: "not-runnable",
          contextStop: false,
          graphArtifactPresent: false,
          currentRunTracePresent: true,
          totalCommands: 0,
          allowedCommands: 0,
          blockedCommands: 0,
          executedCommands: 0,
        },
      },
      {
        name: "handoff.created",
        taskId: "task-d62ea4fbc009",
        data: { contextStop: false, verifyStatus: "not-runnable" },
      },
    ]);
  });

  it("resolves named verify profiles from krn.config.json without executing commands", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(
      path.join(cwd, "krn.config.json"),
      `${JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "quality",
            profiles: {
              quality: {
                commands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
                timeoutMs: 30000,
                maxOutputBytes: 4096,
              },
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await expect(runInCwd(cwd, ["start", "verify", "profile", "task"])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    const verify = await runInCwd(cwd, ["verify", "--profile", "quality"]);

    expect(verify).toMatchObject({ code: 0 });
    expect(verify.stdout).toContain("KRN verify: warn");
    expect(verify.stdout).toContain("profile: quality");
    expect(verify.stdout).toContain("mode: record-only");
    expect(verify.stdout).toContain("commands: 3");

    const result = await readJson<{
      profileName: string;
      status: string;
      summary: { totalCommands: number; allowedCommands: number; executedCommands: number };
      limits: { timeoutMs: number; maxOutputBytes: number };
      configuredCommands: string[];
      executedCommands: string[];
    }>(cwd, ".krn/current/verify-result.json");

    expect(result).toMatchObject({
      profileName: "quality",
      status: "warn",
      summary: {
        totalCommands: 3,
        allowedCommands: 3,
        executedCommands: 0,
      },
      limits: {
        timeoutMs: 30000,
        maxOutputBytes: 4096,
      },
      configuredCommands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
      executedCommands: [],
    });

    const missingProfile = await runInCwd(cwd, ["verify", "--profile", "missing"]);
    expect(missingProfile).toMatchObject({ code: 0 });
    expect(missingProfile.stdout).toContain("KRN verify: blocked");
    await expect(readJson(cwd, ".krn/current/verify-result.json")).resolves.toMatchObject({
      profileName: "missing",
      status: "blocked",
      notRunnableReason: "Unknown verify profile: missing",
    });
  });

  it("runs allowlisted verify commands only when execute mode is explicit", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "pass.cjs"), 'process.stdout.write("cli-pass\\n");\n', "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      `${JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "unit",
            mode: "execute",
            profiles: {
              unit: {
                commands: [{ command: "node", args: ["pass.cjs"], label: "unit smoke" }],
                timeoutMs: 5000,
                maxOutputBytes: 100,
              },
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await expect(runInCwd(cwd, ["start", "execute", "verify", "task"])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const recordOnly = await runInCwd(cwd, ["verify", "--profile", "unit"]);
    expect(recordOnly.stdout).toContain("KRN verify: warn");
    expect(recordOnly.stdout).toContain("mode: record-only");
    expect(recordOnly.stdout).toContain("executed: 0");

    const executed = await runInCwd(cwd, ["verify", "--profile", "unit", "--execute"]);
    expect(executed).toMatchObject({ code: 0 });
    expect(executed.stdout).toContain("KRN verify: pass");
    expect(executed.stdout).toContain("mode: execute");
    expect(executed.stdout).toContain("executed: 1");

    const result = await readJson<{
      status: string;
      mode: string;
      summary: { executedCommands: number };
      executedCommands: string[];
      commands: Array<{ status: string; exitCode: number; stdoutTail: string }>;
    }>(cwd, ".krn/current/verify-result.json");
    expect(result).toMatchObject({
      status: "pass",
      mode: "execute",
      summary: { executedCommands: 1 },
      executedCommands: ["node pass.cjs"],
      commands: [{ status: "passed", exitCode: 0, stdoutTail: "cli-pass\n" }],
    });

    await expect(readTraceEvents(cwd)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "verify.ran",
          data: expect.objectContaining({
            mode: "execute",
            status: "pass",
            executedCommands: 1,
          }),
        }),
      ]),
    );
  });

  it("writes STOP-aware verify and handoff artifacts", async () => {
    const start = await runInTemp([
      "start",
      "Stop",
      "when",
      "required",
      "context",
      "is",
      "missing",
    ]);
    expect(start.code).toBe(0);

    await expect(runInCwd(start.cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["verify"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });

    const verifyResult = await readJson<{
      status: string;
      taskId: string;
      contextStop: boolean;
      notRunnableReason: string;
    }>(start.cwd, ".krn/current/verify-result.json");
    const handoffMarkdown = await readFile(path.join(start.cwd, ".krn/current/handoff.md"), "utf8");

    expect(verifyResult).toMatchObject({
      status: "blocked",
      taskId: "task-739518f3ddd0",
      contextStop: true,
      notRunnableReason: "Required context is missing: docs/required-context.md",
    });
    expect(handoffMarkdown).toContain("Context STOP: true");
    expect(handoffMarkdown).toContain(
      "STOP reason: Required context is missing: docs/required-context.md",
    );
    expect(handoffMarkdown).toContain("Status: blocked");
  });

  it("writes doctor and eval artifacts with full P0 trace order", async () => {
    const start = await runInTemp(["start", "goal", "4", "smoke", "task"]);
    expect(start.code).toBe(0);

    await expect(runInCwd(start.cwd, ["graph"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["verify"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });

    const doctor = await runInCwd(start.cwd, ["doctor"]);
    expect(doctor).toMatchObject({ code: 0 });
    expect(doctor.stdout).toContain("KRN doctor: warn");

    const evalResult = await runInCwd(start.cwd, ["eval"]);
    expect(evalResult).toMatchObject({ code: 0 });
    expect(evalResult.stdout).toContain("KRN eval: pass");

    const finalHandoff = await runInCwd(start.cwd, ["handoff"]);
    expect(finalHandoff).toMatchObject({ code: 0 });

    const doctorJson = await readJson<{
      status: string;
      checks: Array<{ name: string; status: string }>;
      nextActions: string[];
    }>(start.cwd, ".krn/current/doctor-result.json");
    const verifyJson = await readJson<{
      graphArtifactPresent: boolean;
      currentRunTracePresent: boolean;
    }>(start.cwd, ".krn/current/verify-result.json");
    const doctorMarkdown = await readFile(
      path.join(start.cwd, ".krn/current/doctor-result.md"),
      "utf8",
    );
    const evalJson = await readJson<{
      status: string;
      passCount: number;
      failCount: number;
      fixtures: Array<{ name: string; status: string }>;
      graph: { status: string };
      graphArtifact: { status: string };
      hooks: { status: string };
      memory: { status: string };
      trace: { status: string };
      runTraceMode: string;
    }>(start.cwd, ".krn/current/eval-result.json");
    const evalMarkdown = await readFile(
      path.join(start.cwd, ".krn/current/eval-result.md"),
      "utf8",
    );
    const handoffMarkdown = await readFile(path.join(start.cwd, ".krn/current/handoff.md"), "utf8");

    expect(doctorJson.status).toBe("warn");
    expect(doctorJson.checks.map((check) => check.name)).toEqual([
      "config",
      "verify-config-policy",
      "current-task-contract",
      "current-run",
      "current-context-package",
      "context-stop",
      "current-verify-result",
      "current-handoff",
      "memory-stores",
      "memory-context-gate",
      "graph-json",
      "graph-markdown",
      "graph-json-shape",
      "graph-summary",
      "downstream-agents",
      "downstream-runtime-skill",
      "downstream-hooks-template",
      "adapter-templates",
      "build-time-skills",
      "run-trace",
      "hook-guardrail-trace",
      "global-trace",
    ]);
    expect(doctorMarkdown).toContain("Status: warn");
    expect(doctorJson.nextActions).toEqual([
      "Configure an allowed verify profile or run `krn verify --profile <name>`.",
    ]);
    expect(verifyJson).toMatchObject({
      graphArtifactPresent: true,
      currentRunTracePresent: true,
    });

    expect(evalJson).toMatchObject({
      status: "pass",
      passCount: 19,
      failCount: 0,
      graph: { status: "pass" },
      graphArtifact: { status: "pass" },
      downstream: { status: "pass" },
      verify: { status: "pass" },
      hooks: { status: "pass" },
      memory: { status: "pass" },
      trace: { status: "pass" },
      runTraceMode: "run-scoped",
    });
    expect(evalJson.fixtures.map((fixture) => fixture.name)).toEqual([
      "frontend-section-context",
      "stale-doc-trap",
      "missing-context-stop",
      "downstream-basic-package-context",
    ]);
    expect(evalJson.fixtures.every((fixture) => fixture.status === "pass")).toBe(true);
    expect(evalMarkdown).toContain("### frontend-section-context");
    expect(evalMarkdown).toContain("## Graph Coverage");
    expect(evalMarkdown).toContain("## Downstream Acceptance");
    expect(evalMarkdown).toContain("## Verify Profiles");
    expect(evalMarkdown).toContain("## Hook Guardrails");
    expect(evalMarkdown).toContain("## Memory Governance");
    expect(evalMarkdown).toContain("## Trace Coverage");
    expect(evalMarkdown).toContain("## P0 Limits");
    expect(handoffMarkdown).toContain("## Graph");
    expect(handoffMarkdown).toContain("Status: present");
    expect(handoffMarkdown).toContain("Nodes:");
    expect(handoffMarkdown).toContain("Edges:");
    expect(handoffMarkdown).toContain("Current run trace: .krn/runs/task-a39f90427522/trace.jsonl");
    expect(handoffMarkdown).toContain("## Doctor\n\nStatus: warn");
    expect(handoffMarkdown).toContain("## Eval\n\nStatus: pass");
    expect(handoffMarkdown).toContain("Downstream acceptance: pass");
    expect(handoffMarkdown).toContain("Global trace: .krn/traces/trace.jsonl");
    expect(handoffMarkdown).toContain("## Artifact Pointers");
    expect(handoffMarkdown).toContain("- Task contract: .krn/current/task-contract.json");
    expect(handoffMarkdown).toContain("- Graph JSON: .krn/graph/repo-graph.json");
    expect(handoffMarkdown).toContain("- Eval result: .krn/current/eval-result.json");

    await expect(readTraceEvents(start.cwd)).resolves.toMatchObject([
      { name: "task.started", taskId: "task-a39f90427522" },
      { name: "graph.built", taskId: "task-a39f90427522" },
      { name: "context.built", taskId: "task-a39f90427522" },
      { name: "verify.ran", taskId: "task-a39f90427522" },
      { name: "handoff.created", taskId: "task-a39f90427522" },
      { name: "doctor.ran", data: { status: "warn", checks: 22 } },
      {
        name: "eval.ran",
        data: {
          status: "pass",
          fixtures: 4,
          passCount: 19,
          failCount: 0,
          downstreamStatus: "pass",
          verifyStatus: "pass",
          hookStatus: "pass",
          memoryStatus: "pass",
        },
      },
      {
        name: "handoff.created",
        taskId: "task-a39f90427522",
        data: { contextStop: false, verifyStatus: "not-runnable" },
      },
    ]);
  });
});
