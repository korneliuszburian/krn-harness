import type { Dirent } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { ContextPackage } from "../../context/src/index.js";
import { pathExists, readJsonFile } from "../../core/src/index.js";
import { memoryCounts } from "../../memory/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";
import type { VerifyResult } from "../../verify/src/index.js";
import type { CliIdentity } from "./identity.js";

export type OperatorSummaryStatus =
  | "pass"
  | "warn"
  | "fail"
  | "blocked"
  | "missing"
  | "skipped"
  | "readiness"
  | "unproven";

export type OperatorSummaryConfidence = "high" | "medium" | "low" | "unknown";

export interface OperatorSummaryArtifact {
  label: string;
  path: string;
  status: "present" | "missing";
}

export interface OperatorSummarySignal {
  status: OperatorSummaryStatus;
  confidence: OperatorSummaryConfidence;
  summary: string;
  artifacts: string[];
}

export interface OperatorSummary {
  schema: "krn-operator-summary-v1";
  generatedAt: string;
  repoPath: string;
  status: OperatorSummaryStatus;
  currentTask: OperatorSummarySignal & {
    id?: string | undefined;
    task?: string | undefined;
    classification?: string | undefined;
    stop?: boolean | undefined;
  };
  identity: OperatorSummarySignal & {
    schema?: string | undefined;
    packageName?: string | undefined;
    version?: string | undefined;
    commandPath?: string | undefined;
    requiredCommandsPresent?: boolean | undefined;
    supportedCommands?: string[] | undefined;
  };
  context: OperatorSummarySignal & {
    stop?: boolean | undefined;
    stopReason?: string | undefined;
    totalItems?: number | undefined;
    missingItems?: number | undefined;
    coverageConfidence?: string | undefined;
    overInclusionRisk?: string | undefined;
  };
  graph: OperatorSummarySignal & {
    nodeCount?: number | undefined;
    edgeCount?: number | undefined;
  };
  verify: OperatorSummarySignal & {
    mode?: string | undefined;
    profileName?: string | undefined;
    executedCommands?: number | undefined;
    totalCommands?: number | undefined;
  };
  handoff: OperatorSummarySignal;
  hooks: OperatorSummarySignal & {
    hookReceivedCount: number;
  };
  realRepoDogfood: OperatorSummarySignal & {
    latestStatus?: string | undefined;
    latestPath?: string | undefined;
    repoPath?: string | null | undefined;
    outcomeKind?: string | undefined;
    missingEnv?: string[] | undefined;
    nextAction?: string | undefined;
  };
  reviewers: OperatorSummarySignal & {
    total?: number | undefined;
    passCount?: number | undefined;
    warnCount?: number | undefined;
    failCount?: number | undefined;
    blockedCount?: number | undefined;
  };
  memory: OperatorSummarySignal & {
    pending: number;
    approved: number;
    deprecated: number;
  };
  risks: string[];
  blockers: string[];
  warnings: string[];
  nextActions: string[];
  artifacts: OperatorSummaryArtifact[];
}

interface BuildOperatorSummaryInput {
  cwd: string;
  generatedAt: string;
  identity?: CliIdentity | undefined;
}

interface GraphArtifactFixture {
  nodeCount?: unknown;
  edgeCount?: unknown;
}

interface TraceEventFixture {
  name?: unknown;
  data?: { payloadSource?: unknown; trustedHookLoad?: unknown } | undefined;
}

interface ReviewSummaryFixture {
  schema?: unknown;
  status?: unknown;
  reviewers?: Array<{ status?: unknown }> | undefined;
  records?: Array<{ status?: unknown }> | undefined;
}

interface RealRepoDogfoodSummaryFixture {
  schema?: unknown;
  status?: unknown;
  outcomeKind?: unknown;
  repoPath?: string | null | undefined;
  summaryJsonPath?: string | undefined;
  missingEnv?: unknown;
  nextCommand?: unknown;
  blockers?: string[] | undefined;
  warnings?: string[] | undefined;
}

const artifacts = {
  task: ".krn/current/task-contract.json",
  context: ".krn/current/context-package.json",
  graph: ".krn/graph/repo-graph.json",
  verify: ".krn/current/verify-result.json",
  handoff: ".krn/current/handoff.md",
  trace: ".krn/traces/trace.jsonl",
  reviewSummary: ".krn/current/review-summary.json",
  reviewResult: ".krn/current/review-result.json",
  memoryPending: ".krn/memory/pending.json",
  memoryApproved: ".krn/memory/approved.json",
  memoryDeprecated: ".krn/memory/deprecated.json",
} as const;

