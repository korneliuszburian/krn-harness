#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" == "" ]]; then
  echo "Usage: scripts/krn-real-repo-preflight.sh <repo-path> [krn-source-root]" >&2
  exit 2
fi

SCRIPT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
SOURCE_ROOT_INPUT="${2:-$SCRIPT_ROOT}"

if [[ ! -d "$1" ]]; then
  echo "KRN real-repo preflight: repo path does not exist: $1" >&2
  exit 2
fi

if [[ ! -d "$SOURCE_ROOT_INPUT" ]]; then
  echo "KRN real-repo preflight: source root does not exist: $SOURCE_ROOT_INPUT" >&2
  exit 2
fi

REPO_PATH="$(cd "$1" && pwd -P)"
SOURCE_ROOT="$(cd "$SOURCE_ROOT_INPUT" && pwd -P)"

REPO_PATH="$REPO_PATH" SOURCE_ROOT="$SOURCE_ROOT" node --input-type=module <<'NODE'
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const repoPath = process.env.REPO_PATH;
const sourceRoot = process.env.SOURCE_ROOT;

if (!repoPath || !sourceRoot) {
  console.error("KRN real-repo preflight: internal path resolution failed");
  process.exit(2);
}

const blockers = [];
const warnings = [];
const requiredOperatorDecisions = [];
const unsafeVerifyCommands = [];
const safeVerifyCommands = [];
const wouldInstall = [
  "AGENTS.md",
  ".codex/hooks.json",
  ".agents/skills/krn-harness/SKILL.md",
  ".krn/",
];

function run(command, args, cwd) {
  return spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    env: process.env,
  });
}

function addUnique(list, value) {
  if (!list.includes(value)) {
    list.push(value);
  }
}

function relativeFile(filePath) {
  return path.relative(repoPath, filePath).split(path.sep).join("/");
}

function scanFiles(dir, depth = 0, results = []) {
  if (depth > 4) {
    return results;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if ([".git", ".krn", "node_modules", "vendor"].includes(entry.name)) {
      continue;
    }

    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      scanFiles(entryPath, depth + 1, results);
      continue;
    }

    if (entry.isFile()) {
      results.push(entryPath);
    }
  }

  return results;
}

function commandTokens(commandConfig) {
  if (typeof commandConfig === "string") {
    return commandConfig.trim().replace(/\s+/g, " ").split(" ").filter(Boolean);
  }

  if (
    commandConfig &&
    typeof commandConfig === "object" &&
    typeof commandConfig.command === "string"
  ) {
    return [
      commandConfig.command,
      ...(Array.isArray(commandConfig.args) ? commandConfig.args.filter((arg) => typeof arg === "string") : []),
    ];
  }

  return [];
}

function verifyCommandAllowed(tokens) {
  const [command, ...args] = tokens;
  const text = tokens.join(" ");

  if (tokens.length === 0) {
    return { allowed: false, reason: "empty verify command" };
  }

  if (tokens.some((token) => ["&&", "||", ";", "|", ">", "<"].some((blocked) => token.includes(blocked)))) {
    return { allowed: false, reason: "shell syntax is not allowed" };
  }

  if (["rm", "scp", "curl", "wget"].includes(command)) {
    return { allowed: false, reason: `${command} is not allowed in verify profiles` };
  }

  if (command === "git" && args[0] === "reset" && args[1] === "--hard") {
    return { allowed: false, reason: "git reset --hard is not allowed" };
  }

  if (command === "git" && args[0] === "clean") {
    return { allowed: false, reason: "git clean is not allowed" };
  }

  if (command === "pnpm" && args.length === 1 && ["lint", "typecheck", "test"].includes(args[0])) {
    return { allowed: true };
  }

  if (command === "npm" && (args.join(" ") === "test" || args.join(" ") === "run test")) {
    return { allowed: true };
  }

  if (
    command === "node" &&
    args.length === 1 &&
    !path.isAbsolute(args[0]) &&
    !args[0].startsWith("-") &&
    !args[0].split(/[\\/]+/).includes("..") &&
    /^[A-Za-z0-9._/-]+$/.test(args[0]) &&
    /\.(cjs|js|mjs|ts)$/.test(args[0])
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: `unknown verify command: ${text}` };
}

function collectVerifyCommands(config) {
  const commands = [];
  const verify = config?.verify;

  if (!verify || typeof verify !== "object") {
    return commands;
  }

  if (Array.isArray(verify.commands)) {
    commands.push(...verify.commands);
  }

  if (verify.profiles && typeof verify.profiles === "object") {
    for (const profile of Object.values(verify.profiles)) {
      if (profile && typeof profile === "object" && Array.isArray(profile.commands)) {
        commands.push(...profile.commands);
      }
    }
  }

  return commands;
}

