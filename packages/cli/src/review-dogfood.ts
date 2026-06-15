import type { Dirent } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { classifyExecutionResult } from "../../core/src/index.js";
import { type ReviewRecord, record } from "./commands/review.js";
import { readRepoJson } from "./current-artifacts.js";

export interface DogfoodSummary {
  path: string;
  mtimeMs: number;
  schema?: string | undefined;
  status?: string | undefined;
  outcomeKind?: string | undefined;
  executionKind?: string | undefined;
  validationStatus?: string | undefined;
  forbiddenTouchedFiles?: string[] | undefined;
  committedTargetRepo?: boolean | undefined;
  pushedTargetRepo?: boolean | undefined;
  hookTrustStatus?: string | undefined;
  productionProof?: boolean | undefined;
  results?: { globalKrnFallbackUsed?: boolean | undefined }[] | undefined;
  aggregates?: { mode?: string; taskPasses?: number; tasks?: number; invalidRuns?: number }[];
}

type DogfoodSummaryJson = Omit<DogfoodSummary, "path" | "mtimeMs">;

export async function collectDogfoodSummaries(cwd: string): Promise<DogfoodSummary[]> {
  const root = path.join(cwd, ".krn", "dogfood");
  const summaries: DogfoodSummary[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > 4) return;

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
        const summary = await readRepoJson<DogfoodSummaryJson>(cwd, relativePath);
        const info = await stat(entryPath);
        summaries.push({ path: relativePath, mtimeMs: info.mtimeMs, ...summary });
      }
    }
  }

  await walk(root, 0);
  return summaries.sort(
    (left, right) => left.mtimeMs - right.mtimeMs || left.path.localeCompare(right.path),
  );
}

function summarizeDogfoodFindings(label: string, summaries: DogfoodSummary[]): string[] {
  const latest = summaries.at(-1);
  if (!latest) return [];

  return [
    `${label}: ${latest.path}`,
    ...(summaries.length > 1
      ? [`${label}: ${summaries.length - 1} older artifact(s) omitted; see evidence list.`]
      : []),
  ];
}

function isExecutionResult(summary: DogfoodSummary): boolean {
  return (
    summary.schema === "krn-real-repo-execution-result-v1" ||
    summary.path.includes("/real-repo-execution/")
  );
}

function isUnsafeExecutionResult(summary: DogfoodSummary): boolean {
  return isExecutionResult(summary) && classifyExecutionResult(summary).severity === "fail";
}

function isBlockedDogfood(summary: DogfoodSummary): boolean {
  return summary.status === "blocked" || summary.executionKind === "blocked";
}

function isSkippedDogfood(summary: DogfoodSummary): boolean {
  return summary.status === "skipped" || summary.executionKind === "skipped";
}

function isExecutionWarning(summary: DogfoodSummary): boolean {
  const classification = classifyExecutionResult(summary);
  return (
    isExecutionResult(summary) &&
    !isUnsafeExecutionResult(summary) &&
    !isBlockedDogfood(summary) &&
    !isSkippedDogfood(summary) &&
    (classification.severity === "warn" ||
      classification.nextAction !== undefined ||
      summary.executionKind === "manual-no-codex")
  );
}

export async function dogfoodReview(cwd: string): Promise<ReviewRecord> {
  const summaries = await collectDogfoodSummaries(cwd);

  if (summaries.length === 0) {
    return record({
      reviewer: "dogfood",
      status: "warn",
      confidence: "medium",
      summary: "No local dogfood summary artifacts found.",
      evidence: [],
      findings: ["missing artifact: .krn/dogfood/**/summary.json"],
      nextActions: ["Run a dogfood benchmark or real-repo readiness scaffold when relevant."],
    });
  }

  const failing = summaries.filter((summary) => summary.status === "fail");
  const invalid = summaries.filter((summary) =>
    summary.aggregates?.some((aggregate) => (aggregate.invalidRuns ?? 0) > 0),
  );
  const blocked = summaries.filter(isBlockedDogfood);
  const skipped = summaries.filter(isSkippedDogfood);
  const readiness = summaries.filter(
    (summary) => summary.status === "readiness" || summary.outcomeKind === "readiness-only",
  );
  const preflightOnly = summaries.filter(
    (summary) =>
      summary.schema === "krn-real-repo-preflight-v1" ||
      summary.path.includes("/real-repo-preflight/"),
  );
  const executionResults = summaries.filter(isExecutionResult);
  const unsafeExecutionResults = executionResults.filter(isUnsafeExecutionResult);
  const executionWarnings = executionResults.filter(isExecutionWarning);

  return record({
    reviewer: "dogfood",
    status:
      failing.length > 0 || invalid.length > 0 || unsafeExecutionResults.length > 0
        ? "fail"
        : blocked.length > 0 ||
            skipped.length > 0 ||
            readiness.length > 0 ||
            preflightOnly.length > 0 ||
            executionWarnings.length > 0
          ? "warn"
          : "pass",
    confidence: "medium",
    summary: `Found ${summaries.length} dogfood summary artifact(s): ${failing.length} failing, ${invalid.length} invalid, ${blocked.length} blocked, ${skipped.length} skipped, ${readiness.length} readiness-only, ${preflightOnly.length} preflight-only, ${executionResults.length} execution-result.`,
    evidence: summaries.map((summary) => summary.path),
    findings: [
      ...summarizeDogfoodFindings("failing dogfood summary", failing),
      ...summarizeDogfoodFindings("invalid dogfood runs in", invalid),
      ...summarizeDogfoodFindings("unsafe execution result", unsafeExecutionResults),
      ...summarizeDogfoodFindings("blocked dogfood summary", blocked),
      ...summarizeDogfoodFindings("skipped dogfood summary", skipped),
      ...summarizeDogfoodFindings("readiness-only dogfood summary", readiness),
      ...summarizeDogfoodFindings("preflight-only dogfood summary", preflightOnly),
      ...summarizeDogfoodFindings("execution-result warning", executionWarnings),
    ],
    nextActions:
      failing.length > 0 || invalid.length > 0 || unsafeExecutionResults.length > 0
        ? ["Inspect failing, invalid, or unsafe dogfood reports."]
        : blocked.length > 0 ||
            skipped.length > 0 ||
            readiness.length > 0 ||
            preflightOnly.length > 0 ||
            executionWarnings.length > 0
          ? [
              "Review blocked/skipped/readiness/preflight/execution dogfood reports before claiming execution proof.",
            ]
          : [],
  });
}
