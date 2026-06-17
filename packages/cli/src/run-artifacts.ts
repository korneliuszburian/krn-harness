import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRuntimeLayout } from "../../core/src/index.js";
import {
  type BundleArtifactFile,
  copyCurrentArtifactFile,
  currentArtifactPathsFor,
} from "./current-artifacts.js";
import { currentStatePath, writeCurrentJson, writeCurrentMarkdown } from "./current-state.js";
import { type RunResult, renderRunResultMarkdown } from "./run-result.js";
import type { CliRuntime } from "./runtime.js";

type RunBundleFile = BundleArtifactFile;

interface RunBundleManifest {
  schema: "krn-run-bundle-manifest-v1";
  generatedAt: string;
  runStatus: RunResult["status"];
  productionProof: false;
  hookTrustStatus: string;
  files: RunBundleFile[];
  limits: string[];
}

export function runArtifacts(cwd: string, bundle: boolean): Record<string, string> {
  const currentArtifactPaths = currentArtifactPathsFor(cwd);
  return {
    taskContract: currentArtifactPaths.taskContract,
    graph: currentArtifactPaths.graph,
    contextPackage: currentArtifactPaths.contextPackage,
    verifyResult: currentArtifactPaths.verifyResult,
    handoff: currentArtifactPaths.handoff,
    reviewSummary: currentArtifactPaths.reviewSummary,
    operatorSummary: currentArtifactPaths.operatorSummary,
    operatorReportMarkdown: currentArtifactPaths.operatorReportMarkdown,
    operatorReportJson: currentArtifactPaths.operatorReportJson,
    operatorReportHtml: currentArtifactPaths.operatorReportHtml,
    ...(bundle
      ? {
          releaseCheckJson: currentArtifactPaths.releaseCheckJson,
          releaseCheckMarkdown: currentArtifactPaths.releaseCheckMarkdown,
          runBundleManifest: currentArtifactPaths.runBundleManifest,
        }
      : {}),
    runResultJson: currentArtifactPaths.runResultJson,
    runResultMarkdown: currentArtifactPaths.runResultMarkdown,
  };
}

export async function writeRunResult(runtime: CliRuntime, result: RunResult): Promise<void> {
  await writeCurrentJson(runtime.cwd, "run-result.json", result);
  await writeCurrentMarkdown(runtime.cwd, "run-result.md", renderRunResultMarkdown(result));
}

export async function writeRunBundle(
  runtime: CliRuntime,
  result: RunResult,
): Promise<RunBundleManifest> {
  const bundleDir = currentStatePath(runtime.cwd, "run-bundle");
  const layout = getRuntimeLayout(runtime.cwd);
  const currentArtifactPaths = currentArtifactPathsFor(runtime.cwd);
  await mkdir(bundleDir, { recursive: true });

  const copiedFiles = await Promise.all([
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.runResultJson,
      destination: "run-result.json",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.runResultMarkdown,
      destination: "run-result.md",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.operatorReportMarkdown,
      destination: "operator-report.md",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.operatorReportJson,
      destination: "operator-report.json",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.operatorReportHtml,
      destination: "operator-report.html",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.releaseCheckJson,
      destination: "release-check.json",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.releaseCheckMarkdown,
      destination: "release-check.md",
      required: true,
    }),
  ]);

  const manifest: RunBundleManifest = {
    schema: "krn-run-bundle-manifest-v1",
    generatedAt: result.generatedAt,
    runStatus: result.status,
    productionProof: false,
    hookTrustStatus: result.proof.hookTrustStatus,
    files: [
      {
        path: "manifest.json",
        source: "generated:krn run --bundle",
        present: true,
        required: true,
      },
      ...copiedFiles,
    ],
    limits: [
      "Local run evidence only.",
      `Only allowlisted ${layout.currentDir} artifacts are copied.`,
      "Raw trace dumps, protected-looking paths, external assets, and giant files are excluded.",
      "The bundle does not claim hook trust or production proof.",
    ],
  };

  await writeFile(path.join(bundleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}
