#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"

ROOT="$ROOT" node --input-type=module <<'NODE'
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const sourceRoot = process.env.ROOT;

if (!sourceRoot) {
  console.error("KRN real-repo dogfood: internal source root resolution failed");
  process.exit(2);
}

const repoPathInput = process.env.KRN_REAL_REPO_DOGFOOD_PATH ?? "";
const dogfoodApproved = process.env.KRN_REAL_REPO_DOGFOOD_APPROVED === "1";
const codexApproved = process.env.KRN_REAL_REPO_CODEX_APPROVED === "1";
const runId =
  process.env.KRN_REAL_REPO_DOGFOOD_RUN_ID ??
  `real-repo-${new Date().toISOString().replace(/[:.]/g, "-")}`;

function run(command, args, cwd, env = process.env) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env,
  });
}

function parsePreflightSummary(stdout) {
  const start = stdout.indexOf("{\n");
  const end = stdout.indexOf("\n--- markdown ---", start);

  if (start < 0 || end <= start) {
    return null;
  }

  try {
    return JSON.parse(stdout.slice(start, end));
  } catch {
    return null;
  }
}

function list(items) {
  return items.length === 0 ? "- none" : items.map((item) => `- ${item}`).join("\n");
}

function reportRootFor(status, repoPath, preflight) {
  if (status === "readiness" && repoPath && preflight?.eligible === true) {
    return path.join(repoPath, ".krn", "dogfood", "real-repo-dogfood", runId);
  }

  return path.join(sourceRoot, ".krn", "dogfood", "real-repo-skipped", runId);
}

const missingEnv = [];
if (!repoPathInput) missingEnv.push("KRN_REAL_REPO_DOGFOOD_PATH");
if (!dogfoodApproved) missingEnv.push("KRN_REAL_REPO_DOGFOOD_APPROVED=1");
const missingEnvInstructions =
  missingEnv.length > 0
    ? [
        "Choose an absolute path to a safe non-protected git repository.",
        "export KRN_REAL_REPO_DOGFOOD_PATH=/absolute/path/to/safe-non-protected-repo",
        "export KRN_REAL_REPO_DOGFOOD_APPROVED=1",
        "scripts/krn-real-repo-dogfood.sh",
      ]
    : [];

let status = "skipped";
let reason = "Missing required real-repo dogfood configuration.";
let repoPath = repoPathInput || null;
let preflight = null;
let preflightExitStatus = null;
let preflightStdout = "";
let preflightStderr = "";
const blockers = [];
const warnings = [];
const requiredOperatorDecisions = [];
const artifacts = [];

if (missingEnv.length === 0) {
  const resolvedRepoPath = path.resolve(repoPathInput);
  repoPath = resolvedRepoPath;
  const preflightResult = run(
    path.join(sourceRoot, "scripts", "krn-real-repo-preflight.sh"),
    [resolvedRepoPath, sourceRoot],
    sourceRoot,
  );
  preflightExitStatus = preflightResult.status;
  preflightStdout = preflightResult.stdout ?? "";
  preflightStderr = preflightResult.stderr ?? "";
  preflight = parsePreflightSummary(preflightStdout);

  if (!preflight) {
    status = "blocked";
    reason = "Real-repo preflight did not produce a parseable summary.";
    blockers.push("preflight_summary_missing");
  } else if (preflight.eligible !== true || preflight.blockers?.length > 0) {
    status = "blocked";
    reason = "Real-repo preflight reported blockers.";
    blockers.push(...(preflight.blockers ?? []));
  } else if (codexApproved) {
    status = "blocked";
    reason = "Paid real-repo Codex execution is not implemented in this safe scaffold.";
    blockers.push("real_repo_codex_execution_not_implemented");
    warnings.push("manual_protocol_required_for_paid_execution");
  } else {
    status = "readiness";
    reason = "Preflight eligible; paid real-repo Codex execution was not approved.";
    warnings.push("paid_codex_execution_not_approved");
    requiredOperatorDecisions.push("approve_paid_codex_or_run_manual_protocol");
  }

  warnings.push(...(preflight?.warnings ?? []));
  requiredOperatorDecisions.push(...(preflight?.requiredOperatorDecisions ?? []));

  if (preflight?.summaryJsonPath) artifacts.push(preflight.summaryJsonPath);
  if (preflight?.summaryMarkdownPath) artifacts.push(preflight.summaryMarkdownPath);
} else {
  requiredOperatorDecisions.push("set_KRN_REAL_REPO_DOGFOOD_PATH");
  requiredOperatorDecisions.push("set_KRN_REAL_REPO_DOGFOOD_APPROVED");
}