if (repoPath === sourceRoot) {
  blockers.push("repo_path_is_krn_source_checkout");
}

const gitProbe = run("git", ["rev-parse", "--is-inside-work-tree"], repoPath);
const isGitRepo = gitProbe.status === 0 && gitProbe.stdout.trim() === "true";

if (!isGitRepo) {
  blockers.push("repo_path_is_not_git_repo");
}

let dirtyWorktree = false;
if (isGitRepo) {
  const dirty = run("git", ["status", "--porcelain"], repoPath);
  dirtyWorktree = dirty.stdout.trim().length > 0;

  if (dirtyWorktree) {
    warnings.push("dirty_worktree");
    requiredOperatorDecisions.push("clean_or_branch_isolate_before_paid_dogfood");
  }
}

for (const filePath of scanFiles(repoPath)) {
  const relative = relativeFile(filePath);
  const lower = path.basename(filePath).toLowerCase();
  const stat = fs.statSync(filePath);

  if (lower === ".env" || lower.startsWith(".env.")) {
    addUnique(warnings, `env_file:${relative}`);
    addUnique(requiredOperatorDecisions, "remove_or_explicitly_exclude_env_files");
  }

  if (/\.(sql|dump|bak|backup)$/i.test(lower)) {
    addUnique(warnings, `likely_dump:${relative}`);
    addUnique(requiredOperatorDecisions, "remove_or_explicitly_exclude_dumps");
  }

  if (
    lower.includes("credential") ||
    lower.includes("secret") ||
    lower.includes("private") ||
    lower === "id_rsa" ||
    /\.(pem|key)$/i.test(lower)
  ) {
    addUnique(warnings, `credential_filename:${relative}`);
    addUnique(requiredOperatorDecisions, "remove_or_explicitly_exclude_credential_like_files");
  }

  if (
    stat.size > 10 * 1024 * 1024 &&
    /\.(pdf|doc|docx|xls|xlsx|zip|sql|dump|bak|backup)$/i.test(lower)
  ) {
    addUnique(warnings, `large_protected_looking_file:${relative}`);
    addUnique(requiredOperatorDecisions, "review_large_files_before_paid_dogfood");
  }
}

const configPath = path.join(repoPath, "krn.config.json");
const krnConfigExists = fs.existsSync(configPath);
let verifyProfileStatus = "missing";
let verifyDefaultProfile = null;
let verifyProfiles = [];
let configIssues = [];

if (!krnConfigExists) {
  warnings.push("missing_krn_config_json");
  requiredOperatorDecisions.push("create_or_accept_record_only_krn_config");
} else {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    verifyDefaultProfile =
      typeof config.verify?.defaultProfile === "string" ? config.verify.defaultProfile : null;
    verifyProfiles =
      config.verify?.profiles && typeof config.verify.profiles === "object"
        ? Object.keys(config.verify.profiles).sort()
        : [];

    const verifyCommands = collectVerifyCommands(config);
    for (const commandConfig of verifyCommands) {
      const tokens = commandTokens(commandConfig);
      const policy = verifyCommandAllowed(tokens);
      const text = tokens.join(" ");

      if (policy.allowed) {
        safeVerifyCommands.push(text);
      } else {
        unsafeVerifyCommands.push(`${text || "invalid"}: ${policy.reason}`);
      }
    }

    if (verifyCommands.length === 0) {
      verifyProfileStatus = "missing";
      warnings.push("missing_safe_verify_profile");
      requiredOperatorDecisions.push("use_record_only_verify_or_add_safe_profile");
    } else if (unsafeVerifyCommands.length > 0) {
      verifyProfileStatus = "unsafe";
      warnings.push("unsafe_verify_profile");
      requiredOperatorDecisions.push("fix_or_avoid_unsafe_verify_profile_before_execute");
    } else {
      verifyProfileStatus = "safe";
    }
  } catch (error) {
    verifyProfileStatus = "invalid-config";
    configIssues.push(error instanceof Error ? error.message : String(error));
    warnings.push("invalid_krn_config_json");
    requiredOperatorDecisions.push("fix_krn_config_json_before_paid_dogfood");
  }
}

let pinnedKrnPath = null;
let krnIdentity = null;
let krnIdentityValid = false;
let krnStatusOk = false;
let krnStatusOutput = null;
let installRun = false;
let installOutput = null;

