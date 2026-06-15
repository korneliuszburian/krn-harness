import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContextPackage } from "../../../context/src/index.js";
import type { VerifyResult } from "../../../verify/src/index.js";
import {
  type BundleArtifactFile,
  copyCurrentArtifactFile,
  currentArtifactPaths,
  readRepoJson,
  repoPathExists,
} from "../current-artifacts.js";
import {
  currentStatePath,
  readCurrentContextPackage,
  readCurrentTaskContract,
  readCurrentVerifyResult,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "../current-state.js";
import type { OperatorReport } from "../operator-report.js";
import { type RunResult, renderRunResultMarkdown, type StepResult } from "../run-result.js";
import type { CliRuntime } from "../runtime.js";
import { contextCommand } from "./context.js";
import { graphCommand } from "./graph.js";
import { handoffCommand } from "./handoff.js";
import { releaseCheckCommand } from "./release-check.js";
import { reportCommand } from "./report.js";
import { reviewCommand } from "./review.js";
import { startCommand } from "./start.js";
import { summaryCommand } from "./summary.js";
import { verifyCommand } from "./verify.js";

interface RunCommandOptions {
  taskText?: string | undefined;
  taskSpecPath?: string | undefined;
  dryRun: boolean;
  json: boolean;
  executeVerify: boolean;
  bundle: boolean;
  error?: string | undefined;
}

interface CommandCapture {
  stdout: string;
  stderr: string;
}

interface ReleaseCheckResultFixture {
  status?: string | undefined;
  blockers?: string[] | undefined;
  warnings?: string[] | undefined;
  nextActions?: string[] | undefined;
}

type RunBundleFile = BundleArtifactFile;

interface RunBundleManifest {
  schema: "krn-run-bundle-manifest-v1";
  generatedAt: string;
  runStatus: RunResult["status"];
  productionProof: false;
  hookTrustStatus: string;
  files: RunBundleFile[];
  limits: string[];
}

function parseRunArgs(args: string[]): RunCommandOptions {
  const options: RunCommandOptions = {
    dryRun: false,
    json: false,
    executeVerify: false,
    bundle: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--task") {
      const value = args[index + 1];
      if (!value) {
        return { ...options, error: "KRN run: --task text is required" };
      }
      options.taskText = value;
      index += 1;
      continue;
    }

    if (arg === "--task-spec") {
      const value = args[index + 1];
      if (!value) {
        return { ...options, error: "KRN run: --task-spec path is required" };
      }
      options.taskSpecPath = value;
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--execute-verify") {
      options.executeVerify = true;
      continue;
    }

    if (arg === "--bundle") {
      options.bundle = true;
      continue;
    }

    return {
      ...options,
      error:
        "KRN run: expected `krn run --task <text>|--task-spec <json> [--dry-run] [--json] [--execute-verify] [--bundle]`",
    };
  }

  if (options.taskText && options.taskSpecPath) {
    return { ...options, error: "KRN run: choose either --task or --task-spec, not both" };
  }

  if (!options.taskText && !options.taskSpecPath) {
    return { ...options, error: "KRN run: --task or --task-spec is required" };
  }

  return options;
}

function captureRuntime(runtime: CliRuntime, capture: CommandCapture): CliRuntime {
  return {
    ...runtime,
    stdout: (text) => {
      capture.stdout += text;
    },
    stderr: (text) => {
      capture.stderr += text;
    },
  };
}

function firstLine(value: string, fallback: string): string {
  return (
    value
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? fallback
  );
}

function skipped(summary: string): StepResult {
  return { status: "skipped", summary, skippedReason: summary };
}

function blocked(summary: string): StepResult {
  return { status: "blocked", summary, skippedReason: summary };
}

