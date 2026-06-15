import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { classifyExecutionResult, isHookTrustSufficient } from "../../core/src/index.js";
import { classifyArtifactPath } from "./artifact-scope.js";
import { readRepoJson } from "./current-artifacts.js";
import type { OperatorSummary, OperatorSummaryStatus } from "./operator-summary.js";

interface RealRepoDogfoodSummaryFixture {
  schema?: unknown;
  status?: unknown;
  outcomeKind?: unknown;
  executionKind?: unknown;
  validationStatus?: unknown;
  forbiddenTouchedFiles?: unknown;
  committedTargetRepo?: unknown;
  pushedTargetRepo?: unknown;
  hookTrustStatus?: unknown;
  productionProof?: unknown;
  eligible?: unknown;
  repoPath?: string | null | undefined;
  targetRepoPath?: string | null | undefined;
  executionWorktreePath?: string | null | undefined;
  summaryJsonPath?: string | undefined;
  missingEnv?: unknown;
  nextCommand?: unknown;
  nextActions?: unknown;
  blockers?: string[] | undefined;
  warnings?: string[] | undefined;
}

async function collectRealRepoDogfoodSummaries(
  cwd: string,
): Promise<Array<RealRepoDogfoodSummaryFixture & { path: string; mtimeMs: number }>> {
  const root = path.join(cwd, ".krn", "dogfood");
  const summaries: Array<RealRepoDogfoodSummaryFixture & { path: string; mtimeMs: number }> = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 5) return;

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

      if (entry.isFile() && entry.name === "summary.json") {
        const relativePath = path.relative(cwd, entryPath).split(path.sep).join("/");
        const summary = await readRepoJson<RealRepoDogfoodSummaryFixture>(cwd, relativePath);
        if (
          summary?.schema === "krn-real-repo-dogfood-v1" ||
          summary?.schema === "krn-real-repo-preflight-v1" ||
          summary?.schema === "krn-real-repo-execution-result-v1"
        ) {
          const info = await stat(entryPath);
          summaries.push({ path: relativePath, mtimeMs: info.mtimeMs, ...summary });
        }
      }
    }
  }

  await walk(root, 0);
  return summaries.sort(
    (left, right) => left.mtimeMs - right.mtimeMs || left.path.localeCompare(right.path),
  );
}

function executionResultSignal(
  latest: RealRepoDogfoodSummaryFixture & { path: string; mtimeMs: number },
): OperatorSummary["realRepoDogfood"] {
  const executionKind = typeof latest.executionKind === "string" ? latest.executionKind : "blocked";
  const validationStatus =
    typeof latest.validationStatus === "string" ? latest.validationStatus : "not-run";
  const productionProof = latest.productionProof === true;
  const hookTrustStatus =
    typeof latest.hookTrustStatus === "string" ? latest.hookTrustStatus : undefined;
  const forbiddenTouchedFiles = Array.isArray(latest.forbiddenTouchedFiles)
    ? latest.forbiddenTouchedFiles.filter((item): item is string => typeof item === "string")
    : [];
  const nextActions = Array.isArray(latest.nextActions)
    ? latest.nextActions.filter((item): item is string => typeof item === "string")
    : [];
  const nextAction = nextActions.at(0);
  const committedTargetRepo = latest.committedTargetRepo === true;
  const pushedTargetRepo = latest.pushedTargetRepo === true;
  const proof = classifyExecutionResult({
    schema: typeof latest.schema === "string" ? latest.schema : undefined,
    path: latest.path,
    executionKind,
    validationStatus,
    forbiddenTouchedFiles,
    committedTargetRepo,
    pushedTargetRepo,
    hookTrustStatus,
    productionProof,
  });
  const unsafe = proof.severity === "fail";
  const base = {
    confidence: "medium" as const,
    artifacts: [latest.path],
    latestStatus: typeof latest.status === "string" ? latest.status : executionKind,
    latestPath: latest.path,
    repoPath: latest.targetRepoPath ?? latest.repoPath,
    executionWorktreePath: latest.executionWorktreePath,
    outcomeKind: executionKind,
    executionKind,
    validationStatus,
    productionProof,
    hookTrustStatus,
  };

  if (unsafe) {
    return {
      ...base,
      status: "fail",
      summary:
        "Real-repo execution result is unsafe: forbidden files, target commit/push, or production-proof overclaim detected.",
      nextAction: "Inspect the execution-result artifact and discard unsafe target changes.",
    };
  }

  if (executionKind === "skipped") {
    return {
      ...base,
      status: "skipped",
      summary: "Real-repo execution result was skipped.",
      nextAction: nextAction ?? "Rerun the approved manual protocol when execution is allowed.",
    };
  }

  if (executionKind === "blocked") {
    return {
      ...base,
      status: "blocked",
      summary: "Real-repo execution result is blocked.",
      nextAction: nextAction ?? "Resolve execution blockers, then rerun the manual protocol.",
    };
  }

  if (validationStatus === "pass") {
    return {
      ...base,
      status: "execution-evidence",
      summary: `Real-repo dogfood has ${executionKind} execution evidence; production proof remains false.`,
      nextAction: isHookTrustSufficient(hookTrustStatus) ? undefined : proof.nextAction,
    };
  }

  return {
    ...base,
    status: "warn",
    summary: "Real-repo execution result exists, but target validation did not pass.",
    nextAction: "Run or repair target validation before claiming execution evidence.",
  };
}

