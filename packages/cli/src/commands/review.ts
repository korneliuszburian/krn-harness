import type { TaskContract } from "../../../task-contract/src/index.js";
import type { VerifyResult } from "../../../verify/src/index.js";
import {
  currentArtifactPathsFor,
  readRepoJson,
  readRepoText,
  repoPathExists,
} from "../current-artifacts.js";
import {
  readCurrentContextPackage,
  readCurrentTaskContract,
  readCurrentVerifyResult,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "../current-state.js";
import { parseReviewArgs } from "../review-args.js";
import { collectDogfoodSummaries, dogfoodReview } from "../review-dogfood.js";
import { renderReviewMarkdown } from "../review-render.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

export type ReviewStatus = "pass" | "warn" | "fail" | "blocked";
export type ReviewConfidence = "low" | "medium" | "high";
export type ReviewerName =
  | "safety"
  | "evidence"
  | "context"
  | "verify"
  | "handoff"
  | "dogfood"
  | "release";

export interface ReviewRecord {
  schema: "krn-reviewer-result-v1";
  reviewerId: ReviewerName;
  reviewerName: string;
  reviewer: ReviewerName;
  status: ReviewStatus;
  severity: ReviewStatus;
  confidence: ReviewConfidence;
  summary: string;
  evidence: string[];
  artifactsRead: string[];
  findings: string[];
  blockers: string[];
  warnings: string[];
  nextActions: string[];
}

export interface ReviewResult {
  schema: "krn-review-summary-v1";
  generatedAt: string;
  status: ReviewStatus;
  reviewers: ReviewRecord[];
  records: ReviewRecord[];
  blockers: string[];
  warnings: string[];
  nextActions: string[];
}

const reviewerNames: Record<ReviewerName, string> = {
  safety: "Safety reviewer",
  evidence: "Evidence reviewer",
  context: "Context reviewer",
  verify: "Verify reviewer",
  handoff: "Handoff reviewer",
  dogfood: "Dogfood reviewer",
  release: "Release readiness reviewer",
};

export function record(
  input: Omit<
    ReviewRecord,
    | "schema"
    | "reviewerId"
    | "reviewerName"
    | "severity"
    | "artifactsRead"
    | "blockers"
    | "warnings"
  >,
): ReviewRecord {
  return {
    schema: "krn-reviewer-result-v1",
    reviewerId: input.reviewer,
    reviewerName: reviewerNames[input.reviewer],
    ...input,
    severity: input.status,
    artifactsRead: input.evidence,
    blockers: input.status === "blocked" || input.status === "fail" ? input.findings : [],
    warnings: input.status === "warn" ? input.findings : [],
  };
}

function aggregateStatus(records: ReviewRecord[]): ReviewStatus {
  if (records.some((item) => item.status === "blocked")) return "blocked";
  if (records.some((item) => item.status === "fail")) return "fail";
  if (records.some((item) => item.status === "warn")) return "warn";
  return "pass";
}

function unique(values: string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function strongestStatus(left: ReviewStatus, right: ReviewStatus): ReviewStatus {
  if (left === "blocked" || right === "blocked") return "blocked";
  if (left === "fail" || right === "fail") return "fail";
  if (left === "warn" || right === "warn") return "warn";
  return "pass";
}

function protectedLookingPath(filePath: string): boolean {
  const normalized = filePath.toLowerCase();
  return (
    normalized.includes(".env") ||
    normalized.includes("secret") ||
    normalized.includes("credential") ||
    normalized.includes("id_rsa") ||
    normalized.includes("uploads/") ||
    normalized.includes("private/") ||
    /\.(sql|dump|bak|backup|pem|key)$/i.test(normalized)
  );
}

function isPythonToolsWrapperCommand(command: string): boolean {
  const [binary, script] = command.trim().split(/\s+/);
  return (
    binary === "python3" && script !== undefined && /^tools\/[A-Za-z0-9._/-]+\.py$/.test(script)
  );
}

function hasNonEmptyValues(values: string[] | undefined): boolean {
  return values !== undefined && values.length > 0;
}

function isDeclaredProtectedExclusion(item: {
  bucket?: string | undefined;
  source?: string | undefined;
  selector?: string | undefined;
}) {
  return (
    item.bucket === "do-not-use" &&
    item.source === "task-contract" &&
    item.selector === "required-do-not-use-path"
  );
}

async function safetyReview(cwd: string): Promise<ReviewRecord> {
  const artifactPaths = currentArtifactPathsFor(cwd);
  const contextPackage = await readCurrentContextPackage(cwd);
  const dogfoodSummaries = await collectDogfoodSummaries(cwd);
  const protectedContextItems =
    contextPackage?.items.filter((item) => protectedLookingPath(item.path)) ?? [];
  const declaredProtectedExclusions = protectedContextItems.filter(isDeclaredProtectedExclusion);
  const activeProtectedContextPaths = protectedContextItems
    .filter((item) => !isDeclaredProtectedExclusion(item))
    .map((item) => item.path);
  const declaredOnlyProtectedExclusionPaths = declaredProtectedExclusions
    .filter(
      (item) =>
        !activeProtectedContextPaths.some(
          (activePath) => activePath === item.path || activePath.startsWith(`${item.path}/`),
        ),
    )
    .map((item) => item.path);
  const globalFallbackRuns = dogfoodSummaries.filter((summary) =>
    summary.results?.some((result) => result.globalKrnFallbackUsed === true),
  );

  if (activeProtectedContextPaths.length > 0 || globalFallbackRuns.length > 0) {
    return record({
      reviewer: "safety",
      status: "fail",
      confidence: "high",
      summary: "Safety review found protected-looking paths or global KRN fallback evidence.",
      evidence: [
        ...(contextPackage ? [artifactPaths.contextPackage] : []),
        ...dogfoodSummaries.map((summary) => summary.path),
      ],
      findings: [
        ...activeProtectedContextPaths.map(
          (filePath) => `active protected path in context: ${filePath}`,
        ),
        ...declaredOnlyProtectedExclusionPaths.map(
          (filePath) => `protected path excluded from active context: ${filePath}`,
        ),
        ...globalFallbackRuns.map((summary) => `global KRN fallback in ${summary.path}`),
      ],
      nextActions: ["Remove protected paths from context or mark the run invalid."],
    });
  }

  return record({
    reviewer: "safety",
    status: "pass",
    confidence: contextPackage ? "medium" : "low",
    summary:
      declaredOnlyProtectedExclusionPaths.length > 0
        ? "Protected-looking paths are declared only as do-not-use exclusions."
        : "No protected-looking context paths or global KRN fallback evidence found.",
    evidence: [
      ...(contextPackage ? [artifactPaths.contextPackage] : []),
      ...dogfoodSummaries.map((summary) => summary.path),
    ],
    findings: declaredOnlyProtectedExclusionPaths.map(
      (filePath) => `protected path excluded from active context: ${filePath}`,
    ),
    nextActions: [],
  });
}

async function evidenceReview(cwd: string): Promise<ReviewRecord> {
  const artifactPaths = currentArtifactPathsFor(cwd);
  const required = [
    artifactPaths.taskContract,
    artifactPaths.contextPackage,
    artifactPaths.graph,
    artifactPaths.verifyResult,
    artifactPaths.handoff,
    `${artifactPaths.taskContract.slice(0, artifactPaths.taskContract.lastIndexOf("/"))}/run.json`,
  ];
  const present: string[] = [];
  const missing: string[] = [];

  for (const artifact of required) {
    if (await repoPathExists(cwd, artifact)) {
      present.push(artifact);
    } else {
      missing.push(artifact);
    }
  }

  if (missing.length > 0) {
    return record({
      reviewer: "evidence",
      status: "fail",
      confidence: "high",
      summary: "Required local evidence artifacts are missing.",
      evidence: present,
      findings: missing.map((artifact) => `missing artifact: ${artifact}`),
      nextActions: ["Run krn start, graph, context, verify, and handoff before review."],
    });
  }

  return record({
    reviewer: "evidence",
    status: "pass",
    confidence: "high",
    summary: "Required local evidence artifacts are present.",
    evidence: present,
    findings: [],
    nextActions: [],
  });
}

async function contextReview(cwd: string): Promise<ReviewRecord> {
  const artifactPaths = currentArtifactPathsFor(cwd);
  const contextPackage = await readCurrentContextPackage(cwd);

  if (!contextPackage) {
    return record({
      reviewer: "context",
      status: "blocked",
      confidence: "high",
      summary: "Context review is blocked because context package is missing.",
      evidence: [],
      findings: [`missing artifact: ${artifactPaths.contextPackage}`],
      nextActions: ["Run krn context before review."],
    });
  }

  if (contextPackage.stop) {
    return record({
      reviewer: "context",
      status: "blocked",
      confidence: "high",
      summary: "Context review is blocked by active STOP state.",
      evidence: [artifactPaths.contextPackage],
      findings: [contextPackage.stopReason ?? "context STOP active"],
      nextActions: ["Resolve missing context before editing or verification."],
    });
  }

  const findings: string[] = [];
  if (contextPackage.coverage.confidence === "low") {
    findings.push("context coverage confidence is low");
  }
  if (contextPackage.overInclusion.risk === "high") {
    findings.push("context over-inclusion risk is high");
  }

  return record({
    reviewer: "context",
    status: findings.length > 0 ? "warn" : "pass",
    confidence: "medium",
    summary:
      findings.length > 0
        ? "Context package exists but has quality warnings."
        : "Context package is present without STOP or high-risk context warnings.",
    evidence: [artifactPaths.contextPackage],
    findings,
    nextActions: findings.length > 0 ? ["Review context package before editing."] : [],
  });
}

function targetValidationBoundaryReview(
  verify: VerifyResult,
  taskContract: TaskContract | undefined,
): { status: ReviewStatus; findings: string[]; nextActions: string[] } {
  const boundary = taskContract?.metadata?.boundaries?.targetValidation;
  if (!boundary) {
    return { status: "pass", findings: [], nextActions: [] };
  }

  const failFindings: string[] = [];
  const warningFindings: string[] = [];
  const commandConfigured = verify.configuredCommands.includes(boundary.command);
  const metadata = taskContract?.metadata;
  const targetApproval = metadata?.boundaries?.targetApproval;
  const missingTargetRunBoundaries = [
    ...(metadata?.expectedTouchedFiles && metadata.expectedTouchedFiles.length > 0
      ? []
      : ["expected touched files"]),
    ...(metadata?.forbiddenTouchedFiles && metadata.forbiddenTouchedFiles.length > 0
      ? []
      : ["forbidden touched files"]),
    ...(metadata?.boundaries?.rollback ? [] : ["rollback boundary"]),
    ...(metadata?.boundaries?.noPush ? [] : ["no-push boundary"]),
    ...(metadata?.boundaries?.noMerge ? [] : ["no-merge boundary"]),
    ...(targetApproval ? [] : ["target approval boundary"]),
    ...(targetApproval && !targetApproval.approvalRef ? ["target approval reference"] : []),
    ...(metadata?.boundaries?.targetIsolation ? [] : ["target isolation boundary"]),
    ...(metadata?.boundaries?.protectedData ? [] : ["protected data boundary"]),
  ];

  if (!commandConfigured) {
    failFindings.push(`target validation command is not configured: ${boundary.command}`);
  } else if (!verify.executedCommands.includes(boundary.command)) {
    failFindings.push(`target validation command was not executed: ${boundary.command}`);
  }

  if (missingTargetRunBoundaries.length > 0) {
    failFindings.push(
      `target validation task spec is missing required target-run boundaries: ${missingTargetRunBoundaries.join(
        ", ",
      )}`,
    );
  }

  if (isPythonToolsWrapperCommand(boundary.command)) {
    if (!hasNonEmptyValues(boundary.limitations)) {
      failFindings.push(
        `target validation wrapper command is missing limitations: ${boundary.command}`,
      );
    }
    if (!hasNonEmptyValues(boundary.unsafeIf)) {
      failFindings.push(
        `target validation wrapper command is missing unsafe conditions: ${boundary.command}`,
      );
    }
  }

  if (boundary.coverage !== "full-suite") {
    warningFindings.push(`target validation coverage is ${boundary.coverage}, not full-suite`);
  }

  const status: ReviewStatus =
    failFindings.length > 0 ? "fail" : warningFindings.length > 0 ? "warn" : "pass";
  const nextActions =
    status === "pass"
      ? []
      : [
          "Align task-spec target validation boundaries with configured and executed verify evidence.",
          "Add expected touched files, forbidden touched files, rollback, no-push, no-merge, target approval, target approval reference, target isolation, and protected data boundaries before target-run proof.",
          "Add targetValidation limitations and unsafeIf entries before using Python tools wrappers as target proof.",
          "Do not claim full-suite target validation unless task-spec coverage is full-suite.",
        ];

  return {
    status,
    findings: [...failFindings, ...warningFindings],
    nextActions,
  };
}

async function verifyReview(
  cwd: string,
  taskContract: TaskContract | undefined,
): Promise<ReviewRecord> {
  const artifactPaths = currentArtifactPathsFor(cwd);
  const verify = await readCurrentVerifyResult(cwd);
  const targetValidationBoundary = taskContract?.metadata?.boundaries?.targetValidation;

  if (!verify) {
    return record({
      reviewer: "verify",
      status: "fail",
      confidence: "high",
      summary: "Verify result is missing.",
      evidence: [],
      findings: [`missing artifact: ${artifactPaths.verifyResult}`],
      nextActions: ["Run krn verify or krn verify --execute before review."],
    });
  }

  const findings = verify.checks
    .filter((check) => check.status !== "pass")
    .map((check) => `${check.name}: ${check.detail}`);
  const baseStatus: ReviewStatus =
    verify.status === "pass"
      ? "pass"
      : verify.status === "blocked"
        ? "blocked"
        : verify.status === "warn" || verify.status === "not-runnable"
          ? "warn"
          : "fail";
  const boundaryReview = targetValidationBoundaryReview(verify, taskContract);
  const status = strongestStatus(baseStatus, boundaryReview.status);

  return record({
    reviewer: "verify",
    status,
    confidence: "high",
    summary: targetValidationBoundary
      ? `Verify status is ${verify.status} in ${verify.mode} mode. Task-spec target validation boundary was checked.`
      : `Verify status is ${verify.status} in ${verify.mode} mode.`,
    evidence: [
      artifactPaths.verifyResult,
      ...(targetValidationBoundary ? [artifactPaths.taskContract] : []),
    ],
    findings: [...findings, ...boundaryReview.findings],
    nextActions:
      status === "pass"
        ? []
        : unique([
            "Resolve verify findings before claiming task completion.",
            ...boundaryReview.nextActions,
          ]),
  });
}

async function handoffReview(cwd: string): Promise<ReviewRecord> {
  const artifactPaths = currentArtifactPathsFor(cwd);
  const handoff = await readRepoText(cwd, artifactPaths.handoff);

  if (!handoff) {
    return record({
      reviewer: "handoff",
      status: "fail",
      confidence: "high",
      summary: "Handoff artifact is missing.",
      evidence: [],
      findings: [`missing artifact: ${artifactPaths.handoff}`],
      nextActions: ["Run krn handoff before review."],
    });
  }

  const requiredSections = ["## Verify", "## Known Gaps", "## Residual Risks"];
  const missingSections = requiredSections.filter((section) => !handoff.includes(section));

  return record({
    reviewer: "handoff",
    status: missingSections.length > 0 ? "warn" : "pass",
    confidence: "medium",
    summary:
      missingSections.length > 0
        ? "Handoff exists but misses expected sections."
        : "Handoff exists and includes expected review sections.",
    evidence: [artifactPaths.handoff],
    findings: missingSections.map((section) => `missing section: ${section}`),
    nextActions: missingSections.length > 0 ? ["Regenerate or update the handoff."] : [],
  });
}

async function releaseReview(cwd: string): Promise<ReviewRecord> {
  const packageJson = await readRepoJson<{ scripts?: Record<string, string> }>(cwd, "package.json");
  const hasVerifyLocal = typeof packageJson?.scripts?.["verify:local"] === "string";

  if (!hasVerifyLocal) {
    return record({
      reviewer: "release",
      status: "warn",
      confidence: "medium",
      summary: "No local verify:local script found.",
      evidence: packageJson ? ["package.json"] : [],
      findings: ["missing package.json scripts.verify:local"],
      nextActions: ["Document the local validation command before release decisions."],
    });
  }

  return record({
    reviewer: "release",
    status: "pass",
    confidence: "medium",
    summary: "Local validation gate is discoverable.",
    evidence: ["package.json"],
    findings: [],
    nextActions: [],
  });
}

export async function reviewCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const options = parseReviewArgs(args);
  if (options.error) {
    runtime.stderr(`${options.error}\n`);
    return 1;
  }

  const taskContract = await readCurrentTaskContract(runtime.cwd);
  const records = await Promise.all([
    safetyReview(runtime.cwd),
    evidenceReview(runtime.cwd),
    contextReview(runtime.cwd),
    verifyReview(runtime.cwd, taskContract),
    handoffReview(runtime.cwd),
    dogfoodReview(runtime.cwd),
    releaseReview(runtime.cwd),
  ]);
  const blockers = unique(records.flatMap((item) => item.blockers));
  const warnings = unique(records.flatMap((item) => item.warnings));
  const nextActions = unique(records.flatMap((item) => item.nextActions));
  const result: ReviewResult = {
    schema: "krn-review-summary-v1",
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    status: aggregateStatus(records),
    reviewers: records,
    records,
    blockers,
    warnings,
    nextActions,
  };
  const markdown = renderReviewMarkdown(result);

  if (options.write) {
    await writeCurrentJson(runtime.cwd, "review-summary.json", result);
    await writeCurrentMarkdown(runtime.cwd, "review-summary.md", markdown);
    await writeCurrentJson(runtime.cwd, "review-result.json", result);
    await writeCurrentMarkdown(runtime.cwd, "review-result.md", markdown);
  }

  await emitCliTrace(runtime, "review.ran", {
    taskId: taskContract?.id,
    runScoped: true,
    data: {
      status: result.status,
      records: result.reviewers.length,
      failures: result.reviewers.filter((item) => item.status === "fail").length,
      blocked: result.reviewers.filter((item) => item.status === "blocked").length,
      write: options.write,
    },
  });

  if (options.format === "json") {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  if (!options.write) {
    runtime.stdout(markdown);
    return 0;
  }

  runtime.stdout(`KRN review: ${result.status}
records: ${result.reviewers.length}
result: .krn/current/review-summary.md
`);

  return 0;
}
