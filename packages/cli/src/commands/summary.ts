import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { buildCliIdentity } from "../identity.js";
import { buildOperatorSummary, renderOperatorSummaryMarkdown } from "../operator-summary.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

interface SummaryCommandOptions {
  format: "markdown" | "json";
  write: boolean;
  error?: string | undefined;
}

function parseSummaryArgs(args: string[]): SummaryCommandOptions {
  const options: SummaryCommandOptions = {
    format: "markdown",
    write: false,
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

    return {
      ...options,
      error: "KRN summary: expected `krn summary [--json] [--write]`",
    };
  }

  return options;
}

export async function summaryCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const options = parseSummaryArgs(args);
  if (options.error) {
    runtime.stderr(`${options.error}\n`);
    return 1;
  }

  const summary = await buildOperatorSummary({
    cwd: runtime.cwd,
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    identity: buildCliIdentity(runtime),
  });
  const markdown = renderOperatorSummaryMarkdown(summary);

  if (options.write) {
    await writeCurrentJson(runtime.cwd, "operator-summary.json", summary);
    await writeCurrentMarkdown(runtime.cwd, "operator-summary.md", markdown);
  }

  await emitCliTrace(runtime, "summary.ran", {
    taskId: summary.currentTask.id,
    runScoped: true,
    data: {
      status: summary.status,
      blockers: summary.blockers.length,
      warnings: summary.warnings.length,
      hookStatus: summary.hooks.status,
      realRepoDogfoodStatus: summary.realRepoDogfood.status,
      reviewerStatus: summary.reviewers.status,
      write: options.write,
    },
  });

  if (options.format === "json") {
    runtime.stdout(`${JSON.stringify(summary, null, 2)}\n`);
    return 0;
  }

  if (options.write) {
    runtime.stdout(`KRN summary: ${summary.status}
result: .krn/current/operator-summary.md
`);
    return 0;
  }

  runtime.stdout(markdown);
  return 0;
}
