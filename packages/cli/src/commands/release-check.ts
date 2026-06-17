import { getRuntimeLayout, runtimePath } from "../../../core/src/index.js";
import { currentArtifactPathsFor, readRepoJson, repoPathExists } from "../current-artifacts.js";
import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { writeReleaseBundle } from "../release-check-bundle.js";
import type { CliRuntime } from "../runtime.js";

export type ReleaseCheckStatus = "pass" | "warn" | "fail";

interface ReleaseCheckRecord {
  id: string;
  status: ReleaseCheckStatus;
  summary: string;
  evidence: string[];
  nextAction?: string | undefined;
}

export interface ReleaseCheckResult {
  schema: "krn-release-check-v1";
  generatedAt: string;
  status: ReleaseCheckStatus;
  checks: ReleaseCheckRecord[];
  blockers: string[];
  warnings: string[];
  nextActions: string[];
}

interface ReleaseCheckOptions {
  format: "markdown" | "json";
  write: boolean;
  bundle: boolean;
  error?: string | undefined;
}

function parseReleaseCheckArgs(args: string[]): ReleaseCheckOptions {
  const options: ReleaseCheckOptions = {
    format: "markdown",
    write: false,
    bundle: false,
  };

  for (const arg of args) {
    if (arg === "--json") {
      options.format = "json";
      continue;
    }

    if (arg === "--write") {
      options.write = true;
      continue;
    }

    if (arg === "--bundle") {
      options.bundle = true;
      options.write = true;
      continue;
    }

    return {
      ...options,
      error: "KRN release-check: expected `krn release-check [--json] [--write] [--bundle]`",
    };
  }

  return options;
}

function aggregateStatus(checks: ReleaseCheckRecord[]): ReleaseCheckStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "pass";
}

async function fileCheck(
  cwd: string,
  id: string,
  relativePath: string,
  summary: string,
  nextAction: string,
): Promise<ReleaseCheckRecord> {
  const exists = await repoPathExists(cwd, relativePath);
  return {
    id,
    status: exists ? "pass" : "fail",
    summary: exists ? summary : `Missing ${relativePath}.`,
    evidence: exists ? [relativePath] : [],
    nextAction: exists ? undefined : nextAction,
  };
}

async function packageScriptsCheck(cwd: string): Promise<ReleaseCheckRecord> {
  const packageJson = await readRepoJson<{ scripts?: Record<string, string> }>(cwd, "package.json");
  const requiredScripts = ["lint", "typecheck", "test", "verify:local"];
  const missing = requiredScripts.filter(
    (script) => typeof packageJson?.scripts?.[script] !== "string",
  );

  return {
    id: "package-scripts",
    status: missing.length === 0 ? "pass" : "fail",
    summary:
      missing.length === 0
        ? "Required local validation scripts are present."
        : `Missing package scripts: ${missing.join(", ")}.`,
    evidence: packageJson ? ["package.json"] : [],
    nextAction: missing.length === 0 ? undefined : "Add missing local validation scripts.",
  };
}

async function reportArtifactsCheck(cwd: string): Promise<ReleaseCheckRecord> {
  const currentArtifactPaths = currentArtifactPathsFor(cwd);
  const required = [
    currentArtifactPaths.operatorReportMarkdown,
    currentArtifactPaths.operatorReportJson,
    currentArtifactPaths.operatorReportHtml,
  ];
  const present: string[] = [];
  const missing: string[] = [];

  for (const relativePath of required) {
    if (await repoPathExists(cwd, relativePath)) {
      present.push(relativePath);
    } else {
      missing.push(relativePath);
    }
  }

  return {
    id: "operator-report-artifacts",
    status: missing.length === 0 ? "pass" : "warn",
    summary:
      missing.length === 0
        ? "Current operator report artifacts are present."
        : `Operator report artifacts are missing: ${missing.join(", ")}.`,
    evidence: present,
    nextAction:
      missing.length === 0 ? undefined : "Run `krn report --write` before release handoff.",
  };
}

async function reportBundleCheck(cwd: string): Promise<ReleaseCheckRecord> {
  const currentArtifactPaths = currentArtifactPathsFor(cwd);
  const relativePath = currentArtifactPaths.reportBundleManifest;
  const exists = await repoPathExists(cwd, relativePath);
  return {
    id: "operator-report-bundle",
    status: exists ? "pass" : "warn",
    summary: exists
      ? "Current report bundle manifest is present."
      : "Current report bundle is missing.",
    evidence: exists ? [relativePath] : [],
    nextAction: exists ? undefined : "Run `krn report --bundle` before beta handoff.",
  };
}

async function forbiddenLayersCheck(cwd: string): Promise<ReleaseCheckRecord> {
  const forbidden = [
    "packages/mcp",
    "packages/vector",
    "packages/embeddings",
    "packages/subagents",
  ];
  const present: string[] = [];

  for (const relativePath of forbidden) {
    if (await repoPathExists(cwd, relativePath)) {
      present.push(relativePath);
    }
  }

  return {
    id: "forbidden-product-layers",
    status: present.length === 0 ? "pass" : "fail",
    summary:
      present.length === 0
        ? "No forbidden MCP/vector/embedding/subagent package layers found."
        : `Forbidden product layers found: ${present.join(", ")}.`,
    evidence: present,
    nextAction:
      present.length === 0
        ? undefined
        : "Remove forbidden product layers or document an accepted ADR before release.",
  };
}