export async function realRepoDogfoodSignal(
  cwd: string,
): Promise<OperatorSummary["realRepoDogfood"]> {
  const summaries = await collectRealRepoDogfoodSummaries(cwd);
  const latest = summaries.at(-1);

  if (latest?.schema === "krn-real-repo-execution-result-v1") {
    return executionResultSignal(latest);
  }

  if (!latest || typeof latest.status !== "string") {
    if (latest?.schema === "krn-real-repo-preflight-v1") {
      return {
        status: "unproven",
        confidence: "medium",
        summary: "Only real-repo preflight summary exists; readiness/execution remains unproven.",
        artifacts: [latest.path],
        latestStatus: "preflight-only",
        latestPath: latest.path,
        repoPath: latest.repoPath,
        outcomeKind: "preflight-only",
        nextAction:
          "Run scripts/krn-real-repo-dogfood.sh with approved env to produce readiness or execution state.",
      };
    }

    return {
      status: "unproven",
      confidence: "high",
      summary: "No real-repo dogfood summary exists.",
      artifacts: [],
    };
  }

  const latestScope = classifyArtifactPath(latest.path, {
    cwd,
    summary: {
      schema: typeof latest.schema === "string" ? latest.schema : undefined,
      status: typeof latest.status === "string" ? latest.status : undefined,
      executionKind: typeof latest.executionKind === "string" ? latest.executionKind : undefined,
      outcomeKind: typeof latest.outcomeKind === "string" ? latest.outcomeKind : undefined,
      repoPath: latest.repoPath,
      targetRepoPath: latest.targetRepoPath,
    },
  }).scope;
  if (latestScope === "stale-blocking") {
    return {
      status: "warn",
      confidence: "medium",
      summary:
        "Latest real-repo dogfood summary is a stale source-local test caveat, not a current target blocker.",
      artifacts: [latest.path],
      latestStatus: latest.status,
      latestPath: latest.path,
      repoPath: latest.repoPath,
      outcomeKind: typeof latest.outcomeKind === "string" ? latest.outcomeKind : undefined,
      nextAction:
        "Run `krn artifacts list --scope historical` and archive stale source-local dogfood artifacts after operator review.",
    };
  }

  const status: OperatorSummaryStatus =
    latest.status === "skipped"
      ? "skipped"
      : latest.status === "blocked"
        ? "blocked"
        : latest.status === "readiness"
          ? "readiness"
          : latest.status === "pass"
            ? "pass"
            : "warn";
  const outcomeKind = typeof latest.outcomeKind === "string" ? latest.outcomeKind : undefined;
  const missingEnv = Array.isArray(latest.missingEnv)
    ? latest.missingEnv.filter((item): item is string => typeof item === "string")
    : [];
  const missingEnvText =
    missingEnv.length > 0 ? missingEnv.join(", ") : "required real-repo dogfood env";
  const skippedMissingEnv = status === "skipped" && outcomeKind === "skipped-missing-env";
  const nextCommand = typeof latest.nextCommand === "string" ? latest.nextCommand : undefined;

  return {
    status,
    confidence: "medium",
    summary:
      status === "pass"
        ? "Real-repo dogfood summary reports execution pass."
        : status === "readiness"
          ? "Real-repo dogfood is readiness-only; paid/manual execution remains unproven."
          : skippedMissingEnv
            ? `Real-repo dogfood was skipped because required environment is missing: ${missingEnvText}.`
            : status === "skipped"
              ? "Real-repo dogfood was skipped."
              : status === "blocked"
                ? "Real-repo dogfood is blocked."
                : "Real-repo dogfood summary needs review.",
    artifacts: [latest.path],
    latestStatus: latest.status,
    latestPath: latest.path,
    repoPath: latest.repoPath,
    outcomeKind,
    missingEnv,
    nextAction: skippedMissingEnv
      ? "Set KRN_REAL_REPO_DOGFOOD_PATH and KRN_REAL_REPO_DOGFOOD_APPROVED=1, then rerun scripts/krn-real-repo-dogfood.sh."
      : status === "readiness"
        ? (nextCommand ??
          "Review readiness-only real-repo dogfood report before approving paid/manual execution.")
        : undefined,
  };
}
