import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderDoctorResultMarkdown, runDoctor } from "./doctor.js";

async function tempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "krn-doctor-"));
}

describe("doctor result", () => {
  it("reports deterministic warnings for missing current-state artifacts", async () => {
    const cwd = await tempRepo();
    const result = await runDoctor(cwd);

    expect(result.status).toBe("warn");
    expect(result.checks.map((check) => check.name)).toEqual([
      "config",
      "current-task-contract",
      "current-run",
      "current-context-package",
      "context-stop",
      "current-verify-result",
      "current-handoff",
      "graph-json",
      "graph-markdown",
      "graph-json-shape",
      "graph-summary",
      "downstream-agents",
      "downstream-runtime-skill",
      "downstream-hooks-template",
      "adapter-templates",
      "build-time-skills",
      "run-trace",
      "global-trace",
    ]);
    expect(result.checks).toContainEqual({
      name: "config",
      status: "warn",
      detail: "krn.config.json is missing; default config is active",
    });
    expect(result.nextActions).toEqual([
      "Run `krn graph` to generate graph artifacts.",
      "Run `krn context` to generate the current context package.",
      "Run `krn verify` to record P0 verification state.",
      "Run `krn handoff` to generate the current handoff.",
    ]);
    expect(renderDoctorResultMarkdown(result)).toContain("## Next Actions");
  });

  it("reports invalid config as a failure without throwing", async () => {
    const cwd = await tempRepo();
    await writeFile(path.join(cwd, "krn.config.json"), '{"version":2}\n', "utf8");

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "config",
      status: "fail",
      detail: "krn.config.json is invalid: version must be 1",
    });
  });

  it("reports valid graph artifacts", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "graph"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "graph", "repo-graph.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: "2026-06-03T00:00:00.000Z",
          nodeCount: 0,
          edgeCount: 0,
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
    await writeFile(
      path.join(cwd, ".krn", "graph", "repo-graph.md"),
      "# Graph-Lite Repository Graph\n",
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "graph-json",
      status: "pass",
      detail: ".krn/graph/repo-graph.json is present",
    });
    expect(result.checks).toContainEqual({
      name: "graph-markdown",
      status: "pass",
      detail: ".krn/graph/repo-graph.md is present",
    });
    expect(result.checks).toContainEqual({
      name: "graph-json-shape",
      status: "pass",
      detail: ".krn/graph/repo-graph.json has 0 node(s) and 0 edge(s)",
    });
    expect(result.checks).toContainEqual({
      name: "graph-summary",
      status: "pass",
      detail: "1 detector(s), 0 relation kind(s)",
    });
  });

  it("reports malformed graph JSON as a failure", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "graph"), { recursive: true });
    await writeFile(path.join(cwd, ".krn", "graph", "repo-graph.json"), "not json\n", "utf8");

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "graph-json-shape",
      status: "fail",
      detail: ".krn/graph/repo-graph.json is malformed",
    });
  });

  it("reports a valid current run pointer", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(path.join(cwd, ".krn", "current", "task-contract.json"), '{"id":"task-1"}\n');
    await writeFile(
      path.join(cwd, ".krn", "current", "run.json"),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          taskId: "task-1",
          runDir: ".krn/runs/task-1",
          tracePath: ".krn/runs/task-1/trace.jsonl",
          runMetadataPath: ".krn/runs/task-1/run.json",
          taskContractPath: ".krn/current/task-contract.json",
          contextPackagePath: ".krn/current/context-package.json",
          graphArtifactPath: ".krn/graph/repo-graph.json",
          verifyResultPath: ".krn/current/verify-result.json",
          handoffPath: ".krn/current/handoff.md",
          doctorResultPath: ".krn/current/doctor-result.json",
          evalResultPath: ".krn/current/eval-result.json",
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "current-run",
      status: "pass",
      detail: ".krn/current/run.json points to .krn/runs/task-1",
    });
  });

  it("reports malformed current run pointers as failures", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(path.join(cwd, ".krn", "current", "run.json"), '{"schemaVersion":1}\n');

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "current-run",
      status: "fail",
      detail: ".krn/current/run.json is incomplete",
    });
  });
});
