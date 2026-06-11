import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContextPackage } from "../../context/src/index.js";
import { buildGraph } from "../../graph/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { defaultTracePath, readTraceLines } from "../../trace/src/index.js";
import { harnessFixtures, loadEvalTaskFixture } from "./fixtures.js";
import { gradeContextCoverage } from "./graders/context-coverage.js";
import { gradeStaleDocLeakage } from "./graders/stale-doc-leakage.js";
import { gradeStopPrecision } from "./graders/stop-precision.js";
import { gradeTraceCompleteness } from "./graders/trace-completeness.js";
import type { EvalGrade } from "./graders/types.js";

export interface EvalFixtureResult {
  name: string;
  task: string;
  status: "pass" | "fail";
  grades: EvalGrade[];
}

export interface EvalResult {
  status: "pass" | "fail";
  passCount: number;
  failCount: number;
  fixtures: EvalFixtureResult[];
  trace: EvalGrade;
}

export interface RunEvalInput {
  cwd?: string;
  fixtureRoot?: string;
  tracePath?: string;
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

export async function runEval(input: RunEvalInput = {}): Promise<EvalResult> {
  const cwd = input.cwd ?? process.cwd();
  const fixtureRoot = input.fixtureRoot ?? repoRootFromModule();
  const graph = await buildGraph(fixtureRoot);
  const fixtures: EvalFixtureResult[] = [];

  for (const fixture of harnessFixtures) {
    const taskFixture = await loadEvalTaskFixture(fixture, fixtureRoot);
    const contract = buildTaskContract(taskFixture.task);
    const contextPackage = buildContextPackage(contract, graph);
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

  const trace = gradeTraceCompleteness(
    await readTraceEventNames(input.tracePath ?? defaultTracePath(cwd)),
  );
  const allGrades = [...fixtures.flatMap((fixture) => fixture.grades), trace];
  const passCount = allGrades.filter((grade) => grade.status === "pass").length;
  const failCount = allGrades.filter((grade) => grade.status === "fail").length;

  return {
    status: failCount > 0 ? "fail" : "pass",
    passCount,
    failCount,
    fixtures,
    trace,
  };
}

export function renderEvalResultMarkdown(result: EvalResult): string {
  const lines = [
    "# KRN Eval Result",
    "",
    `Status: ${result.status}`,
    `Pass count: ${result.passCount}`,
    `Fail count: ${result.failCount}`,
    "",
    "## Fixtures",
    "",
  ];

  for (const fixture of result.fixtures) {
    lines.push(`### ${fixture.name}`, "", `Status: ${fixture.status}`, `Task: ${fixture.task}`, "");
    for (const grade of fixture.grades) {
      lines.push(`- ${grade.name}: ${grade.status} - ${grade.detail}`);
    }
    lines.push("");
  }

  lines.push(
    "## Trace",
    "",
    `- ${result.trace.name}: ${result.trace.status} - ${result.trace.detail}`,
    "",
  );
  return lines.join("\n");
}