if (blockers.length === 0) {
  const binDir =
    process.env.KRN_REAL_REPO_PREFLIGHT_BIN_DIR ??
    fs.mkdtempSync(path.join(os.tmpdir(), "krn-real-repo-preflight-bin-"));
  fs.mkdirSync(binDir, { recursive: true });

  const shim = run(path.join(sourceRoot, "scripts", "krn-local-shim.sh"), [binDir], sourceRoot);
  if (shim.status !== 0) {
    blockers.push("pinned_krn_shim_failed");
    warnings.push((shim.stderr || shim.stdout).trim());
  } else {
    pinnedKrnPath = shim.stdout.trim();
    const identity = run(pinnedKrnPath, ["doctor", "cli"], repoPath);
    krnIdentity = identity.stdout.trim();
    krnIdentityValid =
      identity.status === 0 &&
      krnIdentity.includes("schema: krn-harness-cli-identity-v1") &&
      krnIdentity.includes("package: @krn-harness/cli") &&
      krnIdentity.includes("required_commands_present: true");

    if (!krnIdentityValid) {
      blockers.push("pinned_krn_identity_invalid");
    }

    const status = run(pinnedKrnPath, ["status"], repoPath);
    krnStatusOk = status.status === 0;
    krnStatusOutput = status.stdout.trim();

    if (!krnStatusOk) {
      blockers.push("pinned_krn_status_failed");
    }

    if (process.env.KRN_REAL_REPO_PREFLIGHT_INSTALL === "1") {
      const install = run(pinnedKrnPath, ["install"], repoPath);
      installRun = true;
      installOutput = install.stdout.trim();

      if (install.status !== 0) {
        blockers.push("pinned_krn_install_failed");
      }
    } else {
      requiredOperatorDecisions.push("krn_install_not_run");
    }
  }
}

const eligible = blockers.length === 0;
const recommendedNextCommand = eligible
  ? `KRN_REAL_REPO_DOGFOOD_PATH=${repoPath} KRN_REAL_REPO_DOGFOOD_APPROVED=1 <run-real-repo-dogfood-protocol>`
  : "Resolve blockers, then rerun scripts/krn-real-repo-preflight.sh";
const outputDir =
  isGitRepo && repoPath !== sourceRoot
    ? path.join(repoPath, ".krn", "dogfood", "real-repo-preflight", "latest")
    : null;
const summary = {
  schema: "krn-real-repo-preflight-v1",
  eligible,
  repoPath,
  sourceRootPath: sourceRoot,
  isGitRepo,
  dirtyWorktree,
  krnConfigExists,
  verifyProfileStatus,
  verifyDefaultProfile,
  verifyProfiles,
  safeVerifyCommands,
  unsafeVerifyCommands,
  configIssues,
  blockers,
  warnings,
  requiredOperatorDecisions: [...new Set(requiredOperatorDecisions)].sort(),
  pinnedKrnPath,
  krnIdentityValid,
  krnIdentity,
  krnStatusOk,
  krnStatusOutput,
  installRun,
  installOutput,
  wouldInstall,
  recommendedNextCommand,
  summaryJsonPath: outputDir ? path.join(outputDir, "summary.json") : null,
  summaryMarkdownPath: outputDir ? path.join(outputDir, "summary.md") : null,
};

function list(items) {
  return items.length === 0 ? "- none" : items.map((item) => `- ${item}`).join("\n");
}

const markdown = [
  "# KRN Real-Repo Preflight",
  "",
  `Eligible: ${String(summary.eligible)}`,
  `Repo: ${summary.repoPath}`,
  `Pinned KRN: ${summary.pinnedKrnPath ?? "none"}`,
  `Identity valid: ${String(summary.krnIdentityValid)}`,
  `Config present: ${String(summary.krnConfigExists)}`,
  `Verify profile status: ${summary.verifyProfileStatus}`,
  `Install run: ${String(summary.installRun)}`,
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
  "## Unsafe Verify Commands",
  "",
  list(summary.unsafeVerifyCommands),
  "",
  "## Would Install",
  "",
  list(summary.wouldInstall),
  "",
  "## Recommended Next Command",
  "",
  summary.recommendedNextCommand,
  "",
].join("\n");

if (outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(summary.summaryJsonPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  fs.writeFileSync(summary.summaryMarkdownPath, markdown, "utf8");
}

console.log(`KRN real-repo preflight: ${eligible ? "eligible" : "blocked"}`);
console.log(`json: ${summary.summaryJsonPath ?? "stdout-only"}`);
console.log(`markdown: ${summary.summaryMarkdownPath ?? "stdout-only"}`);
console.log(JSON.stringify(summary, null, 2));
console.log("--- markdown ---");
console.log(markdown);

process.exit(eligible ? 0 : 1);
NODE