async function exists(cwd: string, relativePath: string): Promise<boolean> {
  return pathExists(path.join(cwd, relativePath));
}

async function readJson<T>(cwd: string, relativePath: string): Promise<T | undefined> {
  return readJsonFile<T>(path.join(cwd, relativePath));
}

async function readText(cwd: string, relativePath: string): Promise<string | undefined> {
  try {
    return await readFile(path.join(cwd, relativePath), "utf8");
  } catch {
    return undefined;
  }
}

async function collectArtifacts(cwd: string): Promise<OperatorSummaryArtifact[]> {
  const entries = [
    ["task contract", artifacts.task],
    ["context package", artifacts.context],
    ["graph", artifacts.graph],
    ["verify result", artifacts.verify],
    ["handoff", artifacts.handoff],
    ["trace", artifacts.trace],
    ["review summary", artifacts.reviewSummary],
    ["memory pending", artifacts.memoryPending],
    ["memory approved", artifacts.memoryApproved],
    ["memory deprecated", artifacts.memoryDeprecated],
  ] as const;

  return Promise.all(
    entries.map(async ([label, artifactPath]) => ({
      label,
      path: artifactPath,
      status: (await exists(cwd, artifactPath)) ? ("present" as const) : ("missing" as const),
    })),
  );
}

function artifactStatus(
  collected: OperatorSummaryArtifact[],
  artifactPath: string,
): "present" | "missing" {
  return collected.find((artifact) => artifact.path === artifactPath)?.status ?? "missing";
}

function currentTaskSignal(task: TaskContract | undefined): OperatorSummary["currentTask"] {
  if (!task) {
    return {
      status: "missing",
      confidence: "high",
      summary: "No current task contract is present.",
      artifacts: [],
    };
  }

  return {
    status: task.stop ? "blocked" : "pass",
    confidence: "high",
    summary: task.stop ? "Current task contract has active STOP." : "Current task is present.",
    artifacts: [artifacts.task],
    id: task.id,
    task: task.task,
    classification: task.classification,
    stop: task.stop,
  };
}

function identitySignal(identity: CliIdentity | undefined): OperatorSummary["identity"] {
  if (!identity) {
    return {
      status: "missing",
      confidence: "unknown",
      summary: "CLI identity was not provided to the summary builder.",
      artifacts: [],
    };
  }

  return {
    status: identity.requiredCommandsPresent ? "pass" : "fail",
    confidence: "high",
    summary: identity.requiredCommandsPresent
      ? "CLI identity is available and required commands are present."
      : "CLI identity is missing required commands.",
    artifacts: [],
    schema: identity.schema,
    packageName: identity.packageName,
    version: identity.version,
    commandPath: identity.commandPath,
    requiredCommandsPresent: identity.requiredCommandsPresent,
    supportedCommands: identity.supportedCommands,
  };
}

function contextSignal(context: ContextPackage | undefined): OperatorSummary["context"] {
  if (!context) {
    return {
      status: "missing",
      confidence: "high",
      summary: "No current context package is present.",
      artifacts: [],
    };
  }

  const warnings = context.coverage.confidence === "low" || context.overInclusion.risk === "high";

  return {
    status: context.stop ? "blocked" : warnings ? "warn" : "pass",
    confidence: "high",
    summary: context.stop
      ? "Context package reports STOP."
      : warnings
        ? "Context package is present with quality warnings."
        : "Context package is present.",
    artifacts: [artifacts.context],
    stop: context.stop,
    stopReason: context.stopReason,
    totalItems: context.items.length,
    missingItems: context.coverage.missing,
    coverageConfidence: context.coverage.confidence,
    overInclusionRisk: context.overInclusion.risk,
  };
}

function graphSignal(graph: GraphArtifactFixture | undefined): OperatorSummary["graph"] {
  if (!graph || typeof graph.nodeCount !== "number" || typeof graph.edgeCount !== "number") {
    return {
      status: "missing",
      confidence: "high",
      summary: "Graph artifact is missing.",
      artifacts: [],
    };
  }

  return {
    status: "pass",
    confidence: "medium",
    summary: "Graph artifact is present.",
    artifacts: [artifacts.graph],
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
  };
}

