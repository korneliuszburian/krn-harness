import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  generateAgentsAdapter,
  generateHooksTemplate,
  generateRuntimeSkillTemplate,
} from "../../codex-adapter/src/index.js";
import { buildContextPackage, type ContextPackage } from "../../context/src/index.js";
import { buildGraph, type GraphLite } from "../../graph/src/index.js";
import {
  buildHookTracePayload,
  type HookGuardrailMatrix,
  type HookRemediationTaxonomyFixture,
  hookFindingCodes,
  hookOperatorMessageVersion,
  hookProofPathOwnershipHints,
  hookRemediationCodeTaxonomy,
  hookRemediationHintCatalog,
  hookTracePayloadByteLength,
  maxHookRemediationCodes,
  maxHookTracePayloadBytes,
  maxOwnedProofPathHints,
  remediationCodesForFindingCodes,
  runHookGuardrailFixtureCase,
  supportedCodexHookEvents,
} from "../../hooks/src/index.js";
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
  downstream: EvalGrade;
  hooks: EvalGrade;
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

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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
    summary: "Graph selector pending memory must not be active.",
    evidencePath: "docs/specs/memory.schema.md",
    now: new Date("2026-06-03T00:00:00.000Z"),
  });
  const approved = approveMemory(
    createPendingMemory({
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    new Date("2026-06-03T00:01:00.000Z"),
  );
  const explicitApproved = approveMemory(
    createPendingMemory({
      summary: "Prefer short handoff summaries.",
      evidencePath: "docs/specs/handoff.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    new Date("2026-06-03T00:01:00.000Z"),
  );
  const deprecated = deprecateMemory(
    createPendingMemory({
      summary: "Graph selector deprecated memory must not be active.",
      evidencePath: "docs/specs/memory.schema.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    {
      reason: "Superseded by current canon.",
      now: new Date("2026-06-03T00:02:00.000Z"),
    },
  );
  const active = compactMemory([pending, approved, explicitApproved, deprecated]);
  const relevantContext = buildContextPackage(
    buildTaskContract("Harden graph selector behavior"),
    undefined,
    {
      approvedMemory: [pending, approved, deprecated],
    },
  );
  const explicitContext = buildContextPackage(
    buildTaskContract("Use approved memory for this task"),
    undefined,
    {
      approvedMemory: [explicitApproved],
    },
  );
  const unrelatedContext = buildContextPackage(
    buildTaskContract("Update billing docs"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const broadTermContext = buildContextPackage(
    buildTaskContract("Harden graph behavior"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const optOutContext = buildContextPackage(
    buildTaskContract("Harden graph selector behavior without approved memory"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const polishOptOutContext = buildContextPackage(
    buildTaskContract("Harden graph selector behavior bez pamięci"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const polishPriorDecisionOptOutContext = buildContextPackage(
    buildTaskContract("Harden graph selector behavior nie używaj poprzednich decyzji"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const polishExplicitContext = buildContextPackage(
    buildTaskContract("Użyj zatwierdzonej pamięci do tego zadania"),
    undefined,
    {
      approvedMemory: [explicitApproved],
    },
  );
  const relevantMemoryItems = relevantContext.items.filter((item) => item.source === "memory");
  const explicitMemoryItems = explicitContext.items.filter((item) => item.source === "memory");
  const polishExplicitMemoryItems = polishExplicitContext.items.filter(
    (item) => item.source === "memory",
  );
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

  if (unrelatedContext.items.some((item) => item.source === "memory")) {
    failures.push("unrelated approved memory leaked into context");
  }

  if (broadTermContext.items.some((item) => item.source === "memory")) {
    failures.push("broad single-term memory match leaked into context");
  }

  if (optOutContext.items.some((item) => item.source === "memory")) {
    failures.push("explicit memory opt-out leaked memory into context");
  }

  if (polishOptOutContext.items.some((item) => item.source === "memory")) {
    failures.push("Polish memory opt-out leaked memory into context");
  }

  if (polishPriorDecisionOptOutContext.items.some((item) => item.source === "memory")) {
    failures.push("Polish prior-decision opt-out leaked memory into context");
  }

  if (
    relevantMemoryItems.length !== 1 ||
    relevantMemoryItems[0]?.bucket !== "reference-only" ||
    relevantMemoryItems[0]?.selector !== "approved-memory-task-match" ||
    relevantMemoryItems[0]?.memoryId !== approved.id ||
    relevantMemoryItems[0]?.approvedAt !== approved.approvedAt ||
    relevantMemoryItems[0]?.evidencePath !== approved.evidencePath
  ) {
    failures.push("task-relevant approved memory was not gated as reference-only with provenance");
  }

  if (relevantContext.items.some((item) => item.memoryId === pending.id)) {
    failures.push("pending memory leaked into context package");
  }

  if (relevantContext.items.some((item) => item.memoryId === deprecated.id)) {
    failures.push("deprecated memory leaked into context package");
  }

  if (
    explicitMemoryItems.length !== 1 ||
    explicitMemoryItems[0]?.bucket !== "reference-only" ||
    explicitMemoryItems[0]?.selector !== "approved-memory-explicit" ||
    explicitMemoryItems[0]?.memoryId !== explicitApproved.id
  ) {
    failures.push("explicit approved memory request did not surface reference-only memory");
  }

  if (
    polishExplicitMemoryItems.length !== 1 ||
    polishExplicitMemoryItems[0]?.bucket !== "reference-only" ||
    polishExplicitMemoryItems[0]?.selector !== "approved-memory-explicit" ||
    polishExplicitMemoryItems[0]?.memoryId !== explicitApproved.id
  ) {
    failures.push("Polish explicit approved memory request did not surface reference-only memory");
  }

  return {
    name: "memory-governance",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? "Approved memory is gated to reference-only context with provenance; pending, deprecated, unrelated, broad-term, English opt-out, Polish opt-out, and Polish explicit-request behavior are covered"
        : failures.join("; "),
  };
}

async function gradeHookGuardrails(fixtureRoot: string): Promise<EvalGrade> {
  let matrix: HookGuardrailMatrix;
  let remediationTaxonomy: HookRemediationTaxonomyFixture;

  try {
    matrix = JSON.parse(
      await readFile(path.join(fixtureRoot, "fixtures", "hooks", "guardrail-matrix.json"), "utf8"),
    ) as HookGuardrailMatrix;
  } catch {
    return {
      name: "hook-guardrails",
      status: "fail",
      detail: "fixtures/hooks/guardrail-matrix.json is missing or malformed",
    };
  }

  try {
    remediationTaxonomy = JSON.parse(
      await readFile(
        path.join(fixtureRoot, "fixtures", "hooks", "remediation-taxonomy.json"),
        "utf8",
      ),
    ) as HookRemediationTaxonomyFixture;
  } catch {
    return {
      name: "hook-guardrails",
      status: "fail",
      detail: "fixtures/hooks/remediation-taxonomy.json is missing or malformed",
    };
  }

  if (matrix.schemaVersion !== 1 || !Array.isArray(matrix.cases)) {
    return {
      name: "hook-guardrails",
      status: "fail",
      detail: "fixtures/hooks/guardrail-matrix.json has an invalid schema",
    };
  }

  if (
    remediationTaxonomy.schemaVersion !== 1 ||
    !Array.isArray(remediationTaxonomy.codes) ||
    !Array.isArray(remediationTaxonomy.findingMappings)
  ) {
    return {
      name: "hook-guardrails",
      status: "fail",
      detail: "fixtures/hooks/remediation-taxonomy.json has an invalid schema",
    };
  }

  const failures: string[] = [];
  let wordingFixtureCount = 0;
  let remediationFixtureCount = 0;

  if (
    JSON.stringify(remediationTaxonomy.codes.map((item) => item.code)) !==
    JSON.stringify(hookRemediationCodeTaxonomy)
  ) {
    failures.push("hook remediation-code taxonomy fixture is out of order or incomplete");
  }

  for (const item of remediationTaxonomy.codes) {
    const catalogItem = hookRemediationHintCatalog[item.code];

    if (!catalogItem || catalogItem.en !== item.en || catalogItem.pl !== item.pl) {
      failures.push(`${item.code} remediation hint taxonomy regression`);
    }
  }

  for (const mapping of remediationTaxonomy.findingMappings) {
    const actualCodes = remediationCodesForFindingCodes([mapping.findingCode]);

    if (JSON.stringify(actualCodes) !== JSON.stringify(mapping.remediationCodes)) {
      failures.push(`${mapping.findingCode} remediation mapping regression`);
    }
  }

  for (const testCase of matrix.cases) {
    const result = runHookGuardrailFixtureCase(testCase);
    const tracePayload = buildHookTracePayload(result);
    const findingCodes = hookFindingCodes(result);
    const traceFindingCodes = tracePayload.findingCodes;
    const traceRemediationCodes = tracePayload.remediationCodes;

    if (result.status !== testCase.expected.status) {
      failures.push(
        `${testCase.name} expected status ${testCase.expected.status} got ${result.status}`,
      );
    }

    if (result.decision !== testCase.expected.decision) {
      failures.push(
        `${testCase.name} expected decision ${testCase.expected.decision} got ${result.decision}`,
      );
    }

    if (JSON.stringify(findingCodes) !== JSON.stringify(testCase.expected.findingCodes)) {
      failures.push(
        `${testCase.name} expected finding codes ${testCase.expected.findingCodes.join(",")} got ${findingCodes.join(",")}`,
      );
    }

    if (JSON.stringify(traceFindingCodes) !== JSON.stringify(testCase.expected.findingCodes)) {
      failures.push(`${testCase.name} trace finding-code regression`);
    }

    if (
      JSON.stringify(hookProofPathOwnershipHints(result)) !==
      JSON.stringify(testCase.expected.ownedProofPathHints ?? [])
    ) {
      failures.push(`${testCase.name} proof-path ownership hint regression`);
    }

    if (result.ownershipModel !== "task-context-owned-proof-paths-v1") {
      failures.push(`${testCase.name} used an unknown proof-path ownership model`);
    }

    if (result.ownedProofPathHintLimit !== maxOwnedProofPathHints) {
      failures.push(`${testCase.name} used an unexpected proof-path hint limit`);
    }

    if (result.tracePayloadByteLimit !== maxHookTracePayloadBytes) {
      failures.push(`${testCase.name} used an unexpected trace payload byte limit`);
    }

    if (hookTracePayloadByteLength(tracePayload) > maxHookTracePayloadBytes) {
      failures.push(`${testCase.name} emitted an oversized compact trace payload`);
    }

    if ("userFacingMessage" in tracePayload || "remediationHints" in tracePayload) {
      failures.push(`${testCase.name} leaked operator text into compact trace payload`);
    }

    if (result.operatorMessageVersion !== hookOperatorMessageVersion) {
      failures.push(`${testCase.name} used an unexpected operator message version`);
    }

    if (result.remediationCodes.length > maxHookRemediationCodes) {
      failures.push(`${testCase.name} emitted too many remediation codes`);
    }

    if (JSON.stringify(result.remediationCodes) !== JSON.stringify(traceRemediationCodes)) {
      failures.push(`${testCase.name} trace remediation-code regression`);
    }

    if (testCase.expected.remediationCodes !== undefined) {
      remediationFixtureCount += 1;

      if (
        JSON.stringify(result.remediationCodes) !==
        JSON.stringify(testCase.expected.remediationCodes)
      ) {
        failures.push(
          `${testCase.name} expected remediation codes ${testCase.expected.remediationCodes.join(",")} got ${result.remediationCodes.join(",")}`,
        );
      }
    }

    if (testCase.expected.userFacingMessage !== undefined) {
      wordingFixtureCount += 1;

      if (
        result.userFacingMessage.en !== testCase.expected.userFacingMessage.en ||
        result.userFacingMessage.pl !== testCase.expected.userFacingMessage.pl
      ) {
        failures.push(`${testCase.name} operator wording regression`);
      }
    }

    if (result.ownedProofPathHints.length > maxOwnedProofPathHints) {
      failures.push(`${testCase.name} emitted too many compact ownership hints`);
    }

    if (
      JSON.stringify(result.ownedProofPathHints) !==
      JSON.stringify(hookProofPathOwnershipHints(result))
    ) {
      failures.push(`${testCase.name} emitted non-compact ownership hints`);
    }

    if (result.enforced !== false) {
      failures.push(`${testCase.name} claimed enforcement instead of guardrail evidence`);
    }
  }

  if (wordingFixtureCount < 4) {
    failures.push("hook operator wording fixtures are missing or too sparse");
  }

  if (remediationFixtureCount < 4) {
    failures.push("hook remediation-code fixtures are missing or too sparse");
  }

  return {
    name: "hook-guardrails",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? `${matrix.cases.length} hook guardrail fixture(s) cover allow, warn, block, false-positive collisions, compact ownership hints, operator wording, remediation taxonomy, writer-side compact trace payloads, trace payload limits, and finding codes`
        : failures.join("; "),
  };
}

async function gradeDownstreamAcceptance(fixtureRoot: string): Promise<EvalGrade> {
  const fixtureRootPath = path.join(fixtureRoot, "fixtures", "repos", "downstream-basic");
  const requiredFixturePaths = [
    "package.json",
    "README.md",
    "src/index.ts",
    "src/index.test.ts",
    "docs/overview.md",
  ];
  const failures: string[] = [];

  for (const relativePath of requiredFixturePaths) {
    if (!(await pathExists(path.join(fixtureRootPath, relativePath)))) {
      failures.push(`missing fixtures/repos/downstream-basic/${relativePath}`);
    }
  }

  const agents = generateAgentsAdapter();
  const runtimeSkill = generateRuntimeSkillTemplate();
  let hooks: { hooks?: Record<string, Array<{ hooks?: Array<{ command?: string }> }>> };

  try {
    hooks = JSON.parse(generateHooksTemplate()) as typeof hooks;
  } catch {
    hooks = {};
    failures.push("generated hooks template is not valid JSON");
  }

  if (
    !agents.includes("KRN Harness") ||
    !agents.includes("krn start") ||
    !agents.includes("STOP")
  ) {
    failures.push("generated AGENTS adapter is missing the KRN workflow");
  }

  if (agents.includes("Architecture Spec") || agents.length > 2200) {
    failures.push("generated AGENTS adapter is too broad for downstream active context");
  }

  for (const command of ["krn status", "krn start", "krn context", "krn verify", "krn handoff"]) {
    if (!runtimeSkill.includes(command)) {
      failures.push(`runtime skill is missing ${command}`);
    }
  }

  if (runtimeSkill.includes("Architecture Spec") || runtimeSkill.length > 1600) {
    failures.push("runtime skill template is too broad for downstream active context");
  }

  for (const event of supportedCodexHookEvents) {
    const command = hooks.hooks?.[event]?.[0]?.hooks?.[0]?.command;

    if (command !== `krn hook codex ${event}`) {
      failures.push(`generated hooks template is missing ${event}`);
    }
  }

  return {
    name: "downstream-acceptance",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? "downstream-basic fixture and generated AGENTS/hooks/runtime skill templates satisfy P0 onboarding acceptance"
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
  const hooks = await gradeHookGuardrails(fixtureRoot);
  const downstream = await gradeDownstreamAcceptance(fixtureRoot);
  const allGrades = [
    ...fixtures.flatMap((fixture) => fixture.grades),
    graphGrade,
    graphArtifact,
    downstream,
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
    hooks,
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
    ...[
      result.graph,
      result.graphArtifact,
      result.downstream,
      result.hooks,
      result.memory,
      result.trace,
    ]
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
    "## Downstream Acceptance",
    "",
    `- ${result.downstream.name}: ${result.downstream.status} - ${result.downstream.detail}`,
    "",
    "## Hook Guardrails",
    "",
    `- ${result.hooks.name}: ${result.hooks.status} - ${result.hooks.detail}`,
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
