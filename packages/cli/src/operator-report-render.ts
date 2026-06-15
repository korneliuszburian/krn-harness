import type { OperatorReport } from "./operator-report.js";

function markdownList(values: string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- none"];
}

function historicalCaveatText(artifact: { path: string; scope: string; reason: string }): string {
  return `${artifact.scope}: ${artifact.path} (${artifact.reason})`;
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
