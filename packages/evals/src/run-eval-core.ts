import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContextPackage, type ContextPackage } from "../../context/src/index.js";
import { buildGraph } from "../../graph/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { defaultTracePath, readTraceLines } from "../../trace/src/index.js";
import { harnessFixtures, loadEvalTaskFixture } from "./fixtures.js";
import { gradeContextCoverage } from "./graders/context-coverage.js";
import { gradeStaleDocLeakage } from "./graders/stale-doc-leakage.js";
import { gradeStopPrecision } from "./graders/stop-precision.js";
import { gradeTraceCompleteness } from "./graders/trace-completeness.js";
import { gradeHookGuardrails } from "./run-eval-hook-validator.js";
import { gradeMemoryGovernance } from "./run-eval-memory-validator.js";
import type { EvalFixtureResult, EvalResult, RunEvalInput } from "./run-eval-types.js";
import {
  gradeDownstreamAcceptance,
  gradeGraphArtifact,
  gradeGraphBehavior,
  gradeVerifyProfiles,
} from "./run-eval-validators.js";

interface TraceReadResult {
  names: string[];
  mode: EvalResult["runTraceMode"];
}

function repoRootFromModule(): string {
  return path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
}

async function readTraceEventNames(tracePath: string): Promise<string[]> {
  try {
    const raw = await readFile(tracePath, "utf8");
    return (await readTraceLines(raw)).map((event) => event.name);
  } catch {
    return [];
  }
}

async function readTrace(cwd: string, explicitTracePath?: string): Promise<TraceReadResult> {
  try {
    const currentRun = JSON.parse(
      await readFile(path.join(cwd, ".krn", "current", "run.json"), "utf8"),
    ) as { tracePath?: string };

    if (typeof currentRun.tracePath === "string") {
      const names = await readTraceEventNames(path.join(cwd, currentRun.tracePath));

      if (names.length > 0) {
        return { names, mode: "run-scoped" };
      }
    }
  } catch {
    // Fall through to global trace.
  }

  const names = await readTraceEventNames(explicitTracePath ?? defaultTracePath(cwd));
  return {
    names,
    mode: names.length > 0 ? "global" : "missing",
  };
}

export async function runEval(input: RunEvalInput = {}): Promise<EvalResult> {
  const cwd = input.cwd ?? process.cwd();
  const fixtureRoot = input.fixtureRoot ?? repoRootFromModule();
  const graph = await buildGraph(fixtureRoot);
  const fixtures: EvalFixtureResult[] = [];
  let frontendWithGraph: ContextPackage | undefined;
  let frontendWithoutGraph: ContextPackage | undefined;
  let frontendExpectedMustRead: string[] | undefined;
  let downstreamWithGraph: ContextPackage | undefined;
  let downstreamWithoutGraph: ContextPackage | undefined;
  let downstreamExpectedMustRead: string[] | undefined;
  let downstreamExpectedDoNotUse: string[] | undefined;

  for (const fixture of harnessFixtures) {
    const taskFixture = await loadEvalTaskFixture(fixture, fixtureRoot);
    const contract = buildTaskContract(taskFixture.task);
    const contextPackage = buildContextPackage(contract, graph);

    if (fixture.name === "frontend-section-context") {
      frontendWithGraph = contextPackage;
      frontendWithoutGraph = buildContextPackage(contract);
      frontendExpectedMustRead = taskFixture.expected.mustRead;
    }

    if (fixture.name === "downstream-basic-package-context") {
      downstreamWithGraph = contextPackage;
      downstreamWithoutGraph = buildContextPackage(contract);
      downstreamExpectedMustRead = taskFixture.expected.mustRead;
      downstreamExpectedDoNotUse = taskFixture.expected.doNotUse;
    }

    const grades = [
      gradeContextCoverage(fixture.name, contextPackage, taskFixture.expected),
      gradeStaleDocLeakage(fixture.name, contextPackage, taskFixture.expected),
      gradeStopPrecision(fixture.name, contextPackage, taskFixture.expected),
    ];

    fixtures.push({
      name: fixture.name,
      task: taskFixture.task,
      status: grades.some((grade) => grade.status === "fail") ? "fail" : "pass",
      grades,
    });
  }

  const traceRead = await readTrace(cwd, input.tracePath);
  const trace = gradeTraceCompleteness(traceRead.names);
  const graphGrade = gradeGraphBehavior({
    graph,
    frontendWithGraph,
    frontendWithoutGraph,
    downstreamWithGraph,
    downstreamWithoutGraph,
    expectedMustRead: frontendExpectedMustRead,
    downstreamExpectedMustRead,
    downstreamExpectedDoNotUse,
  });
  const graphArtifact = await gradeGraphArtifact(cwd);
  const memory = gradeMemoryGovernance();
  const verify = await gradeVerifyProfiles(cwd, fixtureRoot);
  const hooks = await gradeHookGuardrails(fixtureRoot);
  const downstream = await gradeDownstreamAcceptance(fixtureRoot);
  const allGrades = [
    ...fixtures.flatMap((fixture) => fixture.grades),
    graphGrade,
    graphArtifact,
    downstream,
    verify,
    hooks,
    memory,
    trace,
  ];
  const passCount = allGrades.filter((grade) => grade.status === "pass").length;
  const failCount = allGrades.filter((grade) => grade.status === "fail").length;

  return {
    status: failCount > 0 ? "fail" : "pass",
    passCount,
    failCount,
    fixtures,
    graph: graphGrade,
    graphArtifact,
    downstream,
    verify,
    hooks,
    memory,
    trace,
    runTraceMode: traceRead.mode,
  };
}