const reportRoot = reportRootFor(status, repoPath, preflight);
const summaryJsonPath = path.join(reportRoot, "summary.json");
const summaryMarkdownPath = path.join(reportRoot, "summary.md");
const outcomeKind =
  missingEnv.length > 0
    ? "skipped-missing-env"
    : status === "readiness"
      ? "readiness-only"
      : status;
const validationClaim =
  status === "readiness"
    ? "readiness-only; not real-repo execution validation"
    : status === "skipped"
      ? "not validated; no real repository was preflighted or executed"
      : "blocked; not validated";
const nextCommand =
  status === "readiness" && repoPath
    ? `Review ${summaryMarkdownPath}, then run the manual protocol in docs/demo/real-repo-dogfood.md or set KRN_REAL_REPO_CODEX_APPROVED=1 after implementation exists.`
    : missingEnv.length > 0
      ? "Set KRN_REAL_REPO_DOGFOOD_PATH to an absolute safe non-protected git repo path and KRN_REAL_REPO_DOGFOOD_APPROVED=1, then rerun scripts/krn-real-repo-dogfood.sh."
      : "Resolve blockers, then rerun scripts/krn-real-repo-dogfood.sh.";
const summary = {
  schema: "krn-real-repo-dogfood-v1",
  runId,
  status,
  outcomeKind,
  reason,
  validationClaim,
  sourceRootPath: sourceRoot,
  repoPath,
  missingEnv,
  missingEnvInstructions,
  dogfoodApproved,
  codexApproved,
  preflightExitStatus,
  preflightEligible: preflight?.eligible ?? null,
  preflightSummaryJsonPath: preflight?.summaryJsonPath ?? null,
  preflightSummaryMarkdownPath: preflight?.summaryMarkdownPath ?? null,
  blockers: [...new Set(blockers)].sort(),
  warnings: [...new Set(warnings)].sort(),
  requiredOperatorDecisions: [...new Set(requiredOperatorDecisions)].sort(),
  pinnedKrnPath: preflight?.pinnedKrnPath ?? null,
  krnIdentityValid: preflight?.krnIdentityValid ?? false,
  verifyProfileStatus: preflight?.verifyProfileStatus ?? null,
  safeVerifyCommands: preflight?.safeVerifyCommands ?? [],
  artifacts,
  nextCommand,
  summaryJsonPath,
  summaryMarkdownPath,
};

const markdown = [
  "# KRN Real-Repo Dogfood",
  "",
  `Status: ${summary.status}`,
  `Outcome: ${summary.outcomeKind}`,
  `Reason: ${summary.reason}`,
  `Validation claim: ${summary.validationClaim}`,
  `Repo: ${summary.repoPath ?? "none"}`,
  `Dogfood approved: ${String(summary.dogfoodApproved)}`,
  `Codex execution approved: ${String(summary.codexApproved)}`,
  `Preflight eligible: ${String(summary.preflightEligible)}`,
  `Pinned KRN: ${summary.pinnedKrnPath ?? "none"}`,
  `KRN identity valid: ${String(summary.krnIdentityValid)}`,
  `Verify profile status: ${summary.verifyProfileStatus ?? "unknown"}`,
  "",
  "## Missing Environment",
  "",
  list(summary.missingEnv),
  "",
  "## Missing Environment Instructions",
  "",
  list(summary.missingEnvInstructions),
  "",
  "## Blockers",
  "",
  list(summary.blockers),
  "",
  "## Warnings",
  "",
  list(summary.warnings),
  "",
  "## Required Operator Decisions",
  "",
  list(summary.requiredOperatorDecisions),
  "",
  "## Safe Verify Commands",
  "",
  list(summary.safeVerifyCommands),
  "",
  "## Artifacts",
  "",
  list(summary.artifacts),
  "",
  "## Next Command",
  "",
  summary.nextCommand,
  "",
  "## Safety Notes",
  "",
  "- This scaffold does not execute Codex.",
  "- This scaffold does not commit or push.",
  "- This scaffold does not read `.env` contents or protected data.",
  "- This scaffold does not validate real Codex hook loading or trust.",
  "- Skipped and readiness reports are not real-repo validation.",
  "",
].join("\n");

fs.mkdirSync(reportRoot, { recursive: true });
fs.writeFileSync(summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`);
fs.writeFileSync(summaryMarkdownPath, `${markdown}\n`);

if (preflightStdout) {
  fs.writeFileSync(path.join(reportRoot, "preflight.stdout.txt"), preflightStdout);
}

if (preflightStderr) {
  fs.writeFileSync(path.join(reportRoot, "preflight.stderr.txt"), preflightStderr);
}

console.log(`KRN real-repo dogfood: ${summary.status}`);
console.log(`summaryJson: ${summaryJsonPath}`);
console.log(`summaryMarkdown: ${summaryMarkdownPath}`);
console.log(JSON.stringify(summary, null, 2));
console.log("--- markdown ---");
console.log(markdown);
NODE
