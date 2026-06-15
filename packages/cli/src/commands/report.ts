import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { artifactPathHasSecretMarker } from "../artifact-scope.js";
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
  bundle: boolean;
  error?: string | undefined;
}

function parseReportArgs(args: string[]): ReportCommandOptions {
  const options: ReportCommandOptions = {
    format: "markdown",
    write: false,
    bundle: false,
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

    if (arg === "--bundle") {
      options.bundle = true;
      options.write = true;
      continue;
    }

    return {
      ...options,
      error: "KRN report: expected `krn report [--json] [--write] [--bundle]`",
    };
  }

  return options;
}

interface ReportBundleFile {
  path: string;
  source: string;
  present: boolean;
  required: boolean;
}

interface ReportBundleManifest {
  schema: "krn-report-bundle-manifest-v1";
  generatedAt: string;
  reportVerdict: string;
  productionProof: false;
  files: ReportBundleFile[];
  limits: string[];
}

async function copyIfPresent(
  cwd: string,
  bundleDir: string,
  source: string,
  destination: string,
  required: boolean,
): Promise<ReportBundleFile> {
  const normalizedSource = source.split(path.sep).join("/");
  if (
    !normalizedSource.startsWith(".krn/") ||
    normalizedSource.includes("/../") ||
    artifactPathHasSecretMarker(normalizedSource)
  ) {
    return {
      path: destination,
      source,
      present: false,
      required,
    };
  }

  try {
    await mkdir(path.dirname(path.join(bundleDir, destination)), { recursive: true });
    await copyFile(path.join(cwd, normalizedSource), path.join(bundleDir, destination));
    return {
      path: destination,
      source: normalizedSource,
      present: true,
      required,
    };
  } catch {
    return {
      path: destination,
      source: normalizedSource,
      present: false,
      required,
    };
  }
}

async function writeReportBundle(
  runtime: CliRuntime,
  input: {
    generatedAt: string;
    markdown: string;
    html: string;
    reportJson: string;
    reportVerdict: string;
    latestExecutionPath?: string | undefined;
  },
): Promise<ReportBundleManifest> {
  const bundleDir = currentStatePath(runtime.cwd, "report-bundle");
  await mkdir(bundleDir, { recursive: true });

  await writeFile(path.join(bundleDir, "operator-report.md"), input.markdown, "utf8");
  await writeFile(path.join(bundleDir, "operator-report.html"), input.html, "utf8");
  await writeFile(path.join(bundleDir, "operator-report.json"), input.reportJson, "utf8");

  const files: ReportBundleFile[] = [
    {
      path: "operator-report.md",
      source: ".krn/current/operator-report.md",
      present: true,
      required: true,
    },
    {
      path: "operator-report.html",
      source: ".krn/current/operator-report.html",
      present: true,
      required: true,
    },
    {
      path: "operator-report.json",
      source: ".krn/current/operator-report.json",
      present: true,
      required: true,
    },
  ];

  for (const item of [
    ["operator-summary.json", ".krn/current/operator-summary.json", true],
    ["review-summary.json", ".krn/current/review-summary.json", false],
    ["verify-result.json", ".krn/current/verify-result.json", false],
    ["context-package.json", ".krn/current/context-package.json", false],
    ["release-check.json", ".krn/current/release-check.json", false],
    ["config-doctor.json", ".krn/current/config-doctor.json", false],
    ["install-result.json", ".krn/current/install-result.json", false],
    ["uninstall-result.json", ".krn/current/uninstall-result.json", false],
  ] as const) {
    files.push(await copyIfPresent(runtime.cwd, bundleDir, item[1], item[0], item[2]));
  }

  if (input.latestExecutionPath) {
    files.push(
      await copyIfPresent(
        runtime.cwd,
        bundleDir,
        input.latestExecutionPath,
        "evidence/real-repo-execution-summary.json",
        false,
      ),
    );
  }

  const manifest: ReportBundleManifest = {
    schema: "krn-report-bundle-manifest-v1",
    generatedAt: input.generatedAt,
    reportVerdict: input.reportVerdict,
    productionProof: false,
    files,
    limits: [
      "Local static export only.",
      "Missing optional artifacts are recorded as present=false.",
      "Protected-looking paths and paths outside .krn are not copied.",
    ],
  };

  await writeFile(path.join(bundleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
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
  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  const markdown = renderOperatorReportMarkdown(report);
  const html = renderOperatorReportHtml(report);
  let bundleManifest: ReportBundleManifest | undefined;

  if (options.write) {
    await ensureCurrentStateDir(runtime.cwd);
    await writeCurrentJson(runtime.cwd, "operator-report.json", report);
    await writeCurrentMarkdown(runtime.cwd, "operator-report.md", markdown);
    await writeFile(currentStatePath(runtime.cwd, "operator-report.html"), html, "utf8");
  }

  if (options.bundle) {
    bundleManifest = await writeReportBundle(runtime, {
      generatedAt: report.generatedAt,
      markdown,
      html,
      reportJson,
      reportVerdict: report.verdict,
      latestExecutionPath: report.realRepoEvidence.latestPath,
    });
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
      bundle: options.bundle,
      bundleFiles: bundleManifest?.files.length ?? 0,
      productionProof: report.productionProof.value,
      hookTrustStatus: report.hookTrust.status,
    },
  });

  if (options.format === "json") {
    runtime.stdout(reportJson);
    return 0;
  }

  if (options.write) {
    runtime.stdout(`KRN report: ${report.verdict}
markdown: .krn/current/operator-report.md
json: .krn/current/operator-report.json
html: .krn/current/operator-report.html
${options.bundle ? "bundle: .krn/current/report-bundle/manifest.json\n" : ""}`);
    return 0;
  }

  runtime.stdout(markdown);
  return 0;
}