function verifySignal(verify: VerifyResult | undefined): OperatorSummary["verify"] {
  if (!verify) {
    return {
      status: "missing",
      confidence: "high",
      summary: "Verify result is missing.",
      artifacts: [],
    };
  }

  const status: OperatorSummaryStatus =
    verify.status === "pass"
      ? verify.mode === "record-only"
        ? "warn"
        : "pass"
      : verify.status === "blocked"
        ? "blocked"
        : verify.status === "fail"
          ? "fail"
          : "warn";

  return {
    status,
    confidence: "high",
    summary:
      verify.mode === "record-only"
        ? `Verify is ${verify.status} in record-only mode; this is not execution proof.`
        : `Verify is ${verify.status} in execute mode.`,
    artifacts: [artifacts.verify],
    mode: verify.mode,
    profileName: verify.profileName,
    executedCommands: verify.summary.executedCommands,
    totalCommands: verify.summary.totalCommands,
  };
}

function handoffSignal(handoff: string | undefined): OperatorSummary["handoff"] {
  if (!handoff) {
    return {
      status: "missing",
      confidence: "high",
      summary: "Handoff artifact is missing.",
      artifacts: [],
    };
  }

  const hasReviewSections =
    handoff.includes("## Verify") &&
    handoff.includes("## Known Gaps") &&
    handoff.includes("## Residual Risks");

  return {
    status: hasReviewSections ? "pass" : "warn",
    confidence: "medium",
    summary: hasReviewSections
      ? "Handoff artifact is present with expected review sections."
      : "Handoff artifact is present but misses expected review sections.",
    artifacts: [artifacts.handoff],
  };
}

function parseTraceEvents(rawTrace: string | undefined): TraceEventFixture[] {
  if (!rawTrace) {
    return [];
  }

  return rawTrace
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as TraceEventFixture;
      } catch {
        return {};
      }
    });
}

