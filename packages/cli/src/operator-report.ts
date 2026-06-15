import { readFile } from "node:fs/promises";
import { deriveReportVerdict, type ProofSeverity, readJsonFile } from "../../core/src/index.js";
import {
  type ArtifactRecord,
  getHistoricalCaveats,
  getLatestExecutionResult,
  getStaleBlockingArtifacts,
  listRuntimeArtifacts,
} from "./artifact-scope.js";
import { currentStatePath } from "./current-state.js";
import type { CliIdentity } from "./identity.js";
import {
  buildOperatorSummary,
  type OperatorSummary,
  type OperatorSummaryStatus,
} from "./operator-summary.js";

export interface OperatorReport {
  schema: "krn-operator-report-v1";
  generatedAt: string;
  repoPath: string;
  verdict: ProofSeverity;
  summaryStatus: OperatorSummaryStatus;
  task: {
    status: OperatorSummaryStatus;
    id?: string | undefined;
    text?: string | undefined;
    classification?: string | undefined;
  };
  execution: {
    status: string;
    kind?: string | undefined;
    validationStatus?: string | undefined;
    changedFiles: string[];
    artifactPath?: string | undefined;
  };
  changedFiles: string[];
  verify: {
    status: OperatorSummaryStatus;
    mode?: string | undefined;
    profileName?: string | undefined;
    executedCommands?: number | undefined;
    totalCommands?: number | undefined;
    summary: string;
  };
  context: {
    status: OperatorSummaryStatus;
    stop?: boolean | undefined;
    totalItems?: number | undefined;
    missingItems?: number | undefined;
    overInclusionRisk?: string | undefined;
    summary: string;
  };
  realRepoEvidence: {
    status: OperatorSummaryStatus;
    summary: string;
    latestPath?: string | undefined;
    staleHistoricalBlocker: boolean;
  };
  hookTrust: {
    status: string;
    hookReceivedCount: number;
    summary: string;
  };
  productionProof: {
    status: "not-production-proof";
    value: false;
    summary: string;
  };
  blockers: string[];
  warnings: string[];
  nextActions: string[];
  historicalCaveats: Array<{
    path: string;
    scope: string;
    reason: string;
  }>;
  historicalCaveatCount: number;
  historicalCaveatsOmitted: number;
  artifactPaths: Array<{
    path: string;
    scope: string;
  }>;
  artifactPathCount: number;
  artifactPathsOmitted: number;
}

interface BuildOperatorReportInput {
  cwd: string;
  generatedAt: string;
  identity?: CliIdentity | undefined;
}

interface ExecutionResultSummary {
  executionKind?: string | undefined;
  validationStatus?: string | undefined;
  changedFiles?: unknown;
}

function unique(values: string[]): string[] {
  return [...new Set(values)].filter(Boolean);
}

async function readCurrentSummary(cwd: string): Promise<OperatorSummary | undefined> {
  return readJsonFile<OperatorSummary>(currentStatePath(cwd, "operator-summary.json"));
}

async function readExecutionSummary(
  artifact: ArtifactRecord | undefined,
): Promise<ExecutionResultSummary | undefined> {
  if (!artifact) return undefined;
  return readJsonFile<ExecutionResultSummary>(artifact.absolutePath);
}

function signalSeverity(status: OperatorSummaryStatus): ProofSeverity {
  if (status === "fail") return "fail";
  if (status === "blocked") return "blocked";
  if (
    status === "warn" ||
    status === "missing" ||
    status === "skipped" ||
    status === "readiness" ||
    status === "unproven" ||
    status === "manual-diagnostic-only" ||
    status === "partially-proven"
  ) {
    return "warn";
  }
  return "pass";
}

function isStaleRealRepoBlocker(
  summary: OperatorSummary,
  staleArtifacts: ArtifactRecord[],
): boolean {
  const latestPath = summary.realRepoDogfood.latestPath;
  return (
    summary.realRepoDogfood.status === "blocked" &&
    latestPath !== undefined &&
    staleArtifacts.some((artifact) => artifact.path === latestPath)
  );
}

function reportVerdict(summary: OperatorSummary, staleRealRepoBlocker: boolean): ProofSeverity {
  const statuses: ProofSeverity[] = [
    signalSeverity(summary.currentTask.status),
    signalSeverity(summary.context.status),
    signalSeverity(summary.graph.status),
    signalSeverity(summary.verify.status),
    signalSeverity(summary.handoff.status),
    signalSeverity(summary.hooks.status),
    staleRealRepoBlocker ? "warn" : signalSeverity(summary.realRepoDogfood.status),
    signalSeverity(summary.reviewers.status),
    signalSeverity(summary.memory.status),
  ];

  return deriveReportVerdict(statuses);
}

function filterStaleBlockers(values: string[], staleRealRepoBlocker: boolean): string[] {
  if (!staleRealRepoBlocker) return values;
  return values.filter((value) => !value.startsWith("realRepoDogfood:"));
}

function filterStaleNextActions(values: string[], staleRealRepoBlocker: boolean): string[] {
  if (!staleRealRepoBlocker) return values;
  return values.filter((value) => value !== "Resolve blockers before claiming completion.");
}

