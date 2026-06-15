import type { ContextPackage } from "./schema.js";

function titleFor(bucketName: keyof ContextPackage["buckets"]): string {
  return {
    mustRead: "Must Read",
    shouldRead: "Should Read",
    referenceOnly: "Reference Only",
    doNotUse: "Do Not Use",
    missingContext: "Missing Context",
  }[bucketName];
}

export function renderContextPackageMarkdown(pkg: ContextPackage): string {
  const lines = [
    "# KRN Context Package",
    "",
    `Task ID: ${pkg.taskId ?? "none"}`,
    `STOP: ${pkg.stop ? "true" : "false"}`,
    `Confidence: ${pkg.coverage.confidence}`,
    `Coverage: ${pkg.coverage.present}/${pkg.coverage.required} required present`,
    `Missing: ${pkg.coverage.missing}`,
    `Items: ${pkg.compactness.totalItems} total, ${pkg.compactness.markdownVisibleItems} shown, ${pkg.compactness.markdownHiddenItems} hidden from markdown`,
    `Over-inclusion: ${pkg.overInclusion.risk} (score ${pkg.overInclusion.score}, active ${pkg.overInclusion.activeItems}, reference ${pkg.overInclusion.referenceOnlyItems})`,
    `Budget: ${pkg.budget.status}, ${pkg.budget.retainedTokens}/${pkg.budget.maxTokens} estimated tokens retained (${pkg.budget.prunedItems.length} pruned)`,
  ];

  if (pkg.stopReason) {
    lines.push(`Reason: ${pkg.stopReason}`);
  }

  for (const bucketName of [
    "mustRead",
    "shouldRead",
    "referenceOnly",
    "doNotUse",
    "missingContext",
  ] as const) {
    lines.push("", `## ${titleFor(bucketName)}`, "");

    const items = pkg.buckets[bucketName];
    const summary = pkg.bucketSummaries[bucketName];
    const selectors = summary.selectors.length > 0 ? summary.selectors.join(", ") : "none";
    lines.push(
      `Summary: ${summary.totalItems} total, showing ${summary.shownInMarkdown}/${summary.markdownBudget}, hidden ${summary.hiddenFromMarkdown}, selectors: ${selectors}`,
      "",
    );

    if (items.length === 0) {
      lines.push("- none");
      continue;
    }

    for (const item of items.slice(0, summary.markdownBudget)) {
      const provenanceParts = [];

      if (item.source || item.selector) {
        provenanceParts.push(`source: ${item.source ?? "unknown"}`);
        provenanceParts.push(`selector: ${item.selector ?? "none"}`);
      }

      if (item.memoryId) {
        provenanceParts.push(`memory: ${item.memoryId}`);
      }

      if (item.approvedAt) {
        provenanceParts.push(`approved: ${item.approvedAt}`);
      }

      if (item.evidencePath) {
        provenanceParts.push(`evidence: ${item.evidencePath}`);
      }

      const provenance = provenanceParts.length > 0 ? ` [${provenanceParts.join(", ")}]` : "";
      const operatorMessage = item.operatorMessage ? ` ${item.operatorMessage}` : "";
      lines.push(
        `- ${item.path} (${item.status}, ${item.priority}): ${item.reason}.${operatorMessage}${provenance}`,
      );
    }

    if (summary.hiddenFromMarkdown > 0) {
      lines.push(
        `- +${summary.hiddenFromMarkdown} more item(s) hidden from markdown; see .krn/current/context-package.json`,
      );
    }
  }

  lines.push("");
  return lines.join("\n");
}
