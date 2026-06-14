#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

ROOT="$ROOT" node --input-type=module <<'NODE'
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sourceRoot = process.env.ROOT;

if (!sourceRoot) {
  console.error("KRN real-repo execution report: internal source root resolution failed");
  process.exit(2);
}

const runId =
  process.env.KRN_REAL_REPO_EXECUTION_RUN_ID ??
  `execution-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const targetRepoPath = resolveOptionalPath(process.env.KRN_REAL_REPO_EXECUTION_TARGET_REPO_PATH);
const executionWorktreePath =
  resolveOptionalPath(process.env.KRN_REAL_REPO_EXECUTION_WORKTREE_PATH) ?? targetRepoPath;
const artifactRoot =
  resolveOptionalPath(process.env.KRN_REAL_REPO_EXECUTION_ARTIFACT_ROOT) ??
  executionWorktreePath ??
  sourceRoot;
const reportRoot = path.join(artifactRoot, ".krn", "dogfood", "real-repo-execution", runId);
const summaryJsonPath = path.join(reportRoot, "summary.json");
const summaryMarkdownPath = path.join(reportRoot, "summary.md");

function resolveOptionalPath(value) {
  if (!value) return null;
  return path.resolve(value);
}

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function boolFromEnv(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "pass", "clean"].includes(value.toLowerCase());
}

function numberFromEnv(name) {
  const value = process.env[name];
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function listFromEnv(name, splitCommas = true) {
  const value = process.env[name];
  if (!value) return [];
  return value
    .split(splitCommas ? /[\n,;]+/ : /[\n;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeGitStatusPath(line) {
  const raw = line.slice(3).trim();
  if (raw.includes(" -> ")) {
    return raw.split(" -> ").at(-1)?.trim() ?? raw;
  }
  return raw;
}

function gitChangedFiles(repoPath) {
  if (!repoPath || !fs.existsSync(repoPath)) return [];

  const result = run("git", ["status", "--porcelain"], repoPath);
  if (result.status !== 0) return [];

  return [
    ...new Set(
      result.stdout
        .split("\n")
        .map((line) => line.trimEnd())
        .filter(Boolean)
        .map(normalizeGitStatusPath)
        .filter((filePath) => filePath && !filePath.startsWith(".krn/")),
    ),
  ].sort();
}

function gitClean(repoPath) {
  if (!repoPath || !fs.existsSync(repoPath)) return false;

  const result = run("git", ["status", "--porcelain"], repoPath);
  return result.status === 0 && result.stdout.trim().length === 0;
}

function pathMatchesForbidden(filePath, forbidden) {
  const normalized = filePath.split(path.sep).join("/");
  return forbidden.some((entry) => {
    const pattern = entry.split(path.sep).join("/");
    return (
      normalized === pattern ||
      normalized.startsWith(`${pattern.replace(/\/+$/, "")}/`) ||
      path.basename(normalized) === pattern
    );
  });
}

function parseTraceEvents(tracePath) {
  const raw = readText(tracePath);
  if (!raw) return [];

  return raw
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return {};
      }
    });
}

function markdownList(items) {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : "- none";
}

const taskSpecPath = process.env.KRN_REAL_REPO_EXECUTION_TASK_SPEC_PATH ?? null;
const taskSpec = taskSpecPath ? readJson(path.resolve(taskSpecPath)) : null;
const taskContractPath = executionWorktreePath
  ? path.join(executionWorktreePath, ".krn", "current", "task-contract.json")
  : null;
const contextPath = executionWorktreePath
  ? path.join(executionWorktreePath, ".krn", "current", "context-package.json")
  : null;
const verifyPath = executionWorktreePath
  ? path.join(executionWorktreePath, ".krn", "current", "verify-result.json")
  : null;
const reviewSummaryPath = executionWorktreePath
  ? path.join(executionWorktreePath, ".krn", "current", "review-summary.json")
  : null;
const operatorSummaryPath = executionWorktreePath
  ? path.join(executionWorktreePath, ".krn", "current", "operator-summary.json")
  : null;
const handoffPath = executionWorktreePath
  ? path.join(executionWorktreePath, ".krn", "current", "handoff.md")
  : null;
const tracePath = executionWorktreePath
  ? path.join(executionWorktreePath, ".krn", "traces", "trace.jsonl")
  : null;

const taskContract = taskContractPath ? readJson(taskContractPath) : null;
const context = contextPath ? readJson(contextPath) : null;
const verify = verifyPath ? readJson(verifyPath) : null;
const traceEvents = tracePath ? parseTraceEvents(tracePath) : [];
const hookReceivedCount = traceEvents.filter((event) => event.name === "hook.received").length;
const trustedHookCount = traceEvents.filter(
  (event) =>
    event.name === "hook.received" &&
    (event.data?.payloadSource === "codex-trusted-hook" ||
      event.data?.trustedHookLoad === true),
).length;

const executionKindInput = process.env.KRN_REAL_REPO_EXECUTION_KIND ?? "blocked";
const executionKinds = new Set([
  "manual-codex",
  "automated-codex",
  "manual-no-codex",
  "blocked",
  "skipped",
]);
const executionKind = executionKinds.has(executionKindInput) ? executionKindInput : "blocked";
const changedFiles = gitChangedFiles(executionWorktreePath);
const defaultForbidden = [
  ".env",
  ".env.local",
  "dumps",
  "uploads",
  "media",
  "credentials",
  "raw",
  "wiki/_transactions",
  "wiki/_approvals",
  "wiki/_proposals",
];
const forbiddenPaths = [...new Set([...defaultForbidden, ...listFromEnv("KRN_REAL_REPO_EXECUTION_FORBIDDEN_PATHS")])];
const forbiddenTouchedFiles = changedFiles.filter((filePath) =>
  pathMatchesForbidden(filePath, forbiddenPaths),
);
const committedTargetRepo = boolFromEnv("KRN_REAL_REPO_EXECUTION_COMMITTED_TARGET_REPO");
const pushedTargetRepo = boolFromEnv("KRN_REAL_REPO_EXECUTION_PUSHED_TARGET_REPO");
const validationStatus = process.env.KRN_REAL_REPO_EXECUTION_VALIDATION_STATUS ?? "not-run";
const targetRepoCleanBefore = boolFromEnv("KRN_REAL_REPO_EXECUTION_TARGET_CLEAN_BEFORE", false);
const targetRepoCleanAfter = boolFromEnv(
  "KRN_REAL_REPO_EXECUTION_TARGET_CLEAN_AFTER",
  executionWorktreePath ? gitClean(executionWorktreePath) : false,
);
const hookTrustStatus =
  process.env.KRN_REAL_REPO_EXECUTION_HOOK_TRUST_STATUS ??
  (trustedHookCount > 0 ? "trusted" : "unproven");
const krnIdentityValid = boolFromEnv("KRN_REAL_REPO_EXECUTION_KRN_IDENTITY_VALID");
const validationPassed = validationStatus === "pass";
const hardFailure =
  forbiddenTouchedFiles.length > 0 || committedTargetRepo || pushedTargetRepo;
const status =
  hardFailure
    ? "fail"
    : executionKind === "skipped"
      ? "skipped"
      : executionKind === "blocked"
        ? "blocked"
        : validationPassed
          ? "pass"
          : "warn";
const risks = [
  ...listFromEnv("KRN_REAL_REPO_EXECUTION_RISKS", false),
  ...(hookTrustStatus === "unproven"
    ? ["Real Codex hook loading/trust remains unproven."]
    : []),
  "Execution artifact is local evidence, not production proof.",
];
const nextActions = [
  ...listFromEnv("KRN_REAL_REPO_EXECUTION_NEXT_ACTIONS", false),
  ...(hookTrustStatus === "unproven"
    ? ["Run a non-bypass Codex hook trust probe before claiming hook validation."]
    : []),
  ...(validationPassed ? [] : ["Run or repair target validation before claiming execution evidence."]),
];
const summary = {
  schema: "krn-real-repo-execution-result-v1",
  status,
  generatedAt: new Date().toISOString(),
  runId,
  targetRepoPath,
  executionWorktreePath,
  targetRepoCleanBefore,
  targetRepoCleanAfter,
  taskSpecPath,
  taskId: process.env.KRN_REAL_REPO_EXECUTION_TASK_ID ?? taskContract?.id ?? taskSpec?.id ?? null,
  taskText:
    process.env.KRN_REAL_REPO_EXECUTION_TASK_TEXT ??
    taskContract?.task ??
    taskSpec?.task ??
    taskSpec?.prompt ??
    null,
  executionKind,
  codexSessionId: process.env.KRN_REAL_REPO_EXECUTION_CODEX_SESSION_ID ?? null,
  codexExitCode: numberFromEnv("KRN_REAL_REPO_EXECUTION_CODEX_EXIT_CODE"),
  codexCommandShape: process.env.KRN_REAL_REPO_EXECUTION_CODEX_COMMAND_SHAPE ?? null,
  pinnedKrnPath: process.env.KRN_REAL_REPO_EXECUTION_PINNED_KRN_PATH ?? null,
  krnIdentityValid,
  contextStop: context?.stop ?? null,
  contextOverInclusionRisk: context?.overInclusion?.risk ?? null,
  verifyMode: verify?.mode ?? null,
  verifyStatus: verify?.status ?? null,
  verifyExecutedCommands: verify?.summary?.executedCommands ?? null,
  validationCommand: process.env.KRN_REAL_REPO_EXECUTION_VALIDATION_COMMAND ?? null,
  validationStatus,
  validationDurationSeconds: numberFromEnv("KRN_REAL_REPO_EXECUTION_VALIDATION_DURATION_SECONDS"),
  changedFiles,
  forbiddenTouchedFiles,
  committedTargetRepo,
  pushedTargetRepo,
  hookReceivedCount,
  hookTrustStatus,
  reviewSummaryPath: reviewSummaryPath && fs.existsSync(reviewSummaryPath) ? ".krn/current/review-summary.json" : null,
  operatorSummaryPath:
    operatorSummaryPath && fs.existsSync(operatorSummaryPath)
      ? ".krn/current/operator-summary.json"
      : null,
  handoffPath: handoffPath && fs.existsSync(handoffPath) ? ".krn/current/handoff.md" : null,
  evidenceClaim:
    process.env.KRN_REAL_REPO_EXECUTION_EVIDENCE_CLAIM ??
    (validationPassed
      ? "manual local execution evidence; not production proof"
      : "execution evidence incomplete; not production proof"),
  productionProof: false,
  risks: [...new Set(risks)],
  nextActions: [...new Set(nextActions)],
  summaryJsonPath,
  summaryMarkdownPath,
};

const markdown = [
  "# KRN Real-Repo Execution Result",
  "",
  `Status: ${summary.status}`,
  `Schema: ${summary.schema}`,
  `Run ID: ${summary.runId}`,
  `Generated at: ${summary.generatedAt}`,
  `Execution kind: ${summary.executionKind}`,
  `Production proof: ${String(summary.productionProof)}`,
  "",
  "## Target",
  "",
  `Target repo: ${summary.targetRepoPath ?? "none"}`,
  `Execution worktree: ${summary.executionWorktreePath ?? "none"}`,
  `Clean before: ${String(summary.targetRepoCleanBefore)}`,
  `Clean after: ${String(summary.targetRepoCleanAfter)}`,
  "",
  "## Task",
  "",
  `Task ID: ${summary.taskId ?? "unknown"}`,
  `Task: ${summary.taskText ?? "unknown"}`,
  `Task spec: ${summary.taskSpecPath ?? "none"}`,
  "",
  "## Codex",
  "",
  `Session ID: ${summary.codexSessionId ?? "none"}`,
  `Exit code: ${summary.codexExitCode ?? "unknown"}`,
  `Command shape: ${summary.codexCommandShape ?? "none"}`,
  "",
  "## KRN Evidence",
  "",
  `Pinned KRN: ${summary.pinnedKrnPath ?? "none"}`,
  `KRN identity valid: ${String(summary.krnIdentityValid)}`,
  `Context STOP: ${String(summary.contextStop)}`,
  `Context over-inclusion risk: ${summary.contextOverInclusionRisk ?? "unknown"}`,
  `Verify mode: ${summary.verifyMode ?? "unknown"}`,
  `Verify status: ${summary.verifyStatus ?? "unknown"}`,
  `Verify executed commands: ${String(summary.verifyExecutedCommands ?? "unknown")}`,
  "",
  "## Validation",
  "",
  `Command: ${summary.validationCommand ?? "none"}`,
  `Status: ${summary.validationStatus}`,
  `Duration seconds: ${String(summary.validationDurationSeconds ?? "unknown")}`,
  "",
  "## Change Safety",
  "",
  "Changed files:",
  markdownList(summary.changedFiles),
  "",
  "Forbidden touched files:",
  markdownList(summary.forbiddenTouchedFiles),
  "",
  `Committed target repo: ${String(summary.committedTargetRepo)}`,
  `Pushed target repo: ${String(summary.pushedTargetRepo)}`,
  "",
  "## Hooks",
  "",
  `hook.received count: ${summary.hookReceivedCount}`,
  `Hook trust status: ${summary.hookTrustStatus}`,
  "",
  "## Artifacts",
  "",
  `Review summary: ${summary.reviewSummaryPath ?? "none"}`,
  `Operator summary: ${summary.operatorSummaryPath ?? "none"}`,
  `Handoff: ${summary.handoffPath ?? "none"}`,
  "",
  "## Evidence Claim",
  "",
  summary.evidenceClaim,
  "",
  "## Risks",
  "",
  markdownList(summary.risks),
  "",
  "## Next Actions",
  "",
  markdownList(summary.nextActions),
  "",
].join("\n");

fs.mkdirSync(reportRoot, { recursive: true });
fs.writeFileSync(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(summaryMarkdownPath, `${markdown}\n`);

console.log(`KRN real-repo execution report: ${summary.status}`);
console.log(`summaryJson: ${summaryJsonPath}`);
console.log(`summaryMarkdown: ${summaryMarkdownPath}`);
console.log(JSON.stringify(summary, null, 2));
console.log("--- markdown ---");
console.log(markdown);
NODE
