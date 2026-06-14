import { mkdir, rename } from "node:fs/promises";
import path from "node:path";
import {
  type ArtifactRecord,
  type ArtifactScopeFilter,
  artifactPathHasSecretMarker,
  artifactPathIsArchiveSafe,
  filterArtifacts,
  listRuntimeArtifacts,
} from "../artifact-scope.js";
import type { CliRuntime } from "../runtime.js";

interface ArtifactsListOptions {
  format: "markdown" | "json";
  scope: ArtifactScopeFilter;
  error?: string | undefined;
}

interface ArtifactsArchiveOptions {
  format: "markdown" | "json";
  confirm: boolean;
  dryRun: boolean;
  error?: string | undefined;
}

interface ArchiveCandidate {
  artifact: ArtifactRecord;
  archivePath: string;
}

interface ArchiveRefusal {
  path: string;
  reason: string;
}

interface ArchivePlan {
  schema: "krn-artifacts-archive-plan-v1";
  generatedAt: string;
  dryRun: boolean;
  confirm: boolean;
  archiveDir: string;
  candidates: Array<{
    path: string;
    scope: string;
    archivePath: string;
  }>;
  refused: ArchiveRefusal[];
}

function parseListArgs(args: string[]): ArtifactsListOptions {
  const options: ArtifactsListOptions = {
    format: "markdown",
    scope: "all",
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--json") {
      options.format = "json";
      continue;
    }

    if (arg === "--scope") {
      const value = args[index + 1];
      if (value !== "current" && value !== "historical" && value !== "all") {
        return {
          ...options,
          error: "KRN artifacts: expected --scope current|historical|all",
        };
      }
      options.scope = value;
      index += 1;
      continue;
    }

    return {
      ...options,
      error:
        "KRN artifacts: expected `krn artifacts list [--json] [--scope current|historical|all]`",
    };
  }

  return options;
}

function parseArchiveArgs(args: string[]): ArtifactsArchiveOptions {
  const options: ArtifactsArchiveOptions = {
    format: "markdown",
    confirm: false,
    dryRun: false,
  };

  for (const arg of args) {
    if (arg === "--json") {
      options.format = "json";
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--confirm") {
      options.confirm = true;
      continue;
    }

    return {
      ...options,
      error: "KRN artifacts: expected `krn artifacts archive --dry-run|--confirm [--json]`",
    };
  }

  if (options.confirm === options.dryRun) {
    return {
      ...options,
      error: "KRN artifacts: archive requires exactly one of --dry-run or --confirm",
    };
  }

  return options;
}

