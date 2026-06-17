import type { ContextPackage } from "../../context/src/index.js";
import type { VerifyResult } from "../../verify/src/index.js";
import { currentArtifactPathsFor, readRepoJson } from "./current-artifacts.js";
import {
  readCurrentContextPackage,
  readCurrentTaskContract,
  readCurrentVerifyResult,
} from "./current-state.js";
import type { OperatorReport } from "./operator-report.js";
import { runArtifacts, writeRunResult } from "./run-artifacts.js";
import type { RunResult, StepResult } from "./run-result.js";
import type { CliRuntime } from "./runtime.js";

export interface CommandCapture {
  stdout: string;
  stderr: string;
}

interface ReleaseCheckResultFixture {
  status?: string | undefined;
  blockers?: string[] | undefined;
  warnings?: string[] | undefined;
  nextActions?: string[] | undefined;
}

interface RunResultOptions {
  taskText?: string | undefined;
  taskSpecPath?: string | undefined;
  dryRun: boolean;
  executeVerify: boolean;
  bundle: boolean;
}

function unique(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
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

function mergeCaptureWarnings(captures: CommandCapture[]): string[] {
  return captures
    .flatMap((capture) => capture.stderr.trim().split("\n"))
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function buildAndWriteRunResult(
  runtime: CliRuntime,
  input: {
    options: RunResultOptions;
    generatedAt: string;
    steps: RunResult["steps"];
    captures: CommandCapture[];
    blockers?: string[] | undefined;
    operatorReport?: OperatorReport | undefined;
    releaseCheckBlocks?: boolean | undefined;
  },
): Promise<RunResult> {
  const artifactPaths = currentArtifactPathsFor(runtime.cwd);
  const [taskContract, contextPackage, verifyResult, operatorReport, releaseCheck] =
    await Promise.all([
      readCurrentTaskContract(runtime.cwd),
      readCurrentContextPackage(runtime.cwd),
      readCurrentVerifyResult(runtime.cwd),
      input.operatorReport ??
        readRepoJson<OperatorReport>(runtime.cwd, artifactPaths.operatorReportJson),
      input.options.bundle
        ? readRepoJson<ReleaseCheckResultFixture>(runtime.cwd, artifactPaths.releaseCheckJson)
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
    artifacts: runArtifacts(runtime.cwd, input.options.bundle),
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
