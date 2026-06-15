import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { runUninstallPlan, type UninstallResult } from "../install-lifecycle.js";
import type { CliRuntime } from "../runtime.js";

interface UninstallArgs {
  dryRun: boolean;
  confirm: boolean;
  format: "markdown" | "json";
  error?: string | undefined;
}

function parseUninstallArgs(args: string[]): UninstallArgs {
  const parsed: UninstallArgs = {
    dryRun: false,
    confirm: false,
    format: "markdown",
  };

  for (const arg of args) {
    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--confirm") {
      parsed.confirm = true;
      continue;
    }

    if (arg === "--json") {
      parsed.format = "json";
      continue;
    }

    return {
      ...parsed,
      error: "KRN uninstall: expected `krn uninstall --dry-run|--confirm [--json]`",
    };
  }

  if (parsed.dryRun === parsed.confirm) {
    return {
      ...parsed,
      error: "KRN uninstall: requires exactly one of --dry-run or --confirm",
    };
  }

  return parsed;
}

function renderUninstallMarkdown(result: UninstallResult): string {
  return [
    `KRN uninstall: ${result.status}`,
    `dry_run: ${String(result.dryRun)}`,
    `confirm: ${String(result.confirm)}`,
    `removed: ${result.removed}`,
    `candidates: ${result.candidates.length}`,
    `refused: ${result.refused.length}`,
    "",
    "Candidates:",
    ...(result.candidates.length > 0
      ? result.candidates.map((candidate) => `- ${candidate.status} ${candidate.path}`)
      : ["- none"]),
    "",
    "Refused:",
    ...(result.refused.length > 0
      ? result.refused.map((refusal) => `- ${refusal.path}: ${refusal.reason}`)
      : ["- none"]),
    "",
  ].join("\n");
}

function renderUninstallResultMarkdown(result: UninstallResult): string {
  return [
    "# KRN Uninstall Result",
    "",
    `Status: ${result.status}`,
    `Dry run: ${String(result.dryRun)}`,
    `Confirm: ${String(result.confirm)}`,
    `Generated at: ${result.generatedAt}`,
    `Removed: ${result.removed}`,
    "",
    "## Candidates",
    "",
    ...(result.candidates.length > 0
      ? result.candidates.map((candidate) => `- ${candidate.path}: ${candidate.detail}`)
      : ["- none"]),
    "",
    "## Refused",
    "",
    ...(result.refused.length > 0
      ? result.refused.map((refusal) => `- ${refusal.path}: ${refusal.reason}`)
      : ["- none"]),
    "",
    "## Preserved Runtime State",
    "",
    ...result.preserved.map((item) => `- ${item}`),
    "",
    "## Limits",
    "",
    "- Uninstall removes only files with the KRN managed marker.",
    "- `.krn/current`, graph, traces, runs, and memory are preserved by default.",
    "- There is no unsafe force mode.",
    "",
  ].join("\n");
}

export async function uninstallCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const parsed = parseUninstallArgs(args);
  if (parsed.error) {
    runtime.stderr(`${parsed.error}\n`);
    return 1;
  }

  const result = await runUninstallPlan(runtime.cwd, {
    dryRun: parsed.dryRun,
    confirm: parsed.confirm,
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
  });

  if (parsed.confirm) {
    await writeCurrentJson(runtime.cwd, "uninstall-result.json", result);
    await writeCurrentMarkdown(
      runtime.cwd,
      "uninstall-result.md",
      renderUninstallResultMarkdown(result),
    );
  }

  if (parsed.format === "json") {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  runtime.stdout(renderUninstallMarkdown(result));
  return 0;
}
