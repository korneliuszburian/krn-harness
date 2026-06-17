import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRuntimeLayout, runtimePath } from "../../../core/src/index.js";
import {
  type BundleArtifactFile,
  copyRuntimeArtifactFile,
  currentArtifactPathsFor,
} from "../current-artifacts.js";
import {
  currentStatePath,
  ensureCurrentStateDir,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "../current-state.js";
import { buildCliIdentity } from "../identity.js";
import { buildOperatorReport } from "../operator-report.js";
import {
  renderOperatorReportHtml,
  renderOperatorReportMarkdown,
} from "../operator-report-render.js";
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

type ReportBundleFile = BundleArtifactFile;

interface ReportBundleManifest {
  schema: "krn-report-bundle-manifest-v1";
  generatedAt: string;
  reportVerdict: string;
  productionProof: false;
  files: ReportBundleFile[];
  limits: string[];
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
  const layout = getRuntimeLayout(runtime.cwd);
  const currentArtifactPaths = currentArtifactPathsFor(runtime.cwd);
  await mkdir(bundleDir, { recursive: true });

  await writeFile(path.join(bundleDir, "operator-report.md"), input.markdown, "utf8");
  await writeFile(path.join(bundleDir, "operator-report.html"), input.html, "utf8");
  await writeFile(path.join(bundleDir, "operator-report.json"), input.reportJson, "utf8");

  const files: ReportBundleFile[] = [
    {
      path: "operator-report.md",
      source: runtimePath(layout.currentDir, "operator-report.md"),
      present: true,
      required: true,
    },
    {
      path: "operator-report.html",
      source: runtimePath(layout.currentDir, "operator-report.html"),
      present: true,
      required: true,
    },
    {
      path: "operator-report.json",
      source: runtimePath(layout.currentDir, "operator-report.json"),
      present: true,
      required: true,
    },
  ];

  for (const item of [
    ["operator-summary.json", currentArtifactPaths.operatorSummary, true],
    ["review-summary.json", currentArtifactPaths.reviewSummary, false],
    ["verify-result.json", currentArtifactPaths.verifyResult, false],
    ["context-package.json", currentArtifactPaths.contextPackage, false],
    ["release-check.json", currentArtifactPaths.releaseCheckJson, false],
    ["config-doctor.json", currentArtifactPaths.configDoctor, false],
    ["install-result.json", currentArtifactPaths.installResult, false],
    ["uninstall-result.json", currentArtifactPaths.uninstallResult, false],
  ] as const) {
    files.push(
      await copyRuntimeArtifactFile({
        cwd: runtime.cwd,
        bundleDir,
        source: item[1],
        destination: item[0],
        required: item[2],
      }),
    );
  }

  if (input.latestExecutionPath) {
    files.push(
      await copyRuntimeArtifactFile({
        cwd: runtime.cwd,
        bundleDir,
        source: input.latestExecutionPath,
        destination: "evidence/real-repo-execution-summary.json",
        required: false,
      }),
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
      `Protected-looking paths and paths outside ${layout.root} are not copied.`,
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
    const layout = getRuntimeLayout(runtime.cwd);
    runtime.stdout(`KRN report: ${report.verdict}
markdown: ${runtimePath(layout.currentDir, "operator-report.md")}
json: ${runtimePath(layout.currentDir, "operator-report.json")}
html: ${runtimePath(layout.currentDir, "operator-report.html")}
${options.bundle ? `bundle: ${runtimePath(layout.reportBundleDir, "manifest.json")}\n` : ""}`);
    return 0;
  }

  runtime.stdout(markdown);
  return 0;
}
