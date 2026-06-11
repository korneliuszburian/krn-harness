import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderEvalResultMarkdown, runEval } from "./run-eval.js";

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

async function writeRunTrace(cwd: string, names: string[]): Promise<void> {
  const taskId = "task-run-trace";
  const tracePath = path.join(cwd, ".krn", "runs", taskId, "trace.jsonl");
  await mkdir(path.dirname(tracePath), { recursive: true });
  await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
  await writeFile(
    path.join(cwd, ".krn", "current", "run.json"),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        taskId,
        runDir: `.krn/runs/${taskId}`,
        tracePath: `.krn/runs/${taskId}/trace.jsonl`,
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
      passCount: 14,
      failCount: 0,
      graph: {
        name: "graph-behavior",
        status: "pass",
      },
      graphArtifact: {
        name: "graph-artifact-shape",
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
    ]);
    expect(result.memory.detail).toContain("broad-term");
    expect(result.memory.detail).toContain("opt-out");
    expect(result.memory.detail).toContain("Polish opt-out");
    expect(result.memory.detail).toContain("Polish explicit-request");
    expect(result.hooks.detail).toContain("allow, warn, block");
    expect(result.hooks.detail).toContain("false-positive collisions");
    expect(result.hooks.detail).toContain("compact ownership hints");
    expect(result.hooks.detail).toContain("trace payload limits");
    expect(result.hooks.detail).toContain("finding codes");
    expect(result.fixtures.every((fixture) => fixture.status === "pass")).toBe(true);

    const markdown = renderEvalResultMarkdown(result);
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("## Fixture Results");
    expect(markdown).toContain("## Graph Coverage");
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
});