function hooksSignal(rawTrace: string | undefined): OperatorSummary["hooks"] {
  const hookEvents = parseTraceEvents(rawTrace).filter((event) => event.name === "hook.received");
  const hookReceivedCount = hookEvents.length;
  const trustedHookEvents = hookEvents.filter(
    (event) =>
      event.data?.payloadSource === "codex-trusted-hook" || event.data?.trustedHookLoad === true,
  );

  return {
    status: trustedHookEvents.length > 0 ? "pass" : "unproven",
    confidence: hookReceivedCount > 0 ? "medium" : "high",
    summary:
      trustedHookEvents.length > 0
        ? "Trusted non-manual hook evidence exists in local trace."
        : hookReceivedCount > 0
          ? "hook.received events exist, but no trusted non-manual hook-load marker exists; real Codex hook loading/trust remains unproven."
          : "No hook.received event exists; real Codex hook loading/trust remains unproven.",
    artifacts: rawTrace ? [artifacts.trace] : [],
    hookReceivedCount,
  };
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
        const summary = await readJson<RealRepoDogfoodSummaryFixture>(cwd, relativePath);
        if (summary?.schema === "krn-real-repo-dogfood-v1") {
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

async function realRepoDogfoodSignal(cwd: string): Promise<OperatorSummary["realRepoDogfood"]> {
  const summaries = await collectRealRepoDogfoodSummaries(cwd);
  const latest = summaries.at(-1);

  if (!latest || typeof latest.status !== "string") {
    return {
      status: "unproven",
      confidence: "high",
      summary: "No real-repo dogfood summary exists.",
      artifacts: [],
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

function reviewerRecords(review: ReviewSummaryFixture | undefined): Array<{ status?: unknown }> {
  return review?.reviewers ?? review?.records ?? [];
}

function reviewersSignal(review: ReviewSummaryFixture | undefined): OperatorSummary["reviewers"] {
  const records = reviewerRecords(review);
  if (!review || typeof review.status !== "string" || records.length === 0) {
    return {
      status: "missing",
      confidence: "high",
      summary: "No current review summary is present.",
      artifacts: [],
    };
  }

  const passCount = records.filter((record) => record.status === "pass").length;
  const warnCount = records.filter((record) => record.status === "warn").length;
  const failCount = records.filter((record) => record.status === "fail").length;
  const blockedCount = records.filter((record) => record.status === "blocked").length;

  return {
    status:
      review.status === "pass" ||
      review.status === "warn" ||
      review.status === "fail" ||
      review.status === "blocked"
        ? review.status
        : "warn",
    confidence: "high",
    summary: `Review summary is present with ${records.length} reviewer record(s).`,
    artifacts: [artifacts.reviewSummary],
    total: records.length,
    passCount,
    warnCount,
    failCount,
    blockedCount,
  };
}

async function memorySignal(cwd: string): Promise<OperatorSummary["memory"]> {
  const counts = await memoryCounts(cwd);

  return {
    status: counts.pending > 0 ? "warn" : "pass",
    confidence: "medium",
    summary:
      counts.pending > 0
        ? "Pending memory records require explicit operator approval or rejection."
        : "No pending memory records require action.",
    artifacts: [
      ...(counts.pending > 0 ? [artifacts.memoryPending] : []),
      ...(counts.approved > 0 ? [artifacts.memoryApproved] : []),
      ...(counts.deprecated > 0 ? [artifacts.memoryDeprecated] : []),
    ],
    pending: counts.pending,
    approved: counts.approved,
    deprecated: counts.deprecated,
  };
}

function summarizeProblems(
  signals: Array<{
    label: string;
    status: OperatorSummaryStatus;
    summary: string;
    nextAction?: string | undefined;
  }>,
): { risks: string[]; blockers: string[]; warnings: string[]; nextActions: string[] } {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const risks: string[] = [];
  const nextActions: string[] = [];

  for (const signal of signals) {
    if (signal.status === "blocked" || signal.status === "fail") {
      blockers.push(`${signal.label}: ${signal.summary}`);
    }

    if (
      signal.status === "warn" ||
      signal.status === "missing" ||
      signal.status === "skipped" ||
      signal.status === "readiness" ||
      signal.status === "unproven"
    ) {
      warnings.push(`${signal.label}: ${signal.summary}`);
    }
  }

  const hasWarningOrBlocker = (label: string) =>
    warnings.some((warning) => warning.startsWith(`${label}:`)) ||
    blockers.some((blocker) => blocker.startsWith(`${label}:`));
  const reviewers = signals.find((signal) => signal.label === "reviewers");
  const realRepoDogfood = signals.find((signal) => signal.label === "realRepoDogfood");

  if (hasWarningOrBlocker("hooks")) {
    risks.push("Hooks are not validated until real hook.received events appear without bypass.");
    nextActions.push("Run a non-bypass Codex hook trust probe before claiming hook validation.");
  }

  if (hasWarningOrBlocker("realRepoDogfood")) {
    risks.push("Real user-repo behavior remains unproven until approved dogfood executes.");
    nextActions.push(
      realRepoDogfood?.nextAction ??
        "Run real-repo dogfood on an approved non-protected repository.",
    );
  }

  if (reviewers?.status === "missing") {
    nextActions.push("Run `krn review --write` before final handoff.");
  } else if (reviewers && reviewers.status !== "pass") {
    nextActions.push("Resolve reviewer warnings or blockers before final completion.");
  }

  if (hasWarningOrBlocker("verify")) {
    nextActions.push("Run `krn verify --execute` when safe verify commands are configured.");
  }

  if (hasWarningOrBlocker("context")) {
    nextActions.push("Run `krn context` and resolve STOP or quality warnings.");
  }

  if (hasWarningOrBlocker("handoff")) {
    nextActions.push("Run `krn handoff` after verify/review artifacts are current.");
  }

  if (blockers.length > 0) {
    nextActions.unshift("Resolve blockers before claiming completion.");
  }

  return {
    risks: [...new Set(risks)],
    blockers: [...new Set(blockers)],
    warnings: [...new Set(warnings)],
    nextActions: [...new Set(nextActions)],
  };
}

function aggregateStatus(blockers: string[], warnings: string[]): OperatorSummaryStatus {
  if (blockers.some((blocker) => blocker.includes("blocked"))) return "blocked";
  if (blockers.length > 0) return "fail";
  if (warnings.length > 0) return "warn";
  return "pass";
}

export async function buildOperatorSummary(
  input: BuildOperatorSummaryInput,
): Promise<OperatorSummary> {
  const [task, context, graph, verify, handoff, rawTrace, review, reviewAlias, realRepo, memory] =
    await Promise.all([
      readJson<TaskContract>(input.cwd, artifacts.task),
      readJson<ContextPackage>(input.cwd, artifacts.context),
      readJson<GraphArtifactFixture>(input.cwd, artifacts.graph),
      readJson<VerifyResult>(input.cwd, artifacts.verify),
      readText(input.cwd, artifacts.handoff),
      readText(input.cwd, artifacts.trace),
      readJson<ReviewSummaryFixture>(input.cwd, artifacts.reviewSummary),
      readJson<ReviewSummaryFixture>(input.cwd, artifacts.reviewResult),
      realRepoDogfoodSignal(input.cwd),
      memorySignal(input.cwd),
    ]);

  const collectedArtifacts = await collectArtifacts(input.cwd);
  const summary = {
    currentTask: currentTaskSignal(task),
    identity: identitySignal(input.identity),
    context: contextSignal(context),
    graph: graphSignal(graph),
    verify: verifySignal(verify),
    handoff: handoffSignal(handoff),
    hooks: hooksSignal(rawTrace),
    realRepoDogfood: realRepo,
    reviewers: reviewersSignal(review ?? reviewAlias),
    memory,
  };
  const problems = summarizeProblems([
    { label: "currentTask", ...summary.currentTask },
    { label: "identity", ...summary.identity },
    { label: "context", ...summary.context },
    { label: "graph", ...summary.graph },
    { label: "verify", ...summary.verify },
    { label: "handoff", ...summary.handoff },
    { label: "hooks", ...summary.hooks },
    { label: "realRepoDogfood", ...summary.realRepoDogfood },
    { label: "reviewers", ...summary.reviewers },
    { label: "memory", ...summary.memory },
  ]);

  const artifactsWithReviewAlias = collectedArtifacts.map((artifact) =>
    artifact.path === artifacts.reviewSummary &&
    artifact.status === "missing" &&
    artifactStatus(collectedArtifacts, artifacts.reviewResult) === "present"
      ? { ...artifact, status: "present" as const }
      : artifact,
  );

  return {
    schema: "krn-operator-summary-v1",
    generatedAt: input.generatedAt,
    repoPath: input.cwd,
    status: aggregateStatus(problems.blockers, problems.warnings),
    ...summary,
    ...problems,
    artifacts: artifactsWithReviewAlias,
  };
}

function renderList(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- none"];
}

function renderSignal(label: string, signal: OperatorSummarySignal): string[] {
  return [
    `### ${label}`,
    "",
    `Status: ${signal.status}`,
    `Confidence: ${signal.confidence}`,
    `Summary: ${signal.summary}`,
    `Artifacts: ${signal.artifacts.length > 0 ? signal.artifacts.join(", ") : "none"}`,
    "",
  ];
}

export function renderOperatorSummaryMarkdown(summary: OperatorSummary): string {
  return [
    "# KRN Operator Summary",
    "",
    `Status: ${summary.status}`,
    `Generated at: ${summary.generatedAt}`,
    `Repo: ${summary.repoPath}`,
    "",
    "## Task",
    "",
    `Task ID: ${summary.currentTask.id ?? "missing"}`,
    `Task: ${summary.currentTask.task ?? "missing"}`,
    "",
    "## Signals",
    "",
    ...renderSignal("identity", summary.identity),
    ...renderSignal("context", summary.context),
    ...renderSignal("graph", summary.graph),
    ...renderSignal("verify", summary.verify),
    ...renderSignal("handoff", summary.handoff),
    ...renderSignal("hooks", summary.hooks),
    ...renderSignal("realRepoDogfood", summary.realRepoDogfood),
    ...renderSignal("reviewers", summary.reviewers),
    ...renderSignal("memory", summary.memory),
    "## Blockers",
    "",
    ...renderList(summary.blockers),
    "",
    "## Warnings",
    "",
    ...renderList(summary.warnings),
    "",
    "## Risks",
    "",
    ...renderList(summary.risks),
    "",
    "## Next Actions",
    "",
    ...renderList(summary.nextActions),
    "",
    "## Artifacts",
    "",
    "| Label | Status | Path |",
    "| --- | --- | --- |",
    ...summary.artifacts.map(
      (artifact) => `| ${artifact.label} | ${artifact.status} | ${artifact.path} |`,
    ),
    "",
    "## Limits",
    "",
    "- This summary reads local artifacts only.",
    "- Missing, skipped, readiness, and unproven states are not pass states.",
    "- This summary does not run verify commands, call Codex, inspect protected data, or claim production proof.",
    "",
  ].join("\n");
}
