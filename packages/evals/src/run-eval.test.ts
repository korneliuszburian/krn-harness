import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildRuntimeLayout, setRuntimeLayout } from "../../core/src/index.js";
import { buildEvalBaselineArtifact, renderEvalResultMarkdown, runEval } from "./run-eval.js";

async function writeTrace(cwd: string, names: string[]): Promise<string> {
  const tracePath = path.join(cwd, ".krn", "traces", "trace.jsonl");
  await mkdir(path.dirname(tracePath), { recursive: true });
  await writeFile(
    tracePath,
    names
      .map((name, index) =>
        JSON.stringify({
          id: `trace-${index}`,
          timestamp: "2026-06-03T00:00:00.000Z",
          name,
        }),
      )
      .join("\n")
      .concat("\n"),
    "utf8",
  );
  return tracePath;
}

async function writeRunTrace(cwd: string, names: string[], runtimeDir = ".krn"): Promise<void> {
  const taskId = "task-run-trace";
  const tracePath = path.join(cwd, runtimeDir, "runs", taskId, "trace.jsonl");
  await mkdir(path.dirname(tracePath), { recursive: true });
  await mkdir(path.join(cwd, runtimeDir, "current"), { recursive: true });
  await writeFile(
    path.join(cwd, runtimeDir, "current", "run.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        taskId,
        runDir: `${runtimeDir}/runs/${taskId}`,
        tracePath: `${runtimeDir}/runs/${taskId}/trace.jsonl`,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
  await writeFile(
    tracePath,
    names
      .map((name, index) =>
        JSON.stringify({
          id: `trace-${index}`,
          timestamp: "2026-06-03T00:00:00.000Z",
          name,
        }),
      )
      .join("\n")
      .concat("\n"),
    "utf8",
  );
}

async function writeGraphArtifact(cwd: string, input: { nodeCount: number; edgeCount: number }) {
  const graphPath = path.join(cwd, ".krn", "graph", "repo-graph.json");
  await mkdir(path.dirname(graphPath), { recursive: true });
  await writeFile(
    graphPath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: "2026-06-03T00:00:00.000Z",
        nodeCount: input.nodeCount,
        edgeCount: input.edgeCount,
        detectors: ["filesystem"],
        relationKindCounts: {},
        nodeKindCounts: {},
        statusCounts: {},
        moduleDependencies: [],
        nodes: [],
        edges: [],
      },
      null,
      2,
    )}\n`,
    "utf8",
  );
}

describe("harness-only eval", () => {
  it("passes deterministic P0 fixture graders when trace is complete", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-eval-"));
    const tracePath = await writeTrace(cwd, [
      "task.started",
      "context.built",
      "verify.ran",
      "handoff.created",
    ]);

    const result = await runEval({ cwd, tracePath });

    expect(result).toMatchObject({
      status: "pass",
      passCount: 26,
      failCount: 0,
      graph: {
        name: "graph-behavior",
        status: "pass",
      },
      graphArtifact: {
        name: "graph-artifact-shape",
        status: "pass",
      },
      downstream: {
        name: "downstream-acceptance",
        status: "pass",
      },
      codexExecEvidence: {
        name: "codex-exec-evidence-pack",
        status: "pass",
      },
      verify: {
        name: "verify-profiles",
        status: "pass",
      },
      hooks: {
        name: "hook-guardrails",
        status: "pass",
      },
      trace: {
        name: "trace-completeness",
        status: "pass",
      },
      memory: {
        name: "memory-governance",
        status: "pass",
      },
      runTraceMode: "global",
    });
    expect(result.fixtures.map((fixture) => fixture.name)).toEqual([
      "frontend-section-context",
      "stale-doc-trap",
      "missing-context-stop",
      "downstream-basic-package-context",
      "product-code-test-dogfood",
      "product-code-tax-dogfood",
    ]);
    expect(result.memory.detail).toContain("broad-term");
    expect(result.memory.detail).toContain("opt-out");
    expect(result.memory.detail).toContain("Polish opt-out");
    expect(result.memory.detail).toContain("Polish explicit-request");
    expect(result.downstream.detail).toContain("downstream-basic fixture");
    expect(result.downstream.detail).toContain("product-code dogfood fixture");
    expect(result.codexExecEvidence.detail).toContain("codex exec fixture evidence pack");
    expect(result.verify.detail).toContain("safe record-only commands");
    expect(result.hooks.detail).toContain("allow, warn, block");
    expect(result.hooks.detail).toContain("false-positive collisions");
    expect(result.hooks.detail).toContain("compact ownership hints");
    expect(result.hooks.detail).toContain("remediation taxonomy");
    expect(result.hooks.detail).toContain("writer-side compact trace payloads");
    expect(result.hooks.detail).toContain("trace payload limits");
    expect(result.hooks.detail).toContain("finding codes");
    expect(result.fixtures.every((fixture) => fixture.status === "pass")).toBe(true);

    const markdown = renderEvalResultMarkdown(result);
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("## Fixture Results");
    expect(markdown).toContain("## Graph Coverage");
    expect(markdown).toContain("## Downstream Acceptance");
    expect(markdown).toContain("## Verify Profiles");
    expect(markdown).toContain("## Codex Exec Evidence");
    expect(markdown).toContain("## Hook Guardrails");
    expect(markdown).toContain("## Memory Governance");
    expect(markdown).toContain("## Trace Coverage");
    expect(markdown).toContain("## Failures");
    expect(markdown).toContain("- none");
    expect(markdown).toContain("## P0 Limits");
  });

  it("reports missing trace events deterministically", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-eval-"));
    const tracePath = await writeTrace(cwd, ["task.started"]);

    const result = await runEval({ cwd, tracePath });

    expect(result.status).toBe("fail");
    expect(result.trace).toEqual({
      name: "trace-completeness",
      status: "fail",
      detail: "Missing trace event(s): context.built, verify.ran, handoff.created",
    });
    expect(result.runTraceMode).toBe("global");
  });

  it("prefers run-scoped trace when a current run exists", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-eval-"));
    await writeRunTrace(cwd, ["task.started", "context.built", "verify.ran", "handoff.created"]);

    const result = await runEval({ cwd });

    expect(result.runTraceMode).toBe("run-scoped");
    expect(result.trace.status).toBe("pass");
  });

  it("reads run-scoped trace from the configured runtime layout", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-eval-"));
    setRuntimeLayout(cwd, buildRuntimeLayout(".krn-harness"));
    await writeRunTrace(
      cwd,
      ["task.started", "context.built", "verify.ran", "handoff.created"],
      ".krn-harness",
    );

    const result = await runEval({ cwd });

    expect(result.runTraceMode).toBe("run-scoped");
    expect(result.trace.status).toBe("pass");
  });

  it("fails generated graph artifacts with mismatched summary counts", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-eval-"));
    await writeTrace(cwd, ["task.started", "context.built", "verify.ran", "handoff.created"]);
    await writeGraphArtifact(cwd, { nodeCount: 1, edgeCount: 0 });

    const result = await runEval({ cwd });

    expect(result.status).toBe("fail");
    expect(result.graphArtifact).toEqual({
      name: "graph-artifact-shape",
      status: "fail",
      detail: ".krn/graph/repo-graph.json count fields do not match arrays",
    });
  });

  it("builds a rolling local baseline comparison without production claims", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-eval-"));
    const tracePath = await writeTrace(cwd, [
      "task.started",
      "context.built",
      "verify.ran",
      "handoff.created",
    ]);
    const passing = await runEval({ cwd, tracePath });
    const previous = buildEvalBaselineArtifact({
      result: passing,
      generatedAt: "2026-06-03T00:00:00.000Z",
    });

    await writeGraphArtifact(cwd, { nodeCount: 1, edgeCount: 0 });
    const regressed = await runEval({ cwd, tracePath });
    const baseline = buildEvalBaselineArtifact({
      result: regressed,
      previous,
      generatedAt: "2026-06-03T00:01:00.000Z",
    });

    expect(baseline).toMatchObject({
      schema: "krn-eval-baseline-v1",
      baselinePath: ".krn/evals/baseline.json",
      currentResultPath: ".krn/current/eval-result.json",
      previous: {
        generatedAt: "2026-06-03T00:00:00.000Z",
        status: "pass",
        failCount: 0,
      },
      comparison: {
        status: "regressed",
        regressions: ["graphArtifact:graph-artifact-shape"],
      },
      limits: {
        productionProof: false,
        codexExecutionProof: false,
        hookTrustProof: false,
        baselineMode: "rolling-local-last-run",
      },
    });
    expect(baseline.current.gradeCount).toBe(previous.current.gradeCount);
  });
});
