import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { approveMemoryById, deprecateMemoryById, proposeMemory } from "../../memory/src/index.js";
import { renderDoctorResultMarkdown, runDoctor } from "./doctor.js";

async function tempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "krn-doctor-"));
}

async function writeGlobalTrace(cwd: string, events: unknown[]): Promise<void> {
  await mkdir(path.join(cwd, ".krn", "traces"), { recursive: true });
  await writeFile(
    path.join(cwd, ".krn", "traces", "trace.jsonl"),
    events
      .map((event) => JSON.stringify(event))
      .join("\n")
      .concat("\n"),
    "utf8",
  );
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
      "memory-stores",
      "memory-context-gate",
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
      "hook-guardrail-trace",
      "global-trace",
    ]);
    expect(result.checks).toContainEqual({
      name: "config",
      status: "warn",
      detail: "krn.config.json is missing; default config is active",
    });
    expect(result.checks).toContainEqual({
      name: "memory-stores",
      status: "warn",
      detail: ".krn/memory stores are missing; governed memory has not been used",
    });
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "pass",
      detail: "No current context package; memory context gate skipped",
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

  it("reports valid governed memory stores", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Memory stays pending until approval.",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    await approveMemoryById(cwd, created.record?.id ?? "", new Date("2026-06-03T00:01:00.000Z"));
    await deprecateMemoryById(cwd, created.record?.id ?? "", {
      reason: "Superseded by current spec.",
      now: new Date("2026-06-03T00:02:00.000Z"),
    });

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "memory-stores",
      status: "pass",
      detail: "Memory stores: pending 0, approved 0, deprecated 1",
    });
  });

  it("reports malformed governed memory stores as failures", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "memory"), { recursive: true });
    await writeFile(path.join(cwd, ".krn", "memory", "pending.json"), "not json\n", "utf8");

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-stores",
      status: "fail",
      detail: ".krn/memory/pending.json is malformed",
    });
  });

  it("passes approved memory context only when reference-only with provenance", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/approved.json#${approved.record?.id}`,
              reason: "Approved governed memory reference: Graph selector should remain generic.",
              priority: 33,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              matchedTerms: ["graph", "selector"],
              memoryId: approved.record?.id,
              memorySummary: "Graph selector should remain generic.",
              approvedAt: "2026-06-03T00:01:00.000Z",
              evidencePath: "docs/specs/graph-lite.md",
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [
              {
                path: `.krn/memory/approved.json#${approved.record?.id}`,
                reason: "Approved governed memory reference: Graph selector should remain generic.",
                priority: 33,
                bucket: "reference-only",
                status: "available",
                source: "memory",
                selector: "approved-memory-task-match",
                matchedTerms: ["graph", "selector"],
                memoryId: approved.record?.id,
                memorySummary: "Graph selector should remain generic.",
                approvedAt: "2026-06-03T00:01:00.000Z",
                evidencePath: "docs/specs/graph-lite.md",
              },
            ],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "pass",
      detail: "1 approved memory reference(s) are reference-only with provenance",
    });
  });

  it("fails broad single-term memory task matches in current context", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/approved.json#${approved.record?.id}`,
              reason: "Approved governed memory reference: Graph selector should remain generic.",
              priority: 33,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              matchedTerms: ["graph"],
              memoryId: approved.record?.id,
              memorySummary: "Graph selector should remain generic.",
              approvedAt: "2026-06-03T00:01:00.000Z",
              evidencePath: "docs/specs/graph-lite.md",
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "fail",
      detail: `Memory ${approved.record?.id} task match is too broad`,
    });
  });

  it("fails surfaced memory when the current task explicitly opts out", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      '{"task":"Harden graph selector behavior without approved memory"}\n',
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/approved.json#${approved.record?.id}`,
              reason: "Approved governed memory reference: Graph selector should remain generic.",
              priority: 33,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              matchedTerms: ["graph", "selector"],
              memoryId: approved.record?.id,
              memorySummary: "Graph selector should remain generic.",
              approvedAt: "2026-06-03T00:01:00.000Z",
              evidencePath: "docs/specs/graph-lite.md",
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "fail",
      detail: `Current task explicitly opts out of memory but ${approved.record?.id} is surfaced`,
    });
  });

  it("fails surfaced memory when the current task uses Polish memory opt-out", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      '{"task":"Harden graph selector behavior bez pamięci"}\n',
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/approved.json#${approved.record?.id}`,
              reason: "Approved governed memory reference: Graph selector should remain generic.",
              priority: 33,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              matchedTerms: ["graph", "selector"],
              memoryId: approved.record?.id,
              memorySummary: "Graph selector should remain generic.",
              approvedAt: "2026-06-03T00:01:00.000Z",
              evidencePath: "docs/specs/graph-lite.md",
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "fail",
      detail: `Current task explicitly opts out of memory but ${approved.record?.id} is surfaced`,
    });
  });

  it("fails pending memory leakage in current context", async () => {
    const cwd = await tempRepo();
    const pending = await proposeMemory(cwd, {
      summary: "Pending memory should not be active.",
      evidencePath: "docs/specs/memory.schema.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/pending.json#${pending.record?.id}`,
              reason: "Pending memory leaked",
              priority: 99,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              memoryId: pending.record?.id,
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "fail",
      detail: `Pending memory ${pending.record?.id} leaked into context`,
    });
  });

  it("passes hook guardrail trace events with decision and finding codes", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-allow",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "SessionStart",
          supported: true,
          status: "ok",
          decision: "allow",
          enforced: false,
          payloadSource: "placeholder",
          detail: "P0 hook guardrails passed",
          findingCodes: [],
        },
      },
      {
        id: "trace-hook-warn",
        timestamp: "2026-06-03T00:00:01.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHints: ["docs/specs/hooks-pack.md"],
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
        },
      },
      {
        id: "trace-hook-block",
        timestamp: "2026-06-03T00:00:02.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "blocked",
          decision: "block",
          enforced: false,
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail block: out-of-scope-edit",
          findingCodes: ["out-of-scope-edit"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "pass",
      detail:
        "3 hook guardrail trace event(s) valid: allow 1, warn 1, block 1, owned proof paths 1",
    });
  });

  it("fails current hook proof-path trace events without ownership hints", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-proof-path",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail:
        "hook.received trace-hook-proof-path has proof-path-exception without ownership hints",
    });
  });

  it("fails current hook proof-path trace events with broad ownership hints", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-broad-proof-path",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHints: ["docs"],
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail:
        "hook.received trace-hook-broad-proof-path has over-broad proof-path ownership hint docs",
    });
  });

  it("fails current hook trace events with unknown ownership models", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-unknown-ownership",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "package-policy-v2",
          ownedProofPathHints: ["packages/config"],
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail:
        "hook.received trace-hook-unknown-ownership has an unknown proof-path ownership model",
    });
  });

  it("fails hook guardrail trace events without finding-code payloads", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-block",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "blocked",
          decision: "block",
          enforced: false,
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail block: out-of-scope-edit",
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail: "hook.received trace-hook-block is missing guardrail decision fields",
    });
  });
});
