import type { ReviewResult } from "./commands/review.js";

export function renderReviewMarkdown(result: ReviewResult): string {
  return [
    "# KRN Review",
    "",
    `Status: ${result.status}`,
    `Generated at: ${result.generatedAt}`,
    "",
    "## Records",
    "",
    "| Reviewer | Status | Confidence | Summary |",
    "| --- | --- | --- | --- |",
    ...result.reviewers.map(
      (item) =>
        `| ${item.reviewer} | ${item.status} | ${item.confidence} | ${item.summary.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## Findings",
    "",
    ...result.reviewers.flatMap((item) => [
      `### ${item.reviewer}`,
      "",
      ...(item.findings.length > 0 ? item.findings.map((finding) => `- ${finding}`) : ["- none"]),
      "",
      "Next actions:",
      ...(item.nextActions.length > 0
        ? item.nextActions.map((action) => `- ${action}`)
        : ["- none"]),
      "",
    ]),
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
    "- Deterministic reviewers read local artifacts only.",
    "- Reviewers do not edit files, call models, execute verify commands, commit, or push.",
    "- Review records are operator guidance, not production proof.",
    "",
  ].join("\n");
}
