import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { readJsonFile } from "../../core/src/index.js";

export type ArtifactScope =
  | "current"
  | "historical"
  | "stale-blocking"
  | "test-fixture"
  | "foreign-target"
  | "archived";

export type ArtifactScopeFilter = "current" | "historical" | "all";

export interface ArtifactRecord {
  path: string;
  absolutePath: string;
  scope: ArtifactScope;
  reason: string;
  sizeBytes: number;
  mtimeMs: number;
}

interface RuntimeSummary {
  schema?: string | undefined;
  status?: string | undefined;
  executionKind?: string | undefined;
  outcomeKind?: string | undefined;
  repoPath?: string | null | undefined;
  targetRepoPath?: string | null | undefined;
}

const currentPrefixes = [".krn/current/", ".krn/graph/", ".krn/memory/", ".krn/traces/"] as const;

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function isInsideKrn(relativePath: string): boolean {
  return relativePath === ".krn" || relativePath.startsWith(".krn/");
}

function isCurrentArtifact(relativePath: string): boolean {
  return currentPrefixes.some((prefix) => relativePath.startsWith(prefix));
}

function isForeignTarget(summary: RuntimeSummary | undefined, cwd: string): boolean {
  const targetPath = summary?.targetRepoPath ?? summary?.repoPath;
  if (!targetPath) return false;
  return path.resolve(targetPath) !== path.resolve(cwd);
}

function secretLookingPath(relativePath: string): boolean {
  const normalized = relativePath.toLowerCase();
  return (
    normalized.includes(".env") ||
    normalized.includes("secret") ||
    normalized.includes("credential") ||
    normalized.includes("private") ||
    /\.(sql|dump|bak|backup|pem|key)$/i.test(normalized)
  );
}

export function artifactPathHasSecretMarker(relativePath: string): boolean {
  return secretLookingPath(relativePath);
}

export function artifactPathIsArchiveSafe(relativePath: string): boolean {
  const normalized = normalizeRelativePath(relativePath);
  return (
    isInsideKrn(normalized) &&
    !normalized.startsWith(".krn/archive/") &&
    !secretLookingPath(normalized)
  );
}

export function classifyArtifactPath(
  relativePathInput: string,
  options: { cwd?: string | undefined; summary?: RuntimeSummary | undefined } = {},
): Pick<ArtifactRecord, "scope" | "reason"> {
  const relativePath = normalizeRelativePath(relativePathInput);

  if (!isInsideKrn(relativePath)) {
    return { scope: "historical", reason: "outside .krn runtime model" };
  }

  if (relativePath.startsWith(".krn/archive/")) {
    return { scope: "archived", reason: "already archived artifact" };
  }

  if (isCurrentArtifact(relativePath)) {
    return { scope: "current", reason: "current runtime evidence" };
  }

  if (
    relativePath.includes(".krn/dogfood/real-repo-skipped/test-source-checkout/") ||
    (relativePath.includes(".krn/dogfood/real-repo-skipped/test-") &&
      (options.summary?.status === "blocked" || options.summary?.status === "skipped"))
  ) {
    return { scope: "stale-blocking", reason: "source-local test dogfood caveat" };
  }

  if (relativePath.includes("/test-") || relativePath.includes("/fixtures/")) {
    return { scope: "test-fixture", reason: "test fixture runtime artifact" };
  }

  if (options.cwd && isForeignTarget(options.summary, options.cwd)) {
    return { scope: "foreign-target", reason: "artifact belongs to a different target repo" };
  }

  return { scope: "historical", reason: "historical runtime artifact" };
}

async function maybeReadSummary(
  cwd: string,
  relativePath: string,
): Promise<RuntimeSummary | undefined> {
  if (!relativePath.endsWith("/summary.json")) {
    return undefined;
  }

  return readJsonFile<RuntimeSummary>(path.join(cwd, relativePath));
}

export async function listRuntimeArtifacts(cwd: string): Promise<ArtifactRecord[]> {
  const root = path.join(cwd, ".krn");
  const artifacts: ArtifactRecord[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 10) return;

    let entries: Dirent[];
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(entryPath, depth + 1);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      const info = await stat(entryPath);
      const relativePath = normalizeRelativePath(path.relative(cwd, entryPath));
      const summary = await maybeReadSummary(cwd, relativePath);
      const classification = classifyArtifactPath(relativePath, { cwd, summary });
      artifacts.push({
        path: relativePath,
        absolutePath: entryPath,
        sizeBytes: info.size,
        mtimeMs: info.mtimeMs,
        ...classification,
      });
    }
  }

  await walk(root, 0);
  return artifacts.sort((left, right) => left.path.localeCompare(right.path));
}

export function filterArtifacts(
  artifacts: ArtifactRecord[],
  scope: ArtifactScopeFilter,
): ArtifactRecord[] {
  if (scope === "all") return artifacts;
  if (scope === "current") return artifacts.filter((artifact) => artifact.scope === "current");
  return artifacts.filter(
    (artifact) => artifact.scope !== "current" && artifact.scope !== "archived",
  );
}

export async function getCurrentArtifacts(cwd: string): Promise<ArtifactRecord[]> {
  return filterArtifacts(await listRuntimeArtifacts(cwd), "current");
}

export async function getHistoricalCaveats(cwd: string): Promise<ArtifactRecord[]> {
  return filterArtifacts(await listRuntimeArtifacts(cwd), "historical");
}

export async function getStaleBlockingArtifacts(cwd: string): Promise<ArtifactRecord[]> {
  return (await listRuntimeArtifacts(cwd)).filter(
    (artifact) => artifact.scope === "stale-blocking",
  );
}

export async function getLatestExecutionResult(cwd: string): Promise<ArtifactRecord | undefined> {
  return (await listRuntimeArtifacts(cwd))
    .filter(
      (artifact) =>
        artifact.path.includes("/real-repo-execution/") && artifact.path.endsWith("/summary.json"),
    )
    .sort((left, right) => right.mtimeMs - left.mtimeMs || left.path.localeCompare(right.path))
    .at(0);
}