async function buildReleaseCheck(cwd: string, generatedAt: string): Promise<ReleaseCheckResult> {
  const checks = await Promise.all([
    packageScriptsCheck(cwd),
    fileCheck(
      cwd,
      "run-command",
      "packages/cli/src/commands/run.ts",
      "Condensed run command exists.",
      "Add `krn run` before release.",
    ),
    fileCheck(
      cwd,
      "report-command",
      "packages/cli/src/commands/report.ts",
      "Operator report command exists.",
      "Add `krn report` before release.",
    ),
    fileCheck(
      cwd,
      "artifacts-command",
      "packages/cli/src/commands/artifacts.ts",
      "Artifact lifecycle command exists.",
      "Add artifact lifecycle command before release.",
    ),
    fileCheck(
      cwd,
      "uninstall-command",
      "packages/cli/src/commands/uninstall.ts",
      "Safe uninstall command exists.",
      "Add `krn uninstall --dry-run` before beta release.",
    ),
    fileCheck(
      cwd,
      "config-command",
      "packages/cli/src/commands/config.ts",
      "Config doctor/init command exists.",
      "Add `krn config doctor` before beta release.",
    ),
    fileCheck(
      cwd,
      "install-result-schema",
      "docs/specs/install-result.schema.md",
      "Install result schema exists.",
      "Document install result schema before release.",
    ),
    fileCheck(
      cwd,
      "uninstall-result-schema",
      "docs/specs/uninstall-result.schema.md",
      "Uninstall result schema exists.",
      "Document uninstall result schema before release.",
    ),
    fileCheck(
      cwd,
      "config-doctor-schema",
      "docs/specs/config-doctor.schema.md",
      "Config doctor schema exists.",
      "Document config doctor schema before release.",
    ),
    fileCheck(
      cwd,
      "run-result-schema",
      "docs/specs/run-result.schema.md",
      "Run result schema exists.",
      "Document run result schema before release.",
    ),
    fileCheck(
      cwd,
      "operator-report-schema",
      "docs/specs/operator-report.schema.md",
      "Operator report schema exists.",
      "Document operator report schema before release.",
    ),
    fileCheck(
      cwd,
      "release-check-schema",
      "docs/specs/release-check.schema.md",
      "Release-check schema exists.",
      "Document release-check schema before release.",
    ),
    fileCheck(
      cwd,
      "evidence-matrix",
      "docs/product/evidence-matrix.md",
      "Evidence matrix exists.",
      "Update evidence matrix before release.",
    ),
    fileCheck(
      cwd,
      "mvp-state",
      "docs/product/mvp-state.md",
      "MVP state document exists.",
      "Add docs/product/mvp-state.md before release.",
    ),
    fileCheck(
      cwd,
      "ci-workflow",
      ".github/workflows/verify.yml",
      "Verification workflow exists.",
      "Add minimal verification workflow before release.",
    ),
    fileCheck(
      cwd,
      "verify-policy",
      "packages/verify/src/command-policy.ts",
      "Verify execution policy source exists.",
      "Restore verify execution policy before release.",
    ),
    reportArtifactsCheck(cwd),
    reportBundleCheck(cwd),
    forbiddenLayersCheck(cwd),
  ]);
  const blockers = checks
    .filter((check) => check.status === "fail")
    .map((check) => `${check.id}: ${check.summary}`);
  const warnings = checks
    .filter((check) => check.status === "warn")
    .map((check) => `${check.id}: ${check.summary}`);
  const nextActions = checks
    .map((check) => check.nextAction)
    .filter((action): action is string => typeof action === "string");

  return {
    schema: "krn-release-check-v1",
    generatedAt,
    status: aggregateStatus(checks),
    checks,
    blockers,
    warnings,
    nextActions,
  };
}

function renderReleaseCheckMarkdown(result: ReleaseCheckResult): string {
  return [
    "# KRN Release Check",
    "",
    `Status: ${result.status}`,
    `Generated at: ${result.generatedAt}`,
    "",
    "## Checks",
    "",
    "| Check | Status | Summary |",
    "| --- | --- | --- |",
    ...result.checks.map(
      (check) => `| ${check.id} | ${check.status} | ${check.summary.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## Blockers",
    "",
    ...(result.blockers.length > 0 ? result.blockers.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Warnings",
    "",
    ...(result.warnings.length > 0 ? result.warnings.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Next Actions",
    "",
    ...(result.nextActions.length > 0 ? result.nextActions.map((item) => `- ${item}`) : ["- none"]),
    "",
    "## Limits",
    "",
    "- Release check reads local files and current report artifacts only.",
    "- It does not run validation commands, publish packages, call network, or claim CI green.",
    "",
  ].join("\n");
}

export async function releaseCheckCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const options = parseReleaseCheckArgs(args);
  if (options.error) {
    runtime.stderr(`${options.error}\n`);
    return 1;
  }

  const result = await buildReleaseCheck(
    runtime.cwd,
    (runtime.now?.() ?? new Date()).toISOString(),
  );
  const markdown = renderReleaseCheckMarkdown(result);

  if (options.write) {
    await writeCurrentJson(runtime.cwd, "release-check.json", result);
    await writeCurrentMarkdown(runtime.cwd, "release-check.md", markdown);
  }

  const bundleManifest = options.bundle ? await writeReleaseBundle(runtime, { result }) : undefined;

  if (options.format === "json") {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return result.status === "fail" ? 1 : 0;
  }

  runtime.stdout(
    options.bundle
      ? `${markdown}\nBundle: ${runtimePath(getRuntimeLayout(runtime.cwd).releaseBundleDir, "manifest.json")}\nFiles: ${bundleManifest?.files.length ?? 0}\n`
      : markdown,
  );
  return result.status === "fail" ? 1 : 0;
}
