import type { OperatorSummary, OperatorSummarySignal } from "./operator-summary.js";

function renderList(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- none"];
}

function renderSignal(label: string, signal: OperatorSummarySignal): string[] {
  return [
    `### ${label}`,
    "",
    `Status: ${signal.status}`,
    `Confidence: ${signal.confidence}`,
    `Summary: ${signal.summary}`,
    `Artifacts: ${signal.artifacts.length > 0 ? signal.artifacts.join(", ") : "none"}`,
    "",
  ];
}

export function renderOperatorSummaryMarkdown(summary: OperatorSummary): string {
  return [
    "# KRN Operator Summary",
    "",
    `Status: ${summary.status}`,
    `Generated at: ${summary.generatedAt}`,
    `Repo: ${summary.repoPath}`,
    "",
    "## Task",
    "",
    `Task ID: ${summary.currentTask.id ?? "missing"}`,
    `Task: ${summary.currentTask.task ?? "missing"}`,
    "",
    "## Signals",
    "",
    ...renderSignal("identity", summary.identity),
    ...renderSignal("context", summary.context),
    ...renderSignal("graph", summary.graph),
    ...renderSignal("verify", summary.verify),
    ...renderSignal("handoff", summary.handoff),
    ...renderSignal("hooks", summary.hooks),
    ...renderSignal("realRepoDogfood", summary.realRepoDogfood),
    ...renderSignal("reviewers", summary.reviewers),
    ...renderSignal("memory", summary.memory),
    "## Blockers",
    "",
    ...renderList(summary.blockers),
    "",
    "## Warnings",
    "",
    ...renderList(summary.warnings),
    "",
    "## Risks",
    "",
    ...renderList(summary.risks),
    "",
    "## Next Actions",
    "",
    ...renderList(summary.nextActions),
    "",
    "## Artifacts",
    "",
    "| Label | Status | Path |",
    "| --- | --- | --- |",
    ...summary.artifacts.map(
      (artifact) => `| ${artifact.label} | ${artifact.status} | ${artifact.path} |`,
    ),
    "",
    "## Limits",
    "",
    "- This summary reads local artifacts only.",
    "- Skipped, readiness, missing, unproven, manual-diagnostic-only, and partially-proven are never production proof states.",
    "- This summary does not run verify commands, call Codex, inspect protected data, or claim production proof.",
    "",
  ].join("\n");
}
