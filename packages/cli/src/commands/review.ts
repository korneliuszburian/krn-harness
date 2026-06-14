import type { Dirent } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import {
  readCurrentContextPackage,
  readCurrentTaskContract,
  readCurrentVerifyResult,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "../current-state.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

type ReviewStatus = "pass" | "warn" | "fail" | "blocked";
type ReviewConfidence = "low" | "medium" | "high";
type ReviewerName =
  | "safety"
  | "evidence"
  | "context"
  | "verify"
  | "handoff"
  | "dogfood"
  | "release";

export interface ReviewRecord {
  schema: "krn-review-record-v0";
  reviewer: ReviewerName;
  status: ReviewStatus;
  severity: ReviewStatus;
  confidence: ReviewConfidence;
  summary: string;
  evidence: string[];
  findings: string[];
  nextActions: string[];
}

export interface ReviewResult {
  schema: "krn-review-result-v0";
  generatedAt: string;
  status: ReviewStatus;
  records: ReviewRecord[];
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(cwd: string, relativePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path.join(cwd, relativePath), "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function readText(cwd: string, relativePath: string): Promise<string | undefined> {
  try {
    return await readFile(path.join(cwd, relativePath), "utf8");
  } catch {
    return undefined;
  }
}

function record(input: Omit<ReviewRecord, "schema" | "severity">): ReviewRecord {
  return {
    schema: "krn-review-record-v0",
    ...input,
    severity: input.status,
  };
}

function aggregateStatus(records: ReviewRecord[]): ReviewStatus {
  if (records.some((item) => item.status === "blocked")) return "blocked";
  if (records.some((item) => item.status === "fail")) return "fail";
  if (records.some((item) => item.status === "warn")) return "warn";
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

async function safetyReview(cwd: string): Promise<ReviewRecord> {
  const contextPackage = await readCurrentContextPackage(cwd);
  const dogfoodSummaries = await collectDogfoodSummaries(cwd);
  const protectedContextPaths =
    contextPackage?.items
      .map((item) => item.path)
      .filter((filePath) => protectedLookingPath(filePath)) ?? [];
  const globalFallbackRuns = dogfoodSummaries.filter((summary) =>
    summary.results?.some((result) => result.globalKrnFallbackUsed === true),
  );

  if (protectedContextPaths.length > 0 || globalFallbackRuns.length > 0) {
    return record({
      reviewer: "safety",
      status: "fail",
      confidence: "high",
      summary: "Safety review found protected-looking paths or global KRN fallback evidence.",
      evidence: [
        ...(contextPackage ? [".krn/current/context-package.json"] : []),
        ...dogfoodSummaries.map((summary) => summary.path),
      ],
      findings: [
        ...protectedContextPaths.map((filePath) => `protected-looking context path: ${filePath}`),
        ...globalFallbackRuns.map((summary) => `global KRN fallback in ${summary.path}`),
      ],
      nextActions: ["Remove protected paths from context or mark the run invalid."],
    });
  }

  return record({
    reviewer: "safety",
    status: "pass",
    confidence: contextPackage ? "medium" : "low",
    summary: "No protected-looking context paths or global KRN fallback evidence found.",
    evidence: [
      ...(contextPackage ? [".krn/current/context-package.json"] : []),
      ...dogfoodSummaries.map((summary) => summary.path),
    ],
    findings: [],
    nextActions: [],
  });
}

async function evidenceReview(cwd: string): Promise<ReviewRecord> {
  const required = [
    ".krn/current/task-contract.json",
    ".krn/current/context-package.json",
    ".krn/graph/repo-graph.json",
    ".krn/current/verify-result.json",
    ".krn/current/handoff.md",
    ".krn/current/run.json",
  ];
  const present: string[] = [];
  const missing: string[] = [];

  for (const artifact of required) {
    if (await exists(path.join(cwd, artifact))) {
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
  const contextPackage = await readCurrentContextPackage(cwd);

  if (!contextPackage) {
    return record({
      reviewer: "context",
      status: "blocked",
      confidence: "high",
      summary: "Context review is blocked because context package is missing.",
      evidence: [],
      findings: ["missing artifact: .krn/current/context-package.json"],
      nextActions: ["Run krn context before review."],
    });
  }

  if (contextPackage.stop) {
    return record({
      reviewer: "context",
      status: "blocked",
      confidence: "high",
      summary: "Context review is blocked by active STOP state.",
      evidence: [".krn/current/context-package.json"],
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
    evidence: [".krn/current/context-package.json"],
    findings,
    nextActions: findings.length > 0 ? ["Review context package before editing."] : [],
  });
}

async function verifyReview(cwd: string): Promise<ReviewRecord> {
  const verify = await readCurrentVerifyResult(cwd);

  if (!verify) {
    return record({
      reviewer: "verify",
      status: "fail",
      confidence: "high",
      summary: "Verify result is missing.",
      evidence: [],
      findings: ["missing artifact: .krn/current/verify-result.json"],
      nextActions: ["Run krn verify or krn verify --execute before review."],
    });
  }

  const findings = verify.checks
    .filter((check) => check.status !== "pass")
    .map((check) => `${check.name}: ${check.detail}`);
  const status: ReviewStatus =
    verify.status === "pass"
      ? "pass"
      : verify.status === "blocked"
        ? "blocked"
        : verify.status === "warn" || verify.status === "not-runnable"
          ? "warn"
          : "fail";

  return record({
    reviewer: "verify",
    status,
    confidence: "high",
    summary: `Verify status is ${verify.status} in ${verify.mode} mode.`,
    evidence: [".krn/current/verify-result.json"],
    findings,
    nextActions:
      status === "pass" ? [] : ["Resolve verify findings before claiming task completion."],
  });
}

async function handoffReview(cwd: string): Promise<ReviewRecord> {
  const handoff = await readText(cwd, ".krn/current/handoff.md");

  if (!handoff) {
    return record({
      reviewer: "handoff",
      status: "fail",
      confidence: "high",
      summary: "Handoff artifact is missing.",
      evidence: [],
      findings: ["missing artifact: .krn/current/handoff.md"],
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
    evidence: [".krn/current/handoff.md"],
    findings: missingSections.map((section) => `missing section: ${section}`),
    nextActions: missingSections.length > 0 ? ["Regenerate or update the handoff."] : [],
  });
}

interface DogfoodSummary {
  path: string;
  status?: string | undefined;
  results?: { globalKrnFallbackUsed?: boolean | undefined }[] | undefined;
  aggregates?: { mode?: string; taskPasses?: number; tasks?: number; invalidRuns?: number }[];
}

async function collectDogfoodSummaries(cwd: string): Promise<DogfoodSummary[]> {
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
        const summary = await readJson<Omit<DogfoodSummary, "path">>(cwd, relativePath);
        summaries.push({ path: relativePath, ...summary });
      }
    }
  }

  await walk(root, 0);
  return summaries.sort((a, b) => a.path.localeCompare(b.path));
}

async function dogfoodReview(cwd: string): Promise<ReviewRecord> {
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
  const skipped = summaries.filter((summary) => summary.status === "skipped");

  return record({
    reviewer: "dogfood",
    status:
      failing.length > 0 || invalid.length > 0 ? "fail" : skipped.length > 0 ? "warn" : "pass",
    confidence: "medium",
    summary: `Found ${summaries.length} dogfood summary artifact(s).`,
    evidence: summaries.map((summary) => summary.path),
    findings: [
      ...failing.map((summary) => `failing dogfood summary: ${summary.path}`),
      ...invalid.map((summary) => `invalid dogfood runs in: ${summary.path}`),
      ...skipped.map((summary) => `skipped dogfood summary: ${summary.path}`),
    ],
    nextActions:
      failing.length > 0 || invalid.length > 0
        ? ["Inspect failing or invalid dogfood reports."]
        : skipped.length > 0
          ? ["Review skipped dogfood reasons before claiming readiness."]
          : [],
  });
}

async function releaseReview(cwd: string): Promise<ReviewRecord> {
  const packageJson = await readJson<{ scripts?: Record<string, string> }>(cwd, "package.json");
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

function renderReviewMarkdown(result: ReviewResult): string {
  return [
    "# KRN Review",
    "",
    `Status: ${result.status}`,
    `Generated at: ${result.generatedAt}`,
    "",
    "## Records",
    "",
    "| Reviewer | Status | Confidence | Summary |",
    "| --- | --- | --- | --- |",
    ...result.records.map(
      (item) =>
        `| ${item.reviewer} | ${item.status} | ${item.confidence} | ${item.summary.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## Findings",
    "",
    ...result.records.flatMap((item) => [
      `### ${item.reviewer}`,
      "",
      ...(item.findings.length > 0 ? item.findings.map((finding) => `- ${finding}`) : ["- none"]),
      "",
      "Next actions:",
      ...(item.nextActions.length > 0
        ? item.nextActions.map((action) => `- ${action}`)
        : ["- none"]),
      "",
    ]),
    "## Limits",
    "",
    "- Deterministic reviewers read local artifacts only.",
    "- Reviewers do not edit files, call models, execute verify commands, commit, or push.",
    "- Review records are operator guidance, not production proof.",
    "",
  ].join("\n");
}

export async function reviewCommand(args: string[], runtime: CliRuntime): Promise<number> {
  if (args.length > 0) {
    runtime.stderr("KRN review: expected `krn review`\n");
    return 1;
  }

  const [taskContract, records] = await Promise.all([
    readCurrentTaskContract(runtime.cwd),
    Promise.all([
      safetyReview(runtime.cwd),
      evidenceReview(runtime.cwd),
      contextReview(runtime.cwd),
      verifyReview(runtime.cwd),
      handoffReview(runtime.cwd),
      dogfoodReview(runtime.cwd),
      releaseReview(runtime.cwd),
    ]),
  ]);
  const result: ReviewResult = {
    schema: "krn-review-result-v0",
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    status: aggregateStatus(records),
    records,
  };

  await writeCurrentJson(runtime.cwd, "review-result.json", result);
  await writeCurrentMarkdown(runtime.cwd, "review-result.md", renderReviewMarkdown(result));
  await emitCliTrace(runtime, "review.ran", {
    taskId: taskContract?.id,
    runScoped: true,
    data: {
      status: result.status,
      records: result.records.length,
      failures: result.records.filter((item) => item.status === "fail").length,
      blocked: result.records.filter((item) => item.status === "blocked").length,
    },
  });

  runtime.stdout(`KRN review: ${result.status}
records: ${result.records.length}
result: .krn/current/review-result.md
`);

  return 0;
}
