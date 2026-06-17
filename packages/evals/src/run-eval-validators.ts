import { readFile } from "node:fs/promises";
import path from "node:path";
import {
  generateAgentsAdapter,
  generateHooksTemplate,
  generateRuntimeSkillTemplate,
  validateAgentsAdapter,
} from "../../codex-adapter/src/index.js";
import type { ContextPackage } from "../../context/src/index.js";
import { pathExists } from "../../core/src/index.js";
import type { GraphLite } from "../../graph/src/index.js";
import { supportedCodexHookEvents } from "../../hooks/src/index.js";
import {
  buildVerifyResult,
  resolveVerifyProfile,
  runVerifyCommands,
} from "../../verify/src/index.js";
import type { EvalGrade } from "./graders/types.js";

export function gradeGraphBehavior(input: {
  graph: GraphLite;
  frontendWithGraph?: ContextPackage | undefined;
  frontendWithoutGraph?: ContextPackage | undefined;
  downstreamWithGraph?: ContextPackage | undefined;
  downstreamWithoutGraph?: ContextPackage | undefined;
  expectedMustRead?: string[] | undefined;
  downstreamExpectedMustRead?: string[] | undefined;
  downstreamExpectedDoNotUse?: string[] | undefined;
}): EvalGrade {
  const nodeKinds = new Set(input.graph.nodes.map((node) => node.kind));
  const relationKinds = new Set(input.graph.edges.map((edge) => edge.kind));
  const requiredNodeKinds = [
    "stylesheet",
    "acf-group",
    "doc",
    "module-file",
    "package",
    "source-file",
    "test-file",
  ];
  const requiredRelationKinds = [
    "style-related-to",
    "declares-acf-field",
    "has-acf-json",
    "imports-file",
    "owns-source",
    "owns-test",
    "owns-doc",
    "owns-config",
    "tests-source",
  ];
  const expectedGraphPaths = (input.expectedMustRead ?? []).filter((item) => item !== "AGENTS.md");
  const withGraphPaths = input.frontendWithGraph?.buckets.mustRead.map((item) => item.path) ?? [];
  const withoutGraphPaths =
    input.frontendWithoutGraph?.buckets.mustRead.map((item) => item.path) ?? [];
  const downstreamExpectedPaths = (input.downstreamExpectedMustRead ?? []).filter(
    (item) => item !== "AGENTS.md",
  );
  const downstreamWithGraphPaths =
    input.downstreamWithGraph?.buckets.mustRead.map((item) => item.path) ?? [];
  const downstreamWithoutGraphPaths =
    input.downstreamWithoutGraph?.buckets.mustRead.map((item) => item.path) ?? [];
  const downstreamDoNotUsePaths =
    input.downstreamWithGraph?.buckets.doNotUse.map((item) => item.path) ?? [];
  const missingNodeKinds = requiredNodeKinds.filter((kind) => !nodeKinds.has(kind));
  const missingRelationKinds = requiredRelationKinds.filter((kind) => !relationKinds.has(kind));
  const missingGraphContext = expectedGraphPaths.filter((item) => !withGraphPaths.includes(item));
  const leakedWithoutGraph = expectedGraphPaths.filter((item) => withoutGraphPaths.includes(item));
  const missingDownstreamGraphContext = downstreamExpectedPaths.filter(
    (item) => !downstreamWithGraphPaths.includes(item),
  );
  const leakedDownstreamWithoutGraph = downstreamExpectedPaths.filter((item) =>
    downstreamWithoutGraphPaths.includes(item),
  );
  const missingDownstreamDoNotUse = (input.downstreamExpectedDoNotUse ?? []).filter(
    (item) => !downstreamDoNotUsePaths.includes(item),
  );
  const failures = [
    ...missingNodeKinds.map((kind) => `missing node kind ${kind}`),
    ...missingRelationKinds.map((kind) => `missing relation kind ${kind}`),
    ...missingGraphContext.map((item) => `missing graph-fed context ${item}`),
    ...leakedWithoutGraph.map((item) => `leaked without graph ${item}`),
    ...missingDownstreamGraphContext.map((item) => `missing downstream graph context ${item}`),
    ...leakedDownstreamWithoutGraph.map((item) => `leaked downstream without graph ${item}`),
    ...missingDownstreamDoNotUse.map((item) => `missing downstream do-not-use ${item}`),
  ];

  return {
    name: "graph-behavior",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? "Graph-lite kinds, package relations, and graph-fed context behavior are present"
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
  moduleDependencies: unknown[];
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
    Array.isArray(value.moduleDependencies) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

export async function gradeGraphArtifact(cwd: string): Promise<EvalGrade> {
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

export async function gradeDownstreamAcceptance(fixtureRoot: string): Promise<EvalGrade> {
  const fixtureRootPath = path.join(fixtureRoot, "fixtures", "repos", "downstream-basic");
  const productFixtureRootPath = path.join(
    fixtureRoot,
    "fixtures",
    "repos",
    "product-code-dogfood",
  );
  const requiredFixturePaths = [
    "krn.config.json",
    "package.json",
    "README.md",
    "src/index.ts",
    "src/index.test.ts",
    "docs/overview.md",
    "docs/stale.md",
  ];
  const requiredProductFixturePaths = [
    "krn.config.json",
    "package.json",
    "README.md",
    "src/index.ts",
    "src/index.test.ts",
    "src/regional-tax.ts",
    "src/regional-tax.test.ts",
    "docs/current-pricing.md",
    "docs/stale-pricing.md",
    "docs/current-tax.md",
    "docs/stale-tax.md",
  ];
  const failures: string[] = [];

  for (const relativePath of requiredFixturePaths) {
    if (!(await pathExists(path.join(fixtureRootPath, relativePath)))) {
      failures.push(`missing fixtures/repos/downstream-basic/${relativePath}`);
    }
  }

  for (const relativePath of requiredProductFixturePaths) {
    if (!(await pathExists(path.join(productFixtureRootPath, relativePath)))) {
      failures.push(`missing fixtures/repos/product-code-dogfood/${relativePath}`);
    }
  }

  try {
    const readme = await readFile(path.join(fixtureRootPath, "README.md"), "utf8");
    for (const expected of [
      "krn verify --execute",
      ".krn/current/verify-result.json",
      ".krn/runs/<task_id>/trace.jsonl",
      "does not launch Codex",
    ]) {
      if (!readme.includes(expected)) {
        failures.push(`downstream-basic README is missing ${expected}`);
      }
    }
  } catch {
    failures.push("downstream-basic README could not be read");
  }

  try {
    const readme = await readFile(path.join(productFixtureRootPath, "README.md"), "utf8");
    for (const expected of [
      "src/index.ts",
      "src/index.test.ts",
      "src/regional-tax.ts",
      "src/regional-tax.test.ts",
      "docs/stale-pricing.md",
      "docs/stale-tax.md",
      "node src/index.test.ts",
      "node src/regional-tax.test.ts",
      "No Codex, CI, network",
    ]) {
      if (!readme.includes(expected)) {
        failures.push(`product-code-dogfood README is missing ${expected}`);
      }
    }
  } catch {
    failures.push("product-code-dogfood README could not be read");
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

  const agentsQuality = validateAgentsAdapter(agents);
  if (agentsQuality.status === "fail") {
    failures.push(`generated AGENTS adapter quality failed: ${agentsQuality.missing.join(", ")}`);
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

  if (!runtimeSkill.includes("references/workflow.md")) {
    failures.push("runtime skill template does not point to its workflow reference");
  }

  for (const event of supportedCodexHookEvents) {
    const command = hooks.hooks?.[event]?.[0]?.hooks?.[0]?.command;

    if (command !== `./.krn/bin/krn hook codex ${event}`) {
      failures.push(`generated hooks template is missing ${event}`);
    }
  }

  return {
    name: "downstream-acceptance",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? "downstream-basic fixture, product-code dogfood fixture, and generated AGENTS/hooks/runtime skill templates satisfy local onboarding acceptance"
        : failures.join("; "),
  };
}

export async function gradeVerifyProfiles(cwd: string, fixtureRoot: string): Promise<EvalGrade> {
  const failures: string[] = [];
  const safeProfile = resolveVerifyProfile({
    commands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
    timeoutMs: 30000,
    maxOutputBytes: 4096,
  }).profile;
  const unsafeProfile = resolveVerifyProfile({
    commands: ["pnpm test && rm -rf .krn"],
  }).profile;
  const executeProfile = resolveVerifyProfile({
    commands: [{ command: "node", args: ["fixtures/verify/pass.cjs"] }],
    mode: "execute",
  }).profile;
  const safeResult = buildVerifyResult({ profile: safeProfile });
  const unsafeResult = buildVerifyResult({ profile: unsafeProfile });
  const executeCommandResults = await runVerifyCommands(executeProfile, {
    cwd: fixtureRoot,
    limits: executeProfile.limits,
    nowMs: () => 0,
  });
  const executeResult = buildVerifyResult({
    profile: executeProfile,
    commandResults: executeCommandResults,
  });

  if (
    safeResult.status !== "warn" ||
    safeResult.summary.allowedCommands !== 3 ||
    safeResult.summary.executedCommands !== 0 ||
    safeResult.limits.timeoutMs !== 30000 ||
    safeResult.limits.maxOutputBytes !== 4096
  ) {
    failures.push("safe record-only verify profile did not produce compact non-executing evidence");
  }

  if (unsafeResult.status !== "blocked" || unsafeResult.summary.blockedCommands !== 1) {
    failures.push("unsafe verify profile was not blocked before execution");
  }

  if (
    executeResult.status !== "pass" ||
    executeResult.summary.executedCommands !== 1 ||
    executeResult.commands[0]?.status !== "passed" ||
    executeResult.commands[0]?.stdoutTail !== "verify fixture pass\n"
  ) {
    failures.push("execute mode did not run the deterministic node fixture successfully");
  }

  try {
    const artifact = JSON.parse(
      await readFile(path.join(cwd, ".krn", "current", "verify-result.json"), "utf8"),
    ) as {
      schemaVersion?: unknown;
      profileName?: unknown;
      mode?: unknown;
      summary?: {
        totalCommands?: unknown;
        allowedCommands?: unknown;
        blockedCommands?: unknown;
        executedCommands?: unknown;
      };
      limits?: { timeoutMs?: unknown; maxOutputBytes?: unknown };
      commands?: unknown;
    };

    if (
      artifact.schemaVersion !== 1 ||
      typeof artifact.profileName !== "string" ||
      (artifact.mode !== "record-only" && artifact.mode !== "execute") ||
      typeof artifact.summary?.totalCommands !== "number" ||
      typeof artifact.summary?.allowedCommands !== "number" ||
      typeof artifact.summary?.blockedCommands !== "number" ||
      typeof artifact.summary?.executedCommands !== "number" ||
      typeof artifact.limits?.timeoutMs !== "number" ||
      typeof artifact.limits?.maxOutputBytes !== "number" ||
      !Array.isArray(artifact.commands)
    ) {
      failures.push(".krn/current/verify-result.json is missing verify profile schema fields");
    }
  } catch {
    // Current verify artifact is optional for harness-only eval.
  }

  return {
    name: "verify-profiles",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? "verify profiles cover safe record-only commands, unsafe command blocking, output limits, and deterministic execute behavior"
        : failures.join("; "),
  };
}
