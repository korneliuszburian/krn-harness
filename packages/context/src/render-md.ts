import type { ContextPackage } from "./schema.js";

export function renderContextPackageMarkdown(pkg: ContextPackage): string {
  const lines = [
    "# KRN Context Package",
    "",
    `Task ID: ${pkg.taskId ?? "none"}`,
    `STOP: ${pkg.stop ? "true" : "false"}`,
  ];

  if (pkg.stopReason) {
    lines.push(`Reason: ${pkg.stopReason}`);
  }

  lines.push("", "## Context Items", "");

  for (const item of pkg.items) {
    lines.push(`- ${item.path} (${item.priority}): ${item.reason}`);
  }

  lines.push("");
  return lines.join("\n");
}
