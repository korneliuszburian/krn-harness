import { readFile } from "node:fs/promises";
import path from "node:path";
import { deriveReportVerdict, type ProofSeverity, readJsonFile } from "../../core/src/index.js";
import {
  getHistoricalCaveats,
  getLatestExecutionResult,
  getStaleBlockingArtifacts,
  listRuntimeArtifacts,
  type ArtifactRecord,
} from "./artifact-scope.js";
import { currentStatePath } from "./current-state.js";
import type { CliIdentity } from "./identity.js";
import {
  buildOperatorSummary,
  type OperatorSummary,
  type OperatorSummaryStatus,
} from "./operator-summary.js";

export interface OperatorReport {
  schema: "krn-operator-report-v1";
  generatedAt: string;
  repoPath: string;
  verdict: ProofSeverity;
  summaryStatus: OperatorSummaryStatus;
  task: {
    status: OperatorSummaryStatus;
    id?: string | undefined;
    text?: string | undefined;
    classification?: string | undefined;
  };
  execution: {
    status: string;
    kind?: string | undefined;
    validationStatus?: string | undefined;
    changedFiles: string[];
    artifactPath?: string | undefined;
  };
  changedFiles: string[];
  verify: {
    status: OperatorSummaryStatus;
    mode?: string | undefined;
    profileName?: string | undefined;
    executedCommands?: number | undefined;
    totalCommands?: number | undefined;
    summary: string;
  };
  context: {
    status: OperatorSummaryStatus;
    stop?: boolean | undefined;
    totalItems?: number | undefined;
    missingItems?: number | undefined;
    overInclusionRisk?: string | undefined;
    summary: string;
  };
  realRepoEvidence: {
    status: OperatorSummaryStatus;
    summary: string;
    latestPath?: string | undefined;
    staleHistoricalBlocker: boolean;
  };
  hookTrust: {
    status: string;
    hookReceivedCount: number;
    summary: string;
  };
  productionProof: {
    status: "not-production-proof";
    value: false;
    summary: string;
  };
  blockers: string[];
  warnings: string[];
  nextActions: string[];
  historicalCaveats: Array<{
    path: string;
    scope: string;
    reason: string;
  }>;
  historicalCaveatCount: number;
  historicalCaveatsOmitted: number;
  artifactPaths: Array<{
    path: string;
    scope: string;
  }>;
  artifactPathCount: number;
  artifactPathsOmitted: number;
}

interface BuildOperatorReportInput {
  cwd: string;
  generatedAt: string;
  identity?: CliIdentity | undefined;
}

interface ExecutionResultSummary {
  executionKind?: string | undefined;
  validationStatus?: string | undefined;
  changedFiles?: unknown;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean);
}

async function readCurrentSummary(cwd: string): Promise<OperatorSummary | undefined> {
  return readJsonFile<OperatorSummary>(currentStatePath(cwd, "operator-summary.json"));
}

async function readExecutionSummary(
  artifact: ArtifactRecord | undefined,
): Promise<ExecutionResultSummary | undefined> {
  if (!artifact) return undefined;
  return readJsonFile<ExecutionResultSummary>(artifact.absolutePath);
}

function signalSeverity(status: OperatorSummaryStatus): ProofSeverity {
  if (status === "fail") return "fail";
  if (status === "blocked") return "blocked";
  if (
    status === "warn" ||
    status === "missing" ||
    status === "skipped" ||
    status === "readiness" ||
    status === "unproven" ||
    status === "manual-diagnostic-only" ||
    status === "partially-proven"
  ) {
    return "warn";
  }
  return "pass";
}

function isStaleRealRepoBlocker(
  summary: OperatorSummary,
  staleArtifacts: ArtifactRecord[],
): boolean {
  const latestPath = summary.realRepoDogfood.latestPath;
  return (
    summary.realRepoDogfood.status === "blocked" &&
    latestPath !== undefined &&
    staleArtifacts.some((artifact) => artifact.path === latestPath)
  );
}

function reportVerdict(summary: OperatorSummary, staleRealRepoBlocker: boolean): ProofSeverity {
  const statuses: ProofSeverity[] = [
    signalSeverity(summary.currentTask.status),
    signalSeverity(summary.context.status),
    signalSeverity(summary.graph.status),
    signalSeverity(summary.verify.status),
    signalSeverity(summary.handoff.status),
    signalSeverity(summary.hooks.status),
    staleRealRepoBlocker ? "warn" : signalSeverity(summary.realRepoDogfood.status),
    signalSeverity(summary.reviewers.status),
    signalSeverity(summary.memory.status),
  ];

  return deriveReportVerdict(statuses);
}

