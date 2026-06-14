import { writeFile } from "node:fs/promises";
import {
  currentStatePath,
  ensureCurrentStateDir,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "../current-state.js";
import { buildCliIdentity } from "../identity.js";
import {
  buildOperatorReport,
  renderOperatorReportHtml,
  renderOperatorReportMarkdown,
} from "../operator-report.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

interface ReportCommandOptions {
  format: "markdown" | "json";
  write: boolean;
  error?: string | undefined;
}

function parseReportArgs(args: string[]): ReportCommandOptions {
  const options: ReportCommandOptions = {
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
      error: "KRN report: expected `krn report [--json] [--write]`",
    };
  }

  return options;
}

export async function reportCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const options = parseReportArgs(args);
  if (options.error) {
    runtime.stderr(`${options.error}\n`);
    return 1;
  }

  const report = await buildOperatorReport({
    cwd: runtime.cwd,
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    identity: buildCliIdentity(runtime),
  });
  const markdown = renderOperatorReportMarkdown(report);
  const html = renderOperatorReportHtml(report);

  if (options.write) {
    await ensureCurrentStateDir(runtime.cwd);
    await writeCurrentJson(runtime.cwd, "operator-report.json", report);
    await writeCurrentMarkdown(runtime.cwd, "operator-report.md", markdown);
    await writeFile(currentStatePath(runtime.cwd, "operator-report.html"), html, "utf8");
  }

  await emitCliTrace(runtime, "report.ran", {
    taskId: report.task.id,
    runScoped: true,
    data: {
      verdict: report.verdict,
      blockers: report.blockers.length,
      warnings: report.warnings.length,
      write: options.write,
      html: options.write,
      productionProof: report.productionProof.value,
      hookTrustStatus: report.hookTrust.status,
    },
  });

  if (options.format === "json") {
    runtime.stdout(`${JSON.stringify(report, null, 2)}\n`);
    return 0;
  }

  if (options.write) {
    runtime.stdout(`KRN report: ${report.verdict}
markdown: .krn/current/operator-report.md
json: .krn/current/operator-report.json
html: .krn/current/operator-report.html
`);
    return 0;
  }

  runtime.stdout(markdown);
  return 0;
}
