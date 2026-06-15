import type { ContextPackage } from "../../context/src/index.js";
import { classifyHookTrust } from "../../core/src/index.js";
import { memoryCounts } from "../../memory/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";
import type { VerifyResult } from "../../verify/src/index.js";
import {
  currentArtifactPaths,
  readRepoJson,
  readRepoText,
  repoPathExists,
} from "./current-artifacts.js";
import type { CliIdentity } from "./identity.js";
import {
  aggregateOperatorSummaryStatus,
  summarizeOperatorSummaryProblems,
} from "./operator-summary-problems.js";
import { realRepoDogfoodSignal } from "./operator-summary-real-repo.js";

export type OperatorSummaryStatus =
  | "pass"
  | "warn"
  | "fail"
  | "blocked"
  | "missing"
  | "skipped"
  | "readiness"
  | "unproven"
  | "manual-diagnostic-only"
  | "partially-proven"
  | "execution-evidence";

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
    hookTrustStatus: "unproven" | "manual-diagnostic-only" | "partially-proven";
  };
  realRepoDogfood: OperatorSummarySignal & {
    latestStatus?: string | undefined;
    latestPath?: string | undefined;
    repoPath?: string | null | undefined;
    executionWorktreePath?: string | null | undefined;
    outcomeKind?: string | undefined;
    executionKind?: string | undefined;
    validationStatus?: string | undefined;
    productionProof?: boolean | undefined;
    hookTrustStatus?: string | undefined;
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

const artifacts = {
  task: currentArtifactPaths.taskContract,
  context: currentArtifactPaths.contextPackage,
  graph: currentArtifactPaths.graph,
  verify: currentArtifactPaths.verifyResult,
  handoff: currentArtifactPaths.handoff,
  trace: currentArtifactPaths.trace,
  reviewSummary: currentArtifactPaths.reviewSummary,
  reviewResult: currentArtifactPaths.reviewResult,
  memoryPending: currentArtifactPaths.memoryPending,
  memoryApproved: currentArtifactPaths.memoryApproved,
  memoryDeprecated: currentArtifactPaths.memoryDeprecated,
} as const;

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
      status: (await repoPathExists(cwd, artifactPath))
        ? ("present" as const)
        : ("missing" as const),
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
  const diagnosticHookEvents = hookEvents.filter(
    (event) =>
      event.data?.payloadSource === "placeholder" ||
      event.data?.payloadSource === "stdin-json" ||
      event.data?.payloadSource === "stdin-invalid-json",
  );
  const diagnosticOnly =
    hookReceivedCount > 0 && trustedHookEvents.length === 0 && diagnosticHookEvents.length > 0;
  const hookTrustStatus = classifyHookTrust({
    hookReceivedCount,
    trustedHookCount: trustedHookEvents.length,
    diagnosticHookCount: diagnosticHookEvents.length,
  }) as OperatorSummary["hooks"]["hookTrustStatus"];

  return {
    status: hookTrustStatus,
    confidence: hookReceivedCount > 0 ? "medium" : "high",
    summary:
      trustedHookEvents.length > 0
        ? "Trusted non-manual hook evidence exists in local trace; hook trust is only partially proven for that event/path."
        : diagnosticOnly
          ? "Only diagnostic-level hook.received events exist; real Codex hook loading/trust remains unproven."
          : hookReceivedCount > 0
            ? "hook.received events exist, but no trusted non-manual hook-load marker exists; real Codex hook loading/trust remains unproven."
            : "No hook.received event exists; real Codex hook loading/trust remains unproven.",
    artifacts: rawTrace ? [artifacts.trace] : [],
    hookReceivedCount,
    hookTrustStatus,
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

export async function buildOperatorSummary(
  input: BuildOperatorSummaryInput,
): Promise<OperatorSummary> {
  const [task, context, graph, verify, handoff, rawTrace, review, reviewAlias, realRepo, memory] =
    await Promise.all([
      readRepoJson<TaskContract>(input.cwd, artifacts.task),
      readRepoJson<ContextPackage>(input.cwd, artifacts.context),
      readRepoJson<GraphArtifactFixture>(input.cwd, artifacts.graph),
      readRepoJson<VerifyResult>(input.cwd, artifacts.verify),
      readRepoText(input.cwd, artifacts.handoff),
      readRepoText(input.cwd, artifacts.trace),
      readRepoJson<ReviewSummaryFixture>(input.cwd, artifacts.reviewSummary),
      readRepoJson<ReviewSummaryFixture>(input.cwd, artifacts.reviewResult),
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
  const problems = summarizeOperatorSummaryProblems([
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
    status: aggregateOperatorSummaryStatus(problems.blockers, problems.warnings),
    ...summary,
    ...problems,
    artifacts: artifactsWithReviewAlias,
  };
}
