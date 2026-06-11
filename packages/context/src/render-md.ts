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
    `Over-inclusion risk: ${pkg.coverage.overInclusionRisk}`,
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
    if (items.length === 0) {
      lines.push("- none");
      continue;
    }

    for (const item of items) {
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
      lines.push(`- ${item.path} (${item.status}, ${item.priority}): ${item.reason}${provenance}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
