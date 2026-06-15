import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathExists, readJsonFile } from "../../../core/src/index.js";
import { artifactPathHasSecretMarker } from "../artifact-scope.js";
import type { CliRuntime } from "../runtime.js";

type ReleaseCheckStatus = "pass" | "warn" | "fail";

interface ReleaseCheckRecord {
  id: string;
  status: ReleaseCheckStatus;
  summary: string;
  evidence: string[];
  nextAction?: string | undefined;
}

interface ReleaseCheckResult {
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
  const exists = await pathExists(path.join(cwd, relativePath));
  return {
    id,
    status: exists ? "pass" : "fail",
    summary: exists ? summary : `Missing ${relativePath}.`,
    evidence: exists ? [relativePath] : [],
    nextAction: exists ? undefined : nextAction,
  };
}

async function packageScriptsCheck(cwd: string): Promise<ReleaseCheckRecord> {
  const packageJson = await readJsonFile<{ scripts?: Record<string, string> }>(
    path.join(cwd, "package.json"),
  );
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
  const required = [
    ".krn/current/operator-report.md",
    ".krn/current/operator-report.json",
    ".krn/current/operator-report.html",
  ];
  const present: string[] = [];
  const missing: string[] = [];

  for (const relativePath of required) {
    if (await pathExists(path.join(cwd, relativePath))) {
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
  const relativePath = ".krn/current/report-bundle/manifest.json";
  const exists = await pathExists(path.join(cwd, relativePath));
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
    if (await pathExists(path.join(cwd, relativePath))) {
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

interface ReleaseBundleFile {
  path: string;
  source: string;
  present: boolean;
  required: boolean;
  skippedReason?: string | undefined;
}

interface ReleaseBundleValidationCommand {
  command: string;
  status: "recorded-not-executed-by-release-check";
  evidence: string;
}

interface ReleaseBundleManifest {
  schema: "krn-release-bundle-manifest-v1";
  generatedAt: string;
  releaseCheckStatus: ReleaseCheckStatus;
  productionProof: false;
  hookTrustStatus: string;
  files: ReleaseBundleFile[];
  validationCommands: ReleaseBundleValidationCommand[];
  limits: string[];
}

interface MinimalOperatorReport {
  verdict?: string | undefined;
  hookTrust?: { status?: string | undefined; summary?: string | undefined } | undefined;
  productionProof?: { value?: boolean | undefined; summary?: string | undefined } | undefined;
  realRepoEvidence?:
    | {
        status?: string | undefined;
        summary?: string | undefined;
        latestPath?: string | undefined;
        staleHistoricalBlocker?: boolean | undefined;
      }
    | undefined;
  blockers?: string[] | undefined;
  warnings?: string[] | undefined;
  nextActions?: string[] | undefined;
  historicalCaveatCount?: number | undefined;
}

interface MinimalEvalResult {
  status?: string | undefined;
  passCount?: number | undefined;
  failCount?: number | undefined;
  fixtures?: Array<{ name?: string | undefined; status?: string | undefined }> | undefined;
}

interface MinimalReportBundleManifest {
  schema?: string | undefined;
  productionProof?: boolean | undefined;
  files?: Array<{ path?: string | undefined; present?: boolean | undefined }> | undefined;
}

const releaseValidationCommands: ReleaseBundleValidationCommand[] = [
  "pnpm lint",
  "pnpm typecheck",
  "pnpm test",
  "pnpm verify:local",
  "pnpm --silent krn report --write",
  "pnpm --silent krn report --bundle",
  "pnpm --silent krn release-check --write",
  "pnpm --silent krn release-check --bundle",
  "pnpm --silent krn eval",
  "git diff --check",
].map((command) => ({
  command,
  status: "recorded-not-executed-by-release-check",
  evidence:
    "The release bundle records the RC validation command set; it does not execute shell commands.",
}));

function markdownList(values: string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- none"];
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.replaceAll("\\", "/");
}

async function copyReleaseBundleFile(
  cwd: string,
  bundleDir: string,
  source: string,
  destination: string,
  required: boolean,
): Promise<ReleaseBundleFile> {
  const normalizedSource = normalizeRelativePath(source);
  const sourceParts = normalizedSource.split("/");

  if (
    !normalizedSource.startsWith(".krn/current/") ||
    sourceParts.includes("..") ||
    artifactPathHasSecretMarker(normalizedSource)
  ) {
    return {
      path: destination,
      source: normalizedSource,
      present: false,
      required,
      skippedReason: "unsafe_source_path",
    };
  }

  try {
    const absoluteSource = path.join(cwd, normalizedSource);
    const fileStat = await stat(absoluteSource);
    if (fileStat.size > 1_000_000) {
      return {
        path: destination,
        source: normalizedSource,
        present: false,
        required,
        skippedReason: "file_too_large",
      };
    }

    await mkdir(path.dirname(path.join(bundleDir, destination)), { recursive: true });
    await copyFile(absoluteSource, path.join(bundleDir, destination));
    return {
      path: destination,
      source: normalizedSource,
      present: true,
      required,
    };
  } catch {
    return {
      path: destination,
      source: normalizedSource,
      present: false,
      required,
    };
  }
}

function renderCommandsRunMarkdown(commands: ReleaseBundleValidationCommand[]): string {
  return [
    "# Commands Run",
    "",
    "These are the RC validation commands that must be run by the operator before using this bundle as release evidence.",
    "",
    "This file is generated by `krn release-check --bundle`; that command does not execute shell validation.",
    "",
    "| Command | Status | Evidence |",
    "| --- | --- | --- |",
    ...commands.map(
      (command) =>
        `| \`${command.command}\` | ${command.status} | ${command.evidence.replaceAll("|", "\\|")} |`,
    ),
    "",
  ].join("\n");
}

function renderValidationSummaryMarkdown(
  result: ReleaseCheckResult,
  report: MinimalOperatorReport | undefined,
  evalResult: MinimalEvalResult | undefined,
): string {
  return [
    "# Validation Summary",
    "",
    `Release check status: ${result.status}`,
    `Operator report verdict: ${report?.verdict ?? "missing"}`,
    `Eval status: ${evalResult?.status ?? "missing"}`,
    `Eval pass/fail: ${evalResult?.passCount ?? 0}/${evalResult?.failCount ?? 0}`,
    "",
    "## Blockers",
    "",
    ...markdownList(result.blockers),
    "",
    "## Warnings",
    "",
    ...markdownList(result.warnings),
    "",
    "## Note",
    "",
    "Release-check inspects local files and current artifacts. It does not run lint, typecheck, tests, verify, Codex, network calls, package publication, or GitHub APIs.",
    "",
  ].join("\n");
}

function renderEvidenceSummaryMarkdown(input: {
  result: ReleaseCheckResult;
  report?: MinimalOperatorReport | undefined;
  evalResult?: MinimalEvalResult | undefined;
  reportBundle?: MinimalReportBundleManifest | undefined;
  hookTrustStatus: string;
}): string {
  const reportBundleFiles = input.reportBundle?.files ?? [];
  const missingReportBundleFiles = reportBundleFiles
    .filter((file) => file.present === false)
    .map((file) => file.path)
    .filter((file): file is string => typeof file === "string");

  return [
    "# Evidence Summary",
    "",
    `Release check: ${input.result.status}`,
    `Operator report: ${input.report?.verdict ?? "missing"}`,
    `Report bundle manifest: ${input.reportBundle?.schema ?? "missing"}`,
    `Eval: ${input.evalResult?.status ?? "missing"}`,
    `Production proof: false`,
    `Hook trust: ${input.hookTrustStatus}`,
    `Real-repo evidence: ${input.report?.realRepoEvidence?.status ?? "missing"}`,
    `Historical caveats: ${input.report?.historicalCaveatCount ?? "unknown"}`,
    "",
    "## Missing Report Bundle Files",
    "",
    ...markdownList(missingReportBundleFiles),
    "",
    "## Fixture Evals",
    "",
    ...markdownList(
      (input.evalResult?.fixtures ?? []).map(
        (fixture) => `${fixture.name ?? "unnamed"}: ${fixture.status ?? "unknown"}`,
      ),
    ),
    "",
  ].join("\n");
}

function renderKnownGapsMarkdown(report: MinimalOperatorReport | undefined): string {
  return [
    "# Known Gaps",
    "",
    "- Local evidence only; this bundle is not production proof.",
    "- `productionProof` remains `false`.",
    `- Hook trust remains ${report?.hookTrust?.status ?? "unproven"} unless separate non-bypass hook provenance is present.`,
    "- Real product-code mutation in an external target repo remains approval-gated.",
    "- Target repository push is not part of this release bundle.",
    "- Package publishing is not part of this release bundle.",
    "- Raw trace dumps are not copied into the release bundle by default.",
    "- Stale historical caveats are visible through the operator report and evidence summary.",
    "",
  ].join("\n");
}

function renderNoProtectedDataNote(): string {
  return [
    "# No Protected Data Note",
    "",
    "This bundle is assembled from an explicit allowlist under `.krn/current` plus generated summaries.",
    "",
    "It does not intentionally include `.env`, `.env.*`, dumps, uploads/media, client documents, credentials, private corpora, protected corpora, raw trace dumps, or external target artifacts.",
    "",
    "Paths with secret-looking markers are refused by the copy allowlist.",
    "",
  ].join("\n");
}

async function writeReleaseBundle(
  runtime: CliRuntime,
  input: { result: ReleaseCheckResult },
): Promise<ReleaseBundleManifest> {
  const bundleDir = path.join(runtime.cwd, ".krn", "current", "release-bundle");
  await mkdir(bundleDir, { recursive: true });

  const report = await readJsonFile<MinimalOperatorReport>(
    path.join(runtime.cwd, ".krn", "current", "operator-report.json"),
  );
  const evalResult = await readJsonFile<MinimalEvalResult>(
    path.join(runtime.cwd, ".krn", "current", "eval-result.json"),
  );
  const reportBundle = await readJsonFile<MinimalReportBundleManifest>(
    path.join(runtime.cwd, ".krn", "current", "report-bundle", "manifest.json"),
  );
  const hookTrustStatus = report?.hookTrust?.status ?? "unproven";

  const evidenceSummaryMarkdown = renderEvidenceSummaryMarkdown({
    result: input.result,
    report,
    evalResult,
    reportBundle,
    hookTrustStatus,
  });
  const evidenceSummaryJson = {
    schema: "krn-release-bundle-evidence-summary-v1",
    generatedAt: input.result.generatedAt,
    releaseCheckStatus: input.result.status,
    operatorReportVerdict: report?.verdict ?? "missing",
    reportBundleSchema: reportBundle?.schema ?? "missing",
    evalStatus: evalResult?.status ?? "missing",
    productionProof: false,
    hookTrustStatus,
    realRepoEvidenceStatus: report?.realRepoEvidence?.status ?? "missing",
    historicalCaveatCount: report?.historicalCaveatCount ?? null,
  };
  const validationSummaryMarkdown = renderValidationSummaryMarkdown(
    input.result,
    report,
    evalResult,
  );
  const validationSummaryJson = {
    schema: "krn-release-bundle-validation-summary-v1",
    generatedAt: input.result.generatedAt,
    releaseCheckStatus: input.result.status,
    blockers: input.result.blockers,
    warnings: input.result.warnings,
    commands: releaseValidationCommands,
    note: "release-check --bundle does not execute shell validation commands",
  };
  const generatedFiles: Array<{ path: string; content: string; required: boolean }> = [
    {
      path: "evidence-summary.md",
      content: evidenceSummaryMarkdown,
      required: true,
    },
    {
      path: "evidence-summary.json",
      content: `${JSON.stringify(evidenceSummaryJson, null, 2)}\n`,
      required: true,
    },
    {
      path: "known-gaps.md",
      content: renderKnownGapsMarkdown(report),
      required: true,
    },
    {
      path: "commands-run.md",
      content: renderCommandsRunMarkdown(releaseValidationCommands),
      required: true,
    },
    {
      path: "validation-summary.md",
      content: validationSummaryMarkdown,
      required: true,
    },
    {
      path: "validation-summary.json",
      content: `${JSON.stringify(validationSummaryJson, null, 2)}\n`,
      required: true,
    },
    {
      path: "no-protected-data.md",
      content: renderNoProtectedDataNote(),
      required: true,
    },
  ];

  for (const file of generatedFiles) {
    await writeFile(path.join(bundleDir, file.path), file.content, "utf8");
  }

  const copiedFiles = await Promise.all([
    copyReleaseBundleFile(
      runtime.cwd,
      bundleDir,
      ".krn/current/release-check.json",
      "release-check.json",
      true,
    ),
    copyReleaseBundleFile(
      runtime.cwd,
      bundleDir,
      ".krn/current/release-check.md",
      "release-check.md",
      true,
    ),
    copyReleaseBundleFile(
      runtime.cwd,
      bundleDir,
      ".krn/current/operator-report.md",
      "operator-report.md",
      true,
    ),
    copyReleaseBundleFile(
      runtime.cwd,
      bundleDir,
      ".krn/current/operator-report.json",
      "operator-report.json",
      true,
    ),
    copyReleaseBundleFile(
      runtime.cwd,
      bundleDir,
      ".krn/current/operator-report.html",
      "operator-report.html",
      true,
    ),
    copyReleaseBundleFile(
      runtime.cwd,
      bundleDir,
      ".krn/current/report-bundle/manifest.json",
      "report-bundle/manifest.json",
      true,
    ),
  ]);

  const files: ReleaseBundleFile[] = [
    {
      path: "manifest.json",
      source: "generated:release-check --bundle",
      present: true,
      required: true,
    },
    ...generatedFiles.map((file) => ({
      path: file.path,
      source: "generated:release-check --bundle",
      present: true,
      required: file.required,
    })),
    ...copiedFiles,
  ];
  const manifest: ReleaseBundleManifest = {
    schema: "krn-release-bundle-manifest-v1",
    generatedAt: input.result.generatedAt,
    releaseCheckStatus: input.result.status,
    productionProof: false,
    hookTrustStatus,
    files,
    validationCommands: releaseValidationCommands,
    limits: [
      "Local release evidence only.",
      "The bundle does not execute validation commands.",
      "Only allowlisted .krn/current artifacts are copied.",
      "Raw trace dumps, protected-looking paths, external assets, and giant files are excluded.",
      "The bundle does not claim hook trust or production proof.",
    ],
  };

  await writeFile(path.join(bundleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
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
    await mkdir(path.join(runtime.cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(runtime.cwd, ".krn", "current", "release-check.json"),
      `${JSON.stringify(result, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(runtime.cwd, ".krn", "current", "release-check.md"),
      markdown,
      "utf8",
    );
  }

  const bundleManifest = options.bundle ? await writeReleaseBundle(runtime, { result }) : undefined;

  if (options.format === "json") {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return result.status === "fail" ? 1 : 0;
  }

  runtime.stdout(
    options.bundle
      ? `${markdown}\nBundle: .krn/current/release-bundle/manifest.json\nFiles: ${bundleManifest?.files.length ?? 0}\n`
      : markdown,
  );
  return result.status === "fail" ? 1 : 0;
}