function renderArtifactsMarkdown(scope: ArtifactScopeFilter, artifacts: ArtifactRecord[]): string {
  return [
    "# KRN Artifacts",
    "",
    `Scope: ${scope}`,
    `Artifacts: ${artifacts.length}`,
    "",
    "| Scope | Path | Reason |",
    "| --- | --- | --- |",
    ...artifacts.map(
      (artifact) =>
        `| ${artifact.scope} | ${artifact.path.replaceAll("|", "\\|")} | ${artifact.reason.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## Limits",
    "",
    "- Artifact listing reads `.krn` metadata only.",
    "- Historical caveats are visible; listing does not delete or archive anything.",
    "",
  ].join("\n");
}

function archiveDestination(archiveDir: string, artifact: ArtifactRecord): string {
  return path.posix.join(archiveDir, artifact.path.replace(/^\.krn\//, ""));
}

function buildArchivePlan(
  generatedAt: string,
  archiveDir: string,
  artifacts: ArtifactRecord[],
  options: ArtifactsArchiveOptions,
): { plan: ArchivePlan; candidates: ArchiveCandidate[] } {
  const candidates: ArchiveCandidate[] = [];
  const refused: ArchiveRefusal[] = [];

  for (const artifact of artifacts) {
    if (artifact.scope === "current" || artifact.scope === "archived") {
      continue;
    }

    if (!artifactPathIsArchiveSafe(artifact.path)) {
      refused.push({
        path: artifact.path,
        reason: "archive candidate is outside .krn, already archived, or not safe",
      });
      continue;
    }

    if (artifactPathHasSecretMarker(artifact.path)) {
      refused.push({
        path: artifact.path,
        reason: "archive candidate path contains a secret marker",
      });
      continue;
    }

    candidates.push({
      artifact,
      archivePath: archiveDestination(archiveDir, artifact),
    });
  }

  return {
    candidates,
    plan: {
      schema: "krn-artifacts-archive-plan-v1",
      generatedAt,
      dryRun: options.dryRun,
      confirm: options.confirm,
      archiveDir,
      candidates: candidates.map((candidate) => ({
        path: candidate.artifact.path,
        scope: candidate.artifact.scope,
        archivePath: candidate.archivePath,
      })),
      refused,
    },
  };
}

function renderArchiveMarkdown(plan: ArchivePlan): string {
  return [
    "# KRN Artifact Archive",
    "",
    `Mode: ${plan.dryRun ? "dry-run" : "confirm"}`,
    `Archive dir: ${plan.archiveDir}`,
    `Candidates: ${plan.candidates.length}`,
    `Refused: ${plan.refused.length}`,
    "",
    "## Candidates",
    "",
    ...(plan.candidates.length > 0
      ? plan.candidates.map((candidate) => `- ${candidate.path} -> ${candidate.archivePath}`)
      : ["- none"]),
    "",
    "## Refused",
    "",
    ...(plan.refused.length > 0
      ? plan.refused.map((refusal) => `- ${refusal.path}: ${refusal.reason}`)
      : ["- none"]),
    "",
    "## Limits",
    "",
    "- Dry-run never moves files.",
    "- Confirm moves only non-current `.krn` artifacts that pass path safety checks.",
    "",
  ].join("\n");
}

async function moveArchiveCandidates(cwd: string, candidates: ArchiveCandidate[]): Promise<void> {
  for (const candidate of candidates) {
    const targetPath = path.join(cwd, candidate.archivePath);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await rename(candidate.artifact.absolutePath, targetPath);
  }
}

async function artifactsListCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const options = parseListArgs(args);
  if (options.error) {
    runtime.stderr(`${options.error}\n`);
    return 1;
  }

  const artifacts = filterArtifacts(await listRuntimeArtifacts(runtime.cwd), options.scope);
  const result = {
    schema: "krn-artifacts-list-v1" as const,
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    scope: options.scope,
    artifacts: artifacts.map(({ absolutePath: _absolutePath, ...artifact }) => artifact),
  };

  if (options.format === "json") {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  runtime.stdout(renderArtifactsMarkdown(options.scope, artifacts));
  return 0;
}

async function artifactsArchiveCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const options = parseArchiveArgs(args);
  if (options.error) {
    runtime.stderr(`${options.error}\n`);
    return 1;
  }

  const generatedAt = (runtime.now?.() ?? new Date()).toISOString();
  const archiveDir = `.krn/archive/${generatedAt.replaceAll(/[:.]/g, "-")}`;
  const { candidates, plan } = buildArchivePlan(
    generatedAt,
    archiveDir,
    await listRuntimeArtifacts(runtime.cwd),
    options,
  );

  if (options.confirm) {
    await moveArchiveCandidates(runtime.cwd, candidates);
  }

  if (options.format === "json") {
    runtime.stdout(`${JSON.stringify(plan, null, 2)}\n`);
    return 0;
  }

  runtime.stdout(renderArchiveMarkdown(plan));
  return 0;
}

export async function artifactsCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const [command, ...rest] = args;

  if (command === "list") {
    return artifactsListCommand(rest, runtime);
  }

  if (command === "archive") {
    return artifactsArchiveCommand(rest, runtime);
  }

  runtime.stderr(
    "KRN artifacts: expected `krn artifacts list [--json] [--scope current|historical|all]` or `krn artifacts archive --dry-run|--confirm [--json]`\n",
  );
  return 1;
}