function filterStaleBlockers(values: string[], staleRealRepoBlocker: boolean): string[] {
  if (!staleRealRepoBlocker) return values;
  return values.filter((value) => !value.startsWith("realRepoDogfood:"));
}

function filterStaleNextActions(values: string[], staleRealRepoBlocker: boolean): string[] {
  if (!staleRealRepoBlocker) return values;
  return values.filter((value) => value !== "Resolve blockers before claiming completion.");
}

function historicalCaveatText(artifact: { path: string; scope: string; reason: string }): string {
  return `${artifact.scope}: ${artifact.path} (${artifact.reason})`;
}

function artifactScopePriority(scope: string): number {
  if (scope === "current") return 0;
  if (scope === "stale-blocking") return 1;
  if (scope === "foreign-target") return 2;
  if (scope === "test-fixture") return 3;
  if (scope === "historical") return 4;
  return 5;
}

function compactArtifacts<T extends { path: string; scope: string }>(
  items: T[],
  limit: number,
): T[] {
  return [...items]
    .sort(
      (left, right) =>
        artifactScopePriority(left.scope) - artifactScopePriority(right.scope) ||
        left.path.localeCompare(right.path),
    )
    .slice(0, limit);
}

export async function buildOperatorReport(
  input: BuildOperatorReportInput,
): Promise<OperatorReport> {
  const summary =
    (await readCurrentSummary(input.cwd)) ??
    (await buildOperatorSummary({
      cwd: input.cwd,
      generatedAt: input.generatedAt,
      identity: input.identity,
    }));
  const [artifacts, historicalCaveats, staleArtifacts, latestExecutionArtifact] = await Promise.all(
    [
      listRuntimeArtifacts(input.cwd),
      getHistoricalCaveats(input.cwd),
      getStaleBlockingArtifacts(input.cwd),
      getLatestExecutionResult(input.cwd),
    ],
  );
  const latestExecution = await readExecutionSummary(latestExecutionArtifact);
  const changedFiles = Array.isArray(latestExecution?.changedFiles)
    ? latestExecution.changedFiles.filter((item): item is string => typeof item === "string")
    : [];
  const staleRealRepoBlocker = isStaleRealRepoBlocker(summary, staleArtifacts);
  const blockers = filterStaleBlockers(summary.blockers, staleRealRepoBlocker);
  const compactHistoricalCaveats = compactArtifacts(historicalCaveats, 50);
  const compactArtifactPaths = compactArtifacts(artifacts, 80);
  const hookTrustStatus = summary.hooks.hookTrustStatus ?? summary.hooks.status;
  const warnings = unique([
    ...summary.warnings,
    ...(staleRealRepoBlocker
      ? [
          "realRepoDogfood: Historical source dogfood blocker is a caveat, not current report blocker.",
        ]
      : []),
    ...(historicalCaveats.length > 0
      ? [
          `Historical .krn caveats: ${historicalCaveats.length}; run \`krn artifacts list --scope historical\` for the full list.`,
        ]
      : []),
  ]);

  return {
    schema: "krn-operator-report-v1",
    generatedAt: input.generatedAt,
    repoPath: input.cwd,
    verdict: reportVerdict(summary, staleRealRepoBlocker),
    summaryStatus: summary.status,
    task: {
      status: summary.currentTask.status,
      id: summary.currentTask.id,
      text: summary.currentTask.task,
      classification: summary.currentTask.classification,
    },
    execution: {
      status: latestExecutionArtifact ? "present" : "missing",
      kind: latestExecution?.executionKind,
      validationStatus: latestExecution?.validationStatus,
      changedFiles,
      artifactPath: latestExecutionArtifact?.path,
    },
    changedFiles,
    verify: {
      status: summary.verify.status,
      mode: summary.verify.mode,
      profileName: summary.verify.profileName,
      executedCommands: summary.verify.executedCommands,
      totalCommands: summary.verify.totalCommands,
      summary: summary.verify.summary,
    },
    context: {
      status: summary.context.status,
      stop: summary.context.stop,
      totalItems: summary.context.totalItems,
      missingItems: summary.context.missingItems,
      overInclusionRisk: summary.context.overInclusionRisk,
      summary: summary.context.summary,
    },
    realRepoEvidence: {
      status: staleRealRepoBlocker ? "warn" : summary.realRepoDogfood.status,
      summary: staleRealRepoBlocker
        ? "Historical source dogfood blocker is visible as a caveat; it is not fatal to this report."
        : summary.realRepoDogfood.summary,
      latestPath: summary.realRepoDogfood.latestPath,
      staleHistoricalBlocker: staleRealRepoBlocker,
    },
    hookTrust: {
      status: hookTrustStatus,
      hookReceivedCount: summary.hooks.hookReceivedCount,
      summary: summary.hooks.summary,
    },
    productionProof: {
      status: "not-production-proof",
      value: false,
      summary: "KRN report is local operator evidence only; production proof remains false.",
    },
    blockers,
    warnings,
    nextActions: unique(filterStaleNextActions(summary.nextActions, staleRealRepoBlocker)),
    historicalCaveats: compactHistoricalCaveats.map((artifact) => ({
      path: artifact.path,
      scope: artifact.scope,
      reason: artifact.reason,
    })),
    historicalCaveatCount: historicalCaveats.length,
    historicalCaveatsOmitted: Math.max(
      0,
      historicalCaveats.length - compactHistoricalCaveats.length,
    ),
    artifactPaths: compactArtifactPaths.map((artifact) => ({
      path: artifact.path,
      scope: artifact.scope,
    })),
    artifactPathCount: artifacts.length,
    artifactPathsOmitted: Math.max(0, artifacts.length - compactArtifactPaths.length),
  };
}

