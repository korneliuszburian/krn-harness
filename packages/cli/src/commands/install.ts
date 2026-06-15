import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { buildCliIdentity } from "../identity.js";
import { type InstallResult, runInstallPlan } from "../install-lifecycle.js";
import type { CliRuntime } from "../runtime.js";

interface InstallArgs {
  dryRun: boolean;
  format: "markdown" | "json";
  configProfile?: "minimal" | "readonly-python" | "node-test" | "quality" | undefined;
  error?: string | undefined;
}

function parseInstallArgs(args: string[]): InstallArgs {
  const parsed: InstallArgs = {
    dryRun: false,
    format: "markdown",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      parsed.dryRun = true;
      continue;
    }

    if (arg === "--json") {
      parsed.format = "json";
      continue;
    }

    if (arg === "--with-config") {
      parsed.configProfile = parsed.configProfile ?? "minimal";
      continue;
    }

    if (arg === "--config-profile") {
      const value = args[index + 1];
      if (
        value !== "minimal" &&
        value !== "readonly-python" &&
        value !== "node-test" &&
        value !== "quality"
      ) {
        return {
          ...parsed,
          error: "KRN install: expected --config-profile minimal|readonly-python|node-test|quality",
        };
      }
      parsed.configProfile = value;
      index += 1;
      continue;
    }

    return {
      ...parsed,
      error:
        "KRN install: expected `krn install [--dry-run] [--json] [--with-config] [--config-profile <name>]`",
    };
  }

  return parsed;
}

function renderInstallMarkdown(result: InstallResult): string {
  const lines = [`KRN install: ${result.status}`];

  if (result.reason) {
    lines.push(`reason: ${result.reason}`);
  }

  lines.push(
    `dry_run: ${String(result.dryRun)}`,
    `created: ${result.created}`,
    `skipped: ${result.skipped}`,
  );

  for (const action of result.actions) {
    lines.push(`- ${action.status} ${action.path}: ${action.detail}`);
  }

  lines.push("");
  return lines.join("\n");
}

function renderInstallResultMarkdown(result: InstallResult): string {
  return [
    "# KRN Install Result",
    "",
    `Status: ${result.status}`,
    `Dry run: ${String(result.dryRun)}`,
    `Generated at: ${result.generatedAt}`,
    `Created/planned: ${result.created}`,
    `Skipped/planned skipped: ${result.skipped}`,
    "",
    "## Actions",
    "",
    "| Path | Kind | Status | Detail |",
    "| --- | --- | --- | --- |",
    ...result.actions.map(
      (action) =>
        `| ${action.path} | ${action.kind} | ${action.status} | ${action.detail.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## Limits",
    "",
    "- Existing files are preserved.",
    "- Dry-run does not write runtime state, trace events, or install-result artifacts.",
    "- Uninstall later removes only managed files that contain the KRN managed marker.",
    "",
  ].join("\n");
}

export async function installCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const parsed = parseInstallArgs(args);
  if (parsed.error) {
    runtime.stderr(`${parsed.error}\n`);
    return 1;
  }

  let result: InstallResult;
  try {
    result = await runInstallPlan(runtime.cwd, {
      dryRun: parsed.dryRun,
      sourceRootPath: buildCliIdentity(runtime).sourceRootPath,
      configProfile: parsed.configProfile,
      generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    runtime.stderr(`KRN install: ${message}\n`);
    return 1;
  }

  if (!parsed.dryRun) {
    await writeCurrentJson(runtime.cwd, "install-result.json", result);
    await writeCurrentMarkdown(
      runtime.cwd,
      "install-result.md",
      renderInstallResultMarkdown(result),
    );

    await writeTraceEvent(
      createTraceEvent("install.ran", {
        now: runtime.now?.(),
        data: {
          status: result.status,
          dryRun: result.dryRun,
          created: result.created,
          skipped: result.skipped,
          reason: result.reason ?? null,
          actions: result.actions.map((action) => ({
            path: action.path,
            kind: action.kind,
            status: action.status,
          })),
        },
      }),
      runtime.tracePath ?? defaultTracePath(runtime.cwd),
    );
  }

  if (parsed.format === "json") {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  runtime.stdout(renderInstallMarkdown(result));
  return 0;
}
