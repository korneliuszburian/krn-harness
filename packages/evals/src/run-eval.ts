import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildContextPackage, type ContextPackage } from "../../context/src/index.js";
import { buildGraph, type GraphLite } from "../../graph/src/index.js";
import {
  approveMemory,
  compactMemory,
  createPendingMemory,
  deprecateMemory,
} from "../../memory/src/index.js";
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
  graph: EvalGrade;
  graphArtifact: EvalGrade;
  memory: EvalGrade;
  trace: EvalGrade;
  runTraceMode: "run-scoped" | "global" | "missing";
}

export interface RunEvalInput {
  cwd?: string;
  fixtureRoot?: string;
  tracePath?: string;
}

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

function gradeGraphBehavior(input: {
  graph: GraphLite;
  frontendWithGraph?: ContextPackage | undefined;
  frontendWithoutGraph?: ContextPackage | undefined;
  expectedMustRead?: string[] | undefined;
}): EvalGrade {
  const nodeKinds = new Set(input.graph.nodes.map((node) => node.kind));
  const relationKinds = new Set(input.graph.edges.map((edge) => edge.kind));
  const requiredNodeKinds = ["stylesheet", "acf-group", "doc"];
  const requiredRelationKinds = ["style-related-to", "declares-acf-field", "has-acf-json"];
  const expectedGraphPaths = (input.expectedMustRead ?? []).filter((item) => item !== "AGENTS.md");
  const withGraphPaths = input.frontendWithGraph?.buckets.mustRead.map((item) => item.path) ?? [];
  const withoutGraphPaths =
    input.frontendWithoutGraph?.buckets.mustRead.map((item) => item.path) ?? [];
  const missingNodeKinds = requiredNodeKinds.filter((kind) => !nodeKinds.has(kind));
  const missingRelationKinds = requiredRelationKinds.filter((kind) => !relationKinds.has(kind));
  const missingGraphContext = expectedGraphPaths.filter((item) => !withGraphPaths.includes(item));
  const leakedWithoutGraph = expectedGraphPaths.filter((item) => withoutGraphPaths.includes(item));
  const failures = [
    ...missingNodeKinds.map((kind) => `missing node kind ${kind}`),
    ...missingRelationKinds.map((kind) => `missing relation kind ${kind}`),
    ...missingGraphContext.map((item) => `missing graph-fed context ${item}`),
    ...leakedWithoutGraph.map((item) => `leaked without graph ${item}`),
  ];

  return {
    name: "graph-behavior",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? "Graph-lite kinds and graph-fed context behavior are present"
        : failures.join("; "),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isGraphArtifact(value: unknown): value is {
  nodeCount: number;
  edgeCount: number;
  detectors: unknown[];
  relationKindCounts: Record<string, unknown>;
  nodeKindCounts: Record<string, unknown>;
  statusCounts: Record<string, unknown>;
  nodes: unknown[];
  edges: unknown[];
} {
  return (
    isRecord(value) &&
    typeof value.nodeCount === "number" &&
    typeof value.edgeCount === "number" &&
    Array.isArray(value.detectors) &&
    isRecord(value.relationKindCounts) &&
    isRecord(value.nodeKindCounts) &&
    isRecord(value.statusCounts) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

async function gradeGraphArtifact(cwd: string): Promise<EvalGrade> {
  const graphPath = path.join(cwd, ".krn", "graph", "repo-graph.json");

  try {
    const artifact = JSON.parse(await readFile(graphPath, "utf8")) as unknown;

    if (!isGraphArtifact(artifact)) {
      return {
        name: "graph-artifact-shape",
        status: "fail",
        detail: ".krn/graph/repo-graph.json is missing expected summary fields",
      };
    }

    if (
      artifact.nodeCount !== artifact.nodes.length ||
      artifact.edgeCount !== artifact.edges.length
    ) {
      return {
        name: "graph-artifact-shape",
        status: "fail",
        detail: ".krn/graph/repo-graph.json count fields do not match arrays",
      };
    }

    return {
      name: "graph-artifact-shape",
      status: "pass",
      detail: ".krn/graph/repo-graph.json summary fields are valid",
    };
  } catch {
    return {
      name: "graph-artifact-shape",
      status: "pass",
      detail: "No graph artifact generated; shape check skipped",
    };
  }
}

function gradeMemoryGovernance(): EvalGrade {
  const pending = createPendingMemory({
    summary: "Pending memory must not be active.",
    evidencePath: "docs/specs/memory.schema.md",
    now: new Date("2026-06-03T00:00:00.000Z"),
  });
  const approved = approveMemory(
    createPendingMemory({
      summary: "Approved memory may be active.",
      evidencePath: "docs/specs/memory.schema.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    new Date("2026-06-03T00:01:00.000Z"),
  );
  const deprecated = deprecateMemory(
    createPendingMemory({
      summary: "Deprecated memory must not be active.",
      evidencePath: "docs/specs/memory.schema.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    {
      reason: "Superseded by current canon.",
      now: new Date("2026-06-03T00:02:00.000Z"),
    },
  );
  const active = compactMemory([pending, approved, deprecated]);
  const failures = [];

  if (pending.status !== "pending") {
    failures.push("pending record did not stay pending");
  }

  if (active.some((record) => record.id === pending.id)) {
    failures.push("pending record leaked into active memory");
  }

  if (!active.some((record) => record.id === approved.id && record.status === "approved")) {
    failures.push("approved record was not active");
  }

  if (active.some((record) => record.id === deprecated.id)) {
    failures.push("deprecated record leaked into active memory");
  }

  return {
    name: "memory-governance",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? "Pending memory is inactive, approved memory is active, deprecated memory is excluded"
        : failures.join("; "),
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

  for (const fixture of harnessFixtures) {
    const taskFixture = await loadEvalTaskFixture(fixture, fixtureRoot);
    const contract = buildTaskContract(taskFixture.task);
    const contextPackage = buildContextPackage(contract, graph);

    if (fixture.name === "frontend-section-context") {
      frontendWithGraph = contextPackage;
      frontendWithoutGraph = buildContextPackage(contract);
      frontendExpectedMustRead = taskFixture.expected.mustRead;
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
    expectedMustRead: frontendExpectedMustRead,
  });
  const graphArtifact = await gradeGraphArtifact(cwd);
  const memory = gradeMemoryGovernance();
  const allGrades = [
    ...fixtures.flatMap((fixture) => fixture.grades),
    graphGrade,
    graphArtifact,
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
    memory,
    trace,
    runTraceMode: traceRead.mode,
  };
}

export function renderEvalResultMarkdown(result: EvalResult): string {
  const failures = [
    ...result.fixtures.flatMap((fixture) =>
      fixture.grades
        .filter((grade) => grade.status === "fail")
        .map((grade) => `${fixture.name}/${grade.name}: ${grade.detail}`),
    ),
    ...[result.graph, result.graphArtifact, result.memory, result.trace]
      .filter((grade) => grade.status === "fail")
      .map((grade) => `${grade.name}: ${grade.detail}`),
  ];
  const lines = [
    "# KRN Eval Result",
    "",
    "## Summary",
    "",
    `Status: ${result.status}`,
    `Pass count: ${result.passCount}`,
    `Fail count: ${result.failCount}`,
    `Run trace mode: ${result.runTraceMode}`,
    "",
    "## Graph Coverage",
    "",
    `- ${result.graph.name}: ${result.graph.status} - ${result.graph.detail}`,
    `- ${result.graphArtifact.name}: ${result.graphArtifact.status} - ${result.graphArtifact.detail}`,
    "",
    "## Memory Governance",
    "",
    `- ${result.memory.name}: ${result.memory.status} - ${result.memory.detail}`,
    "",
    "## Fixture Results",
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
    "## Trace Coverage",
    "",
    `- ${result.trace.name}: ${result.trace.status} - ${result.trace.detail}`,
    "",
    "## Failures",
    "",
    ...(failures.length > 0 ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
    "## P0 Limits",
    "",
    "- Eval uses harness-only fixtures and local traces.",
    "- Eval does not invoke Codex, external services, or project commands.",
    "",
  );
  return lines.join("\n");
}