function markdownList(values: string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- none"];
}

export function renderOperatorReportMarkdown(report: OperatorReport): string {
  return [
    "# KRN Operator Report",
    "",
    `Generated at: ${report.generatedAt}`,
    `Repo: ${report.repoPath}`,
    `Verdict: ${report.verdict}`,
    `Production proof: ${report.productionProof.value}`,
    "",
    "## Task",
    "",
    `Status: ${report.task.status}`,
    `Task ID: ${report.task.id ?? "none"}`,
    `Task: ${report.task.text ?? "none"}`,
    "",
    "## Execution",
    "",
    `Status: ${report.execution.status}`,
    `Kind: ${report.execution.kind ?? "none"}`,
    `Validation: ${report.execution.validationStatus ?? "none"}`,
    `Artifact: ${report.execution.artifactPath ?? "none"}`,
    "",
    "Changed files:",
    ...markdownList(report.changedFiles),
    "",
    "## Verify",
    "",
    `Status: ${report.verify.status}`,
    `Mode: ${report.verify.mode ?? "none"}`,
    `Executed commands: ${report.verify.executedCommands ?? 0}/${report.verify.totalCommands ?? 0}`,
    report.verify.summary,
    "",
    "## Context",
    "",
    `Status: ${report.context.status}`,
    `Items: ${report.context.totalItems ?? 0}`,
    `Missing: ${report.context.missingItems ?? 0}`,
    `Over-inclusion risk: ${report.context.overInclusionRisk ?? "unknown"}`,
    report.context.summary,
    "",
    "## Real-Repo Evidence",
    "",
    `Status: ${report.realRepoEvidence.status}`,
    `Latest path: ${report.realRepoEvidence.latestPath ?? "none"}`,
    `Historical blocker downgraded: ${report.realRepoEvidence.staleHistoricalBlocker}`,
    report.realRepoEvidence.summary,
    "",
    "## Hook Trust",
    "",
    `Status: ${report.hookTrust.status}`,
    `hook.received count: ${report.hookTrust.hookReceivedCount}`,
    report.hookTrust.summary,
    "",
    "## Production Proof",
    "",
    report.productionProof.summary,
    "",
    "## Blockers",
    "",
    ...markdownList(report.blockers),
    "",
    "## Warnings",
    "",
    ...markdownList(report.warnings),
    "",
    "## Next Actions",
    "",
    ...markdownList(report.nextActions),
    "",
    "## Historical Caveats",
    "",
    `Total: ${report.historicalCaveatCount}`,
    `Omitted from report: ${report.historicalCaveatsOmitted}`,
    "",
    ...markdownList(report.historicalCaveats.map(historicalCaveatText)),
    "",
    "## Artifact Paths",
    "",
    `Total: ${report.artifactPathCount}`,
    `Omitted from report: ${report.artifactPathsOmitted}`,
    "",
    ...markdownList(report.artifactPaths.map((artifact) => `${artifact.scope}: ${artifact.path}`)),
    "",
    "## Limits",
    "",
    "- This report reads local artifacts only.",
    "- It does not call Codex, run verify commands, inspect protected data, or claim production proof.",
    "- Historical `.krn` caveats are visible but do not automatically become current blockers.",
    "",
  ].join("\n");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function htmlList(values: string[]): string {
  const items = values.length > 0 ? values : ["none"];
  return `<ul>${items.map((value) => `<li>${escapeHtml(value)}</li>`).join("")}</ul>`;
}

function htmlRows(rows: Array<[string, string]>): string {
  return rows
    .map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value)}</td></tr>`)
    .join("");
}

export function renderOperatorReportHtml(report: OperatorReport): string {
  const artifactRows = report.artifactPaths
    .map(
      (artifact) =>
        `<tr><td>${escapeHtml(artifact.scope)}</td><td><code>${escapeHtml(artifact.path)}</code></td></tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KRN Operator Report</title>
  <style>
    :root { color-scheme: light; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #f7f8f6; color: #18201c; }
    main { max-width: 1120px; margin: 0 auto; padding: 32px 20px 48px; }
    header { border-bottom: 2px solid #1f352a; padding-bottom: 18px; margin-bottom: 24px; }
    h1 { font-size: 30px; margin: 0 0 8px; }
    h2 { font-size: 19px; margin: 28px 0 12px; }
    nav { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 14px; }
    nav a { color: #0f5132; text-decoration: none; border: 1px solid #b7c8bd; padding: 5px 8px; border-radius: 6px; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-weight: 700; background: #dfeee6; color: #174b2d; }
    .badge.warn, .badge.blocked { background: #fff0c2; color: #684a00; }
    .badge.fail { background: #ffd8d1; color: #7a1e11; }
    section { border-top: 1px solid #d8dfd8; padding-top: 8px; }
    table { border-collapse: collapse; width: 100%; background: #ffffff; }
    th, td { border: 1px solid #d8dfd8; padding: 8px; text-align: left; vertical-align: top; }
    th { width: 220px; background: #eef3ef; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.94em; }
    .note { color: #526057; }
  </style>
</head>
<body>
<main>
  <header>
    <h1>KRN Operator Report</h1>
    <div>Verdict: <span class="badge ${escapeHtml(report.verdict)}">${escapeHtml(report.verdict)}</span></div>
    <div class="note">Generated at ${escapeHtml(report.generatedAt)} for ${escapeHtml(report.repoPath)}</div>
    <nav>
      <a href="#task">Task</a><a href="#execution">Execution</a><a href="#verify">Verify</a><a href="#context">Context</a><a href="#proof">Proof</a><a href="#actions">Actions</a><a href="#artifacts">Artifacts</a>
    </nav>
  </header>
  <section id="task"><h2>Task</h2><table>${htmlRows([
    ["Status", report.task.status],
    ["Task ID", report.task.id ?? "none"],
    ["Task", report.task.text ?? "none"],
  ])}</table></section>
  <section id="execution"><h2>Execution</h2><table>${htmlRows([
    ["Status", report.execution.status],
    ["Kind", report.execution.kind ?? "none"],
    ["Validation", report.execution.validationStatus ?? "none"],
    ["Changed files", report.changedFiles.join(", ") || "none"],
  ])}</table></section>
  <section id="verify"><h2>Verify</h2><table>${htmlRows([
    ["Status", report.verify.status],
    ["Mode", report.verify.mode ?? "none"],
    ["Executed", `${report.verify.executedCommands ?? 0}/${report.verify.totalCommands ?? 0}`],
    ["Summary", report.verify.summary],
  ])}</table></section>
  <section id="context"><h2>Context</h2><table>${htmlRows([
    ["Status", report.context.status],
    ["Items", String(report.context.totalItems ?? 0)],
    ["Missing", String(report.context.missingItems ?? 0)],
    ["Over-inclusion risk", report.context.overInclusionRisk ?? "unknown"],
  ])}</table></section>
  <section id="proof"><h2>Proof</h2><table>${htmlRows([
    ["Real-repo evidence", `${report.realRepoEvidence.status}: ${report.realRepoEvidence.summary}`],
    ["Hook trust", `${report.hookTrust.status}: ${report.hookTrust.summary}`],
    ["Production proof", `${report.productionProof.value}: ${report.productionProof.summary}`],
  ])}</table></section>
  <section id="actions"><h2>Blockers</h2>${htmlList(report.blockers)}<h2>Warnings</h2>${htmlList(report.warnings)}<h2>Next Actions</h2>${htmlList(report.nextActions)}</section>
  <section id="artifacts"><h2>Historical Caveats</h2><p>Total: ${report.historicalCaveatCount}; omitted from report: ${report.historicalCaveatsOmitted}</p>${htmlList(report.historicalCaveats.map(historicalCaveatText))}<h2>Artifact Paths</h2><p>Total: ${report.artifactPathCount}; omitted from report: ${report.artifactPathsOmitted}</p><table><tr><th>Scope</th><th>Path</th></tr>${artifactRows}</table></section>
  <p class="note">Local file only. No network, server, external CSS, external JS, or production-proof claim.</p>
</main>
</body>
</html>
`;
}

export async function readOperatorReportMarkdown(cwd: string): Promise<string | undefined> {
  try {
    return await readFile(currentStatePath(cwd, "operator-report.md"), "utf8");
  } catch {
    return undefined;
  }
}
