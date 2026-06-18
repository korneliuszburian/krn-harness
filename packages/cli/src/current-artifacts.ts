import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  buildRuntimeLayout,
  getRuntimeLayout,
  pathExists,
  type RuntimeLayout,
  readJsonFile,
  runtimePath,
} from "../../core/src/index.js";
import { artifactPathHasSecretMarker } from "./artifact-scope.js";

export interface BundleArtifactFile {
  path: string;
  source: string;
  present: boolean;
  required: boolean;
  skippedReason?: string | undefined;
}

interface CopyArtifactFileInput {
  cwd: string;
  bundleDir: string;
  source: string;
  destination: string;
  required: boolean;
  allowedSourcePrefixes: string[];
  maxBytes?: number | undefined;
}

export function artifactPathsForLayout(layout: RuntimeLayout) {
  return {
    taskContract: runtimePath(layout.currentDir, "task-contract.json"),
    graph: runtimePath(layout.graphDir, "repo-graph.json"),
    contextPackage: runtimePath(layout.currentDir, "context-package.json"),
    verifyResult: runtimePath(layout.currentDir, "verify-result.json"),
    handoff: runtimePath(layout.currentDir, "handoff.md"),
    evalResult: runtimePath(layout.currentDir, "eval-result.json"),
    evalBaseline: runtimePath(layout.currentDir, "eval-baseline.json"),
    reviewSummary: runtimePath(layout.currentDir, "review-summary.json"),
    reviewResult: runtimePath(layout.currentDir, "review-result.json"),
    operatorSummary: runtimePath(layout.currentDir, "operator-summary.json"),
    operatorReportMarkdown: runtimePath(layout.currentDir, "operator-report.md"),
    operatorReportJson: runtimePath(layout.currentDir, "operator-report.json"),
    operatorReportHtml: runtimePath(layout.currentDir, "operator-report.html"),
    reportBundleManifest: runtimePath(layout.reportBundleDir, "manifest.json"),
    configDoctor: runtimePath(layout.currentDir, "config-doctor.json"),
    installResult: runtimePath(layout.currentDir, "install-result.json"),
    uninstallResult: runtimePath(layout.currentDir, "uninstall-result.json"),
    releaseCheckJson: runtimePath(layout.currentDir, "release-check.json"),
    releaseCheckMarkdown: runtimePath(layout.currentDir, "release-check.md"),
    runResultJson: runtimePath(layout.currentDir, "run-result.json"),
    runResultMarkdown: runtimePath(layout.currentDir, "run-result.md"),
    continuationStateJson: runtimePath(layout.currentDir, "continuation-state.json"),
    continuationStateMarkdown: runtimePath(layout.currentDir, "continuation-state.md"),
    runBundleManifest: runtimePath(layout.runBundleDir, "manifest.json"),
    trace: runtimePath(layout.tracesDir, "trace.jsonl"),
    memoryPending: runtimePath(layout.memoryDir, "pending.json"),
    memoryApproved: runtimePath(layout.memoryDir, "approved.json"),
    memoryDeprecated: runtimePath(layout.memoryDir, "deprecated.json"),
  } as const;
}

export const currentArtifactPaths = artifactPathsForLayout(buildRuntimeLayout());

export function currentArtifactPathsFor(cwd: string) {
  return artifactPathsForLayout(getRuntimeLayout(cwd));
}

export function normalizeArtifactPath(relativePath: string): string {
  return relativePath.replaceAll("\\", "/");
}

export function repoPath(cwd: string, relativePath: string): string {
  return path.join(cwd, relativePath);
}

export function repoPathExists(cwd: string, relativePath: string): Promise<boolean> {
  return pathExists(repoPath(cwd, relativePath));
}

export function readRepoJson<T>(cwd: string, relativePath: string): Promise<T | undefined> {
  return readJsonFile<T>(repoPath(cwd, relativePath));
}

export async function readRepoText(cwd: string, relativePath: string): Promise<string | undefined> {
  try {
    return await readFile(repoPath(cwd, relativePath), "utf8");
  } catch {
    return undefined;
  }
}

async function copyArtifactFile(input: CopyArtifactFileInput): Promise<BundleArtifactFile> {
  const normalizedSource = normalizeArtifactPath(input.source);
  const sourceParts = normalizedSource.split("/");
  const allowed = input.allowedSourcePrefixes.some((prefix) => normalizedSource.startsWith(prefix));

  if (!allowed || sourceParts.includes("..") || artifactPathHasSecretMarker(normalizedSource)) {
    return {
      path: input.destination,
      source: normalizedSource,
      present: false,
      required: input.required,
      skippedReason: "unsafe_source_path",
    };
  }

  try {
    const absoluteSource = repoPath(input.cwd, normalizedSource);
    if (input.maxBytes !== undefined) {
      const fileStat = await stat(absoluteSource);
      if (fileStat.size > input.maxBytes) {
        return {
          path: input.destination,
          source: normalizedSource,
          present: false,
          required: input.required,
          skippedReason: "file_too_large",
        };
      }
    }

    await mkdir(path.dirname(path.join(input.bundleDir, input.destination)), { recursive: true });
    await copyFile(absoluteSource, path.join(input.bundleDir, input.destination));
    return {
      path: input.destination,
      source: normalizedSource,
      present: true,
      required: input.required,
    };
  } catch {
    return {
      path: input.destination,
      source: normalizedSource,
      present: false,
      required: input.required,
    };
  }
}

export function copyCurrentArtifactFile(
  input: Omit<CopyArtifactFileInput, "allowedSourcePrefixes" | "maxBytes">,
): Promise<BundleArtifactFile> {
  const layout = getRuntimeLayout(input.cwd);
  return copyArtifactFile({
    ...input,
    allowedSourcePrefixes: [`${layout.currentDir}/`],
    maxBytes: 1_000_000,
  });
}

export function copyRuntimeArtifactFile(
  input: Omit<CopyArtifactFileInput, "allowedSourcePrefixes">,
): Promise<BundleArtifactFile> {
  const layout = getRuntimeLayout(input.cwd);
  return copyArtifactFile({
    ...input,
    allowedSourcePrefixes: [`${layout.root}/`],
  });
}
