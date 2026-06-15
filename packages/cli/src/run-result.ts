export type RunStatus = "planned" | "blocked" | "ran" | "verified" | "failed";

export type RunStepStatus = "planned" | "blocked" | "ran" | "verified" | "failed" | "skipped";

export interface StepResult {
  status: RunStepStatus;
  summary: string;
  code?: number | undefined;
  artifacts?: string[] | undefined;
  skippedReason?: string | undefined;
}

export interface RunResult {
  schema: "krn-run-result-v1";
  status: RunStatus;
  generatedAt: string;
  dryRun: boolean;
  executeVerify: boolean;
  taskText?: string | undefined;
  taskSpecPath?: string | undefined;
  steps: {
    start: StepResult;
    graph: StepResult;
    context: StepResult;
    verify: StepResult;
    handoff: StepResult;
    review: StepResult;
    summary: StepResult;
    report: StepResult;
    releaseCheck?: StepResult | undefined;
  };
  context: {
    stop: boolean;
    totalItems?: number | undefined;
    activeItems?: number | undefined;
    referenceOnlyItems?: number | undefined;
    overInclusionRisk?: string | undefined;
  };
  verify: {
    mode?: "record-only" | "execute" | undefined;
    status?: string | undefined;
    executedCommands?: number | undefined;
    totalCommands?: number | undefined;
    profileName?: string | undefined;
  };
  proof: {
    productionProof: false;
    hookTrustStatus: string;
  };
  blockers: string[];
  warnings: string[];
  nextActions: string[];
  artifacts: Record<string, string>;
}

function markdownList(values: string[]): string[] {
  return values.length > 0 ? values.map((value) => `- ${value}`) : ["- none"];
}

function stepLine(name: string, step: StepResult): string {
  return `| ${name} | ${step.status} | ${step.summary.replaceAll("|", "\\|")} |`;
}

export function renderRunResultMarkdown(result: RunResult): string {
  return [
    "# KRN Run Result",
    "",
    `Status: ${result.status}`,
    `Generated at: ${result.generatedAt}`,
    `Dry run: ${String(result.dryRun)}`,
    `Execute verify requested: ${String(result.executeVerify)}`,
    `Production proof: ${String(result.proof.productionProof)}`,
    `Hook trust: ${result.proof.hookTrustStatus}`,
    "",
    "## Task",
    "",
    `Task text: ${result.taskText ?? "none"}`,
    `Task spec path: ${result.taskSpecPath ?? "none"}`,
    "",
    "## Steps",
    "",
    "| Step | Status | Summary |",
    "| --- | --- | --- |",
    stepLine("start", result.steps.start),
    stepLine("graph", result.steps.graph),
    stepLine("context", result.steps.context),
    stepLine("verify", result.steps.verify),
    stepLine("handoff", result.steps.handoff),
    stepLine("review", result.steps.review),
    stepLine("summary", result.steps.summary),
    stepLine("report", result.steps.report),
    ...(result.steps.releaseCheck ? [stepLine("release-check", result.steps.releaseCheck)] : []),
    "",
    "## Context",
    "",
    `STOP: ${String(result.context.stop)}`,
    `Total items: ${result.context.totalItems ?? "missing"}`,
    `Active items: ${result.context.activeItems ?? "missing"}`,
    `Reference-only items: ${result.context.referenceOnlyItems ?? "missing"}`,
    `Over-inclusion risk: ${result.context.overInclusionRisk ?? "missing"}`,
    "",
    "## Verify",
    "",
    `Mode: ${result.verify.mode ?? "missing"}`,
    `Status: ${result.verify.status ?? "missing"}`,
    `Profile: ${result.verify.profileName ?? "missing"}`,
    `Commands: total ${result.verify.totalCommands ?? "missing"}, executed ${
      result.verify.executedCommands ?? "missing"
    }`,
    "",
    "## Blockers",
    "",
    ...markdownList(result.blockers),
    "",
    "## Warnings",
    "",
    ...markdownList(result.warnings),
    "",
    "## Next Actions",
    "",
    ...markdownList(result.nextActions),
    "",
    "## Artifacts",
    "",
    ...Object.entries(result.artifacts).map(([name, artifactPath]) => `- ${name}: ${artifactPath}`),
    "",
    "## Limits",
    "",
    "- This is local operator evidence only.",
    "- It does not execute Codex or claim production proof.",
    "- Hook trust is copied from local report evidence and must not be promoted by this artifact.",
    "",
  ].join("\n");
}
