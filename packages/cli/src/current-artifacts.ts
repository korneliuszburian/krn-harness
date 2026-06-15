import { copyFile, mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { pathExists, readJsonFile } from "../../core/src/index.js";
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

export const currentArtifactPaths = {
  taskContract: ".krn/current/task-contract.json",
  graph: ".krn/graph/repo-graph.json",
  contextPackage: ".krn/current/context-package.json",
  verifyResult: ".krn/current/verify-result.json",
  handoff: ".krn/current/handoff.md",
  evalResult: ".krn/current/eval-result.json",
  evalBaseline: ".krn/current/eval-baseline.json",
  reviewSummary: ".krn/current/review-summary.json",
  reviewResult: ".krn/current/review-result.json",
  operatorSummary: ".krn/current/operator-summary.json",
  operatorReportMarkdown: ".krn/current/operator-report.md",
  operatorReportJson: ".krn/current/operator-report.json",
  operatorReportHtml: ".krn/current/operator-report.html",
  reportBundleManifest: ".krn/current/report-bundle/manifest.json",
  configDoctor: ".krn/current/config-doctor.json",
  installResult: ".krn/current/install-result.json",
  uninstallResult: ".krn/current/uninstall-result.json",
  releaseCheckJson: ".krn/current/release-check.json",
  releaseCheckMarkdown: ".krn/current/release-check.md",
  runResultJson: ".krn/current/run-result.json",
  runResultMarkdown: ".krn/current/run-result.md",
  runBundleManifest: ".krn/current/run-bundle/manifest.json",
  trace: ".krn/traces/trace.jsonl",
  memoryPending: ".krn/memory/pending.json",
  memoryApproved: ".krn/memory/approved.json",
  memoryDeprecated: ".krn/memory/deprecated.json",
} as const;

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
  return copyArtifactFile({
    ...input,
    allowedSourcePrefixes: [".krn/current/"],
    maxBytes: 1_000_000,
  });
}

export function copyRuntimeArtifactFile(
  input: Omit<CopyArtifactFileInput, "allowedSourcePrefixes">,
): Promise<BundleArtifactFile> {
  return copyArtifactFile({
    ...input,
    allowedSourcePrefixes: [".krn/"],
  });
}