async function runStep(
  runtime: CliRuntime,
  artifacts: string[],
  action: (stepRuntime: CliRuntime) => Promise<number>,
): Promise<{ step: StepResult; capture: CommandCapture }> {
  const capture: CommandCapture = { stdout: "", stderr: "" };
  const code = await action(captureRuntime(runtime, capture));
  const summary = firstLine(capture.stdout, code === 0 ? "step completed" : "step failed");

  return {
    step: {
      status: code === 0 ? "ran" : "failed",
      summary,
      code,
      artifacts,
    },
    capture,
  };
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function runArtifacts(bundle: boolean): Record<string, string> {
  return {
    taskContract: currentArtifactPaths.taskContract,
    graph: currentArtifactPaths.graph,
    contextPackage: currentArtifactPaths.contextPackage,
    verifyResult: currentArtifactPaths.verifyResult,
    handoff: currentArtifactPaths.handoff,
    reviewSummary: currentArtifactPaths.reviewSummary,
    operatorSummary: currentArtifactPaths.operatorSummary,
    operatorReportMarkdown: currentArtifactPaths.operatorReportMarkdown,
    operatorReportJson: currentArtifactPaths.operatorReportJson,
    operatorReportHtml: currentArtifactPaths.operatorReportHtml,
    ...(bundle
      ? {
          releaseCheckJson: currentArtifactPaths.releaseCheckJson,
          releaseCheckMarkdown: currentArtifactPaths.releaseCheckMarkdown,
          runBundleManifest: currentArtifactPaths.runBundleManifest,
        }
      : {}),
    runResultJson: currentArtifactPaths.runResultJson,
    runResultMarkdown: currentArtifactPaths.runResultMarkdown,
  };
}

function summarizeContext(contextPackage: ContextPackage | undefined): RunResult["context"] {
  return {
    stop: contextPackage?.stop ?? false,
    totalItems: contextPackage?.compactness.totalItems,
    activeItems: contextPackage?.overInclusion.activeItems,
    referenceOnlyItems: contextPackage?.overInclusion.referenceOnlyItems,
    overInclusionRisk: contextPackage?.overInclusion.risk,
  };
}

function summarizeVerify(verifyResult: VerifyResult | undefined): RunResult["verify"] {
  return {
    mode: verifyResult?.mode,
    status: verifyResult?.status,
    executedCommands: verifyResult?.summary.executedCommands,
    totalCommands: verifyResult?.summary.totalCommands,
    profileName: verifyResult?.profileName,
  };
}

function verifyStepStatus(
  verifyResult: VerifyResult | undefined,
  executeVerify: boolean,
): StepResult["status"] {
  if (!verifyResult) {
    return "failed";
  }

  if (verifyResult.status === "blocked") {
    return "blocked";
  }

  if (verifyResult.status === "fail") {
    return "failed";
  }

  if (executeVerify && verifyResult.mode === "execute" && verifyResult.status === "pass") {
    return "verified";
  }

  return "ran";
}

function deriveRunStatus(input: {
  dryRun: boolean;
  executeVerify: boolean;
  verifyResult?: VerifyResult | undefined;
  blockers: string[];
  steps: RunResult["steps"];
}): RunResult["status"] {
  const allSteps = Object.values(input.steps).filter(Boolean) as StepResult[];

  if (allSteps.some((step) => step.status === "failed")) {
    return "failed";
  }

  if (input.blockers.length > 0 || allSteps.some((step) => step.status === "blocked")) {
    return "blocked";
  }

  if (input.dryRun) {
    return "planned";
  }

  if (
    input.executeVerify &&
    input.verifyResult?.mode === "execute" &&
    input.verifyResult.status === "pass"
  ) {
    return "verified";
  }

  return "ran";
}

async function writeRunResult(runtime: CliRuntime, result: RunResult): Promise<void> {
  await writeCurrentJson(runtime.cwd, "run-result.json", result);
  await writeCurrentMarkdown(runtime.cwd, "run-result.md", renderRunResultMarkdown(result));
}

async function writeRunBundle(runtime: CliRuntime, result: RunResult): Promise<RunBundleManifest> {
  const bundleDir = currentStatePath(runtime.cwd, "run-bundle");
  await mkdir(bundleDir, { recursive: true });

  const copiedFiles = await Promise.all([
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.runResultJson,
      destination: "run-result.json",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.runResultMarkdown,
      destination: "run-result.md",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.operatorReportMarkdown,
      destination: "operator-report.md",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.operatorReportJson,
      destination: "operator-report.json",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.operatorReportHtml,
      destination: "operator-report.html",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.releaseCheckJson,
      destination: "release-check.json",
      required: true,
    }),
    copyCurrentArtifactFile({
      cwd: runtime.cwd,
      bundleDir,
      source: currentArtifactPaths.releaseCheckMarkdown,
      destination: "release-check.md",
      required: true,
    }),
  ]);

  const manifest: RunBundleManifest = {
    schema: "krn-run-bundle-manifest-v1",
    generatedAt: result.generatedAt,
    runStatus: result.status,
    productionProof: false,
    hookTrustStatus: result.proof.hookTrustStatus,
    files: [
      {
        path: "manifest.json",
        source: "generated:krn run --bundle",
        present: true,
        required: true,
      },
      ...copiedFiles,
    ],
    limits: [
      "Local run evidence only.",
      "Only allowlisted .krn/current artifacts are copied.",
      "Raw trace dumps, protected-looking paths, external assets, and giant files are excluded.",
      "The bundle does not claim hook trust or production proof.",
    ],
  };

  await writeFile(path.join(bundleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

function mergeCaptureWarnings(captures: CommandCapture[]): string[] {
  return captures
    .flatMap((capture) => capture.stderr.trim().split("\n"))
    .map((line) => line.trim())
    .filter(Boolean);
}

function statusFromReport(report: OperatorReport | undefined): StepResult["status"] {
  if (!report) {
    return "failed";
  }
  if (report.verdict === "blocked") {
    return "blocked";
  }
  if (report.verdict === "fail") {
    return "failed";
  }
  return "ran";
}

function releaseCheckStepStatus(
  releaseCheck: ReleaseCheckResultFixture | undefined,
): StepResult["status"] {
  if (!releaseCheck) {
    return "failed";
  }
  return releaseCheck.status === "fail" ? "failed" : "ran";
}

async function releaseCheckShouldBlockRun(cwd: string): Promise<boolean> {
  const sourceReleaseCheckPaths = [
    "packages/cli/src/commands/run.ts",
    "docs/specs/run-result.schema.md",
  ];
  const present = await Promise.all(
    sourceReleaseCheckPaths.map((relativePath) => repoPathExists(cwd, relativePath)),
  );

  return present.every(Boolean);
}

export async function runCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const options = parseRunArgs(args);
  if (options.error) {
    runtime.stderr(`${options.error}\n`);
    return 1;
  }

  const captures: CommandCapture[] = [];
  const steps: RunResult["steps"] = {
    start: skipped("not started"),
    graph: skipped("not started"),
    context: skipped("not started"),
    verify: skipped("not started"),
    handoff: skipped("not started"),
    review: skipped("not started"),
    summary: skipped("not started"),
    report: skipped("not started"),
    ...(options.bundle ? { releaseCheck: skipped("not started") } : {}),
  };
  const generatedAt = (runtime.now?.() ?? new Date()).toISOString();
  const releaseCheckBlocks = options.bundle ? await releaseCheckShouldBlockRun(runtime.cwd) : true;

  const startArgs = options.taskSpecPath
    ? ["--task-spec", options.taskSpecPath]
    : [options.taskText ?? ""];
  const start = await runStep(runtime, [".krn/current/task-contract.json"], (stepRuntime) =>
    startCommand(startArgs, stepRuntime),
  );
  steps.start = start.step;
  captures.push(start.capture);

  if (start.step.status === "failed") {
    const result = await buildAndWriteRunResult(runtime, {
      options,
      generatedAt,
      steps,
      captures,
      blockers: [start.step.summary],
      releaseCheckBlocks,
    });
    return finishRun(runtime, result, options);
  }

  const graph = await runStep(runtime, [".krn/graph/repo-graph.json"], graphCommand);
  steps.graph = graph.step;
  captures.push(graph.capture);

  const context = await runStep(runtime, [".krn/current/context-package.json"], contextCommand);
  steps.context = context.step;
  captures.push(context.capture);

  const contextPackage = await readCurrentContextPackage(runtime.cwd);
  if (contextPackage?.stop) {
    const reason = contextPackage.stopReason ?? "context STOP active";
    steps.verify = blocked(reason);
    steps.handoff = blocked(reason);
    steps.review = blocked(reason);
    steps.summary = blocked(reason);
    steps.report = blocked(reason);
    if (options.bundle) {
      steps.releaseCheck = blocked(reason);
    }

    const result = await buildAndWriteRunResult(runtime, {
      options,
      generatedAt,
      steps,
      captures,
      blockers: [reason],
      releaseCheckBlocks,
    });
    if (options.bundle) {
      await writeRunBundle(runtime, result);
    }
    return finishRun(runtime, result, options);
  }

  const verifyArgs = options.executeVerify && !options.dryRun ? ["--execute"] : [];
  const verify = await runStep(runtime, [".krn/current/verify-result.json"], (stepRuntime) =>
    verifyCommand(verifyArgs, stepRuntime),
  );
  steps.verify = verify.step;
  captures.push(verify.capture);

  const verifyResult = await readCurrentVerifyResult(runtime.cwd);
  steps.verify = {
    ...steps.verify,
    status: verifyStepStatus(verifyResult, options.executeVerify && !options.dryRun),
    summary: verifyResult
      ? `KRN verify: ${verifyResult.status} (${verifyResult.mode})`
      : steps.verify.summary,
  };

  const handoff = await runStep(runtime, [".krn/current/handoff.md"], handoffCommand);
  steps.handoff = handoff.step;
  captures.push(handoff.capture);

  const review = await runStep(runtime, [".krn/current/review-summary.json"], (stepRuntime) =>
    reviewCommand(["--write"], stepRuntime),
  );
  steps.review = review.step;
  captures.push(review.capture);

  const summary = await runStep(runtime, [".krn/current/operator-summary.json"], (stepRuntime) =>
    summaryCommand(["--write"], stepRuntime),
  );
  steps.summary = summary.step;
  captures.push(summary.capture);

  const report = await runStep(runtime, [".krn/current/operator-report.json"], (stepRuntime) =>
    reportCommand(options.bundle ? ["--bundle"] : ["--write"], stepRuntime),
  );
  steps.report = report.step;
  captures.push(report.capture);

  const operatorReport = await readRepoJson<OperatorReport>(
    runtime.cwd,
    currentArtifactPaths.operatorReportJson,
  );
  steps.report = {
    ...steps.report,
    status: statusFromReport(operatorReport),
    summary: operatorReport ? `KRN report: ${operatorReport.verdict}` : steps.report.summary,
  };

  if (options.bundle) {
    const releaseCheck = await runStep(
      runtime,
      [".krn/current/release-check.json", ".krn/current/release-check.md"],
      (stepRuntime) => releaseCheckCommand(["--write"], stepRuntime),
    );
    steps.releaseCheck = releaseCheck.step;
    captures.push(releaseCheck.capture);

    const releaseCheckResult = await readRepoJson<ReleaseCheckResultFixture>(
      runtime.cwd,
      currentArtifactPaths.releaseCheckJson,
    );
    const releaseCheckStatus = releaseCheckStepStatus(releaseCheckResult);
    const releaseCheckNonBlockingFailure = !releaseCheckBlocks && releaseCheckStatus === "failed";
    steps.releaseCheck = {
      ...steps.releaseCheck,
      status: releaseCheckNonBlockingFailure ? "ran" : releaseCheckStatus,
      summary: releaseCheckResult
        ? releaseCheckNonBlockingFailure
          ? "KRN release-check: fail (non-blocking target run)"
          : `KRN release-check: ${releaseCheckResult.status}`
        : steps.releaseCheck.summary,
    };
  }

  const result = await buildAndWriteRunResult(runtime, {
    options,
    generatedAt,
    steps,
    captures,
    operatorReport,
    releaseCheckBlocks,
  });

  if (options.bundle) {
    await writeRunBundle(runtime, result);
  }

  return finishRun(runtime, result, options);
}

async function buildAndWriteRunResult(
  runtime: CliRuntime,
  input: {
    options: RunCommandOptions;
    generatedAt: string;
    steps: RunResult["steps"];
    captures: CommandCapture[];
    blockers?: string[] | undefined;
    operatorReport?: OperatorReport | undefined;
    releaseCheckBlocks?: boolean | undefined;
  },
): Promise<RunResult> {
  const [taskContract, contextPackage, verifyResult, operatorReport, releaseCheck] =
    await Promise.all([
      readCurrentTaskContract(runtime.cwd),
      readCurrentContextPackage(runtime.cwd),
      readCurrentVerifyResult(runtime.cwd),
      input.operatorReport ??
        readRepoJson<OperatorReport>(runtime.cwd, currentArtifactPaths.operatorReportJson),
      input.options.bundle
        ? readRepoJson<ReleaseCheckResultFixture>(
            runtime.cwd,
            currentArtifactPaths.releaseCheckJson,
          )
        : undefined,
    ]);
  const explicitBlockers = input.blockers ?? [];
  const verifyBlockers = [
    verifyResult?.status === "blocked" ? (verifyResult.notRunnableReason ?? "verify blocked") : "",
    verifyResult?.status === "fail" ? "verify failed" : "",
    input.options.executeVerify && !input.options.dryRun && verifyResult?.status === "not-runnable"
      ? (verifyResult.notRunnableReason ?? "verify not runnable in execute mode")
      : "",
  ];
  const reportBlockers = operatorReport?.blockers ?? [];
  const releaseCheckBlocks = input.releaseCheckBlocks ?? true;
  const releaseBlockers = releaseCheckBlocks ? (releaseCheck?.blockers ?? []) : [];
  const blockers = unique([
    ...explicitBlockers,
    ...verifyBlockers,
    ...reportBlockers,
    ...releaseBlockers,
  ]);
  const warnings = unique([
    ...mergeCaptureWarnings(input.captures),
    input.options.dryRun && input.options.executeVerify
      ? "KRN run: --dry-run kept verify in record-only mode despite --execute-verify."
      : undefined,
    verifyResult?.status === "not-runnable" && !input.options.executeVerify
      ? (verifyResult.notRunnableReason ?? "verify is not runnable in record-only mode")
      : undefined,
    verifyResult?.status === "warn" ? "verify produced warnings" : undefined,
    ...(operatorReport?.warnings ?? []),
    ...(releaseCheckBlocks ? (releaseCheck?.warnings ?? []) : []),
    !releaseCheckBlocks && releaseCheck?.status === "fail"
      ? "release-check: KRN source release-check is not applicable to downstream target run; included in bundle as non-blocking evidence."
      : undefined,
  ]);
  const nextActions = unique([
    ...(operatorReport?.nextActions ?? []),
    ...(releaseCheckBlocks ? (releaseCheck?.nextActions ?? []) : []),
    blockers.length > 0 ? "Resolve run blockers before claiming completion." : undefined,
    blockers.length === 0 ? "Review run-result and operator-report artifacts." : undefined,
  ]);
  const resultWithoutStatus = {
    schema: "krn-run-result-v1" as const,
    status: "ran" as const,
    generatedAt: input.generatedAt,
    dryRun: input.options.dryRun,
    executeVerify: input.options.executeVerify,
    taskText: taskContract?.task ?? input.options.taskText,
    taskSpecPath: taskContract?.metadata?.taskSpecPath ?? input.options.taskSpecPath ?? undefined,
    steps: input.steps,
    context: summarizeContext(contextPackage),
    verify: summarizeVerify(verifyResult),
    proof: {
      productionProof: false as const,
      hookTrustStatus: operatorReport?.hookTrust.status ?? "unproven",
    },
    blockers,
    warnings,
    nextActions,
    artifacts: runArtifacts(input.options.bundle),
  };
  const result: RunResult = {
    ...resultWithoutStatus,
    status: deriveRunStatus({
      dryRun: input.options.dryRun,
      executeVerify: input.options.executeVerify && !input.options.dryRun,
      verifyResult,
      blockers,
      steps: input.steps,
    }),
  };

  await writeRunResult(runtime, result);
  return result;
}

function finishRun(runtime: CliRuntime, result: RunResult, options: RunCommandOptions): number {
  if (options.json) {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    runtime.stdout(`KRN run: ${result.status}
result: .krn/current/run-result.md
json: .krn/current/run-result.json
verify: ${result.verify.status ?? "missing"} (${result.verify.mode ?? "missing"})
productionProof: false
hookTrust: ${result.proof.hookTrustStatus}
${options.bundle ? "bundle: .krn/current/run-bundle/manifest.json\n" : ""}`);
  }

  return result.status === "failed" || result.status === "blocked" ? 1 : 0;
}