function artifactScopePriority(scope: string): number {
  if (scope === "current") return 0;
  if (scope === "stale-blocking") return 1;
  if (scope === "foreign-target") return 2;
  if (scope === "test-fixture") return 3;
  if (scope === "historical") return 4;
  return 5;
}

function compactArtifacts<T extends { path: string; scope: string }>(
  items: T[],
  limit: number,
): T[] {
  return [...items]
    .sort(
      (left, right) =>
        artifactScopePriority(left.scope) - artifactScopePriority(right.scope) ||
        left.path.localeCompare(right.path),
    )
    .slice(0, limit);
}

export async function buildOperatorReport(
  input: BuildOperatorReportInput,
): Promise<OperatorReport> {
  const summary =
    (await readCurrentSummary(input.cwd)) ??
    (await buildOperatorSummary({
      cwd: input.cwd,
      generatedAt: input.generatedAt,
      identity: input.identity,
    }));
  const [artifacts, historicalCaveats, staleArtifacts, latestExecutionArtifact] = await Promise.all(
    [
      listRuntimeArtifacts(input.cwd),
      getHistoricalCaveats(input.cwd),
      getStaleBlockingArtifacts(input.cwd),
      getLatestExecutionResult(input.cwd),
    ],
  );
  const latestExecution = await readExecutionSummary(latestExecutionArtifact);
  const changedFiles = Array.isArray(latestExecution?.changedFiles)
    ? latestExecution.changedFiles.filter((item): item is string => typeof item === "string")
    : [];
  const staleRealRepoBlocker = isStaleRealRepoBlocker(summary, staleArtifacts);
  const blockers = filterStaleBlockers(summary.blockers, staleRealRepoBlocker);
  const compactHistoricalCaveats = compactArtifacts(historicalCaveats, 50);
  const compactArtifactPaths = compactArtifacts(artifacts, 80);
  const hookTrustStatus = summary.hooks.hookTrustStatus ?? summary.hooks.status;
  const warnings = unique([
    ...summary.warnings,
    ...(staleRealRepoBlocker
      ? [
          "realRepoDogfood: Historical source dogfood blocker is a caveat, not current report blocker.",
        ]
      : []),
    ...(historicalCaveats.length > 0
      ? [
          `Historical .krn caveats: ${historicalCaveats.length}; run \`krn artifacts list --scope historical\` for the full list.`,
        ]
      : []),
  ]);

  return {
    schema: "krn-operator-report-v1",
    generatedAt: input.generatedAt,
    repoPath: input.cwd,
    verdict: reportVerdict(summary, staleRealRepoBlocker),
    summaryStatus: summary.status,
    task: {
      status: summary.currentTask.status,
      id: summary.currentTask.id,
      text: summary.currentTask.task,
      classification: summary.currentTask.classification,
    },
    execution: {
      status: latestExecutionArtifact ? "present" : "missing",
      kind: latestExecution?.executionKind,
      validationStatus: latestExecution?.validationStatus,
      changedFiles,
      artifactPath: latestExecutionArtifact?.path,
    },
    changedFiles,
    verify: {
      status: summary.verify.status,
      mode: summary.verify.mode,
      profileName: summary.verify.profileName,
      executedCommands: summary.verify.executedCommands,
      totalCommands: summary.verify.totalCommands,
      summary: summary.verify.summary,
    },
    context: {
      status: summary.context.status,
      stop: summary.context.stop,
      totalItems: summary.context.totalItems,
      missingItems: summary.context.missingItems,
      overInclusionRisk: summary.context.overInclusionRisk,
      summary: summary.context.summary,
    },
    realRepoEvidence: {
      status: staleRealRepoBlocker ? "warn" : summary.realRepoDogfood.status,
      summary: staleRealRepoBlocker
        ? "Historical source dogfood blocker is visible as a caveat; it is not fatal to this report."
        : summary.realRepoDogfood.summary,
      latestPath: summary.realRepoDogfood.latestPath,
      staleHistoricalBlocker: staleRealRepoBlocker,
    },
    hookTrust: {
      status: hookTrustStatus,
      hookReceivedCount: summary.hooks.hookReceivedCount,
      summary: summary.hooks.summary,
    },
    productionProof: {
      status: "not-production-proof",
      value: false,
      summary: "KRN report is local operator evidence only; production proof remains false.",
    },
    blockers,
    warnings,
    nextActions: unique(filterStaleNextActions(summary.nextActions, staleRealRepoBlocker)),
    historicalCaveats: compactHistoricalCaveats.map((artifact) => ({
      path: artifact.path,
      scope: artifact.scope,
      reason: artifact.reason,
    })),
    historicalCaveatCount: historicalCaveats.length,
    historicalCaveatsOmitted: Math.max(
      0,
      historicalCaveats.length - compactHistoricalCaveats.length,
    ),
    artifactPaths: compactArtifactPaths.map((artifact) => ({
      path: artifact.path,
      scope: artifact.scope,
    })),
    artifactPathCount: artifacts.length,
    artifactPathsOmitted: Math.max(0, artifacts.length - compactArtifactPaths.length),
  };
}

export async function readOperatorReportMarkdown(cwd: string): Promise<string | undefined> {
  try {
    return await readFile(currentStatePath(cwd, "operator-report.md"), "utf8");
  } catch {
    return undefined;
  }
}
