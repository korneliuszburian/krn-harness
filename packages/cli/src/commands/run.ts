import type { VerifyResult } from "../../../verify/src/index.js";
import { currentArtifactPaths, readRepoJson, repoPathExists } from "../current-artifacts.js";
import { readCurrentContextPackage, readCurrentVerifyResult } from "../current-state.js";
import type { OperatorReport } from "../operator-report.js";
import { writeRunBundle } from "../run-artifacts.js";
import type { RunResult, StepResult } from "../run-result.js";
import { buildAndWriteRunResult, type CommandCapture } from "../run-result-builder.js";
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

interface ReleaseCheckResultFixture {
  status?: string | undefined;
  blockers?: string[] | undefined;
  warnings?: string[] | undefined;
  nextActions?: string[] | undefined;
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
