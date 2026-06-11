import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseGitStatusPath } from "./commands/handoff.js";
import { runCli } from "./index.js";

async function runInTemp(args: string[]) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
  const result = await runInCwd(cwd, args);

  return { cwd, ...result };
}

async function runInCwd(cwd: string, args: string[]) {
  let stdout = "";
  let stderr = "";
  const code = await runCli(args, {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
    now: () => new Date("2026-06-03T00:00:00.000Z"),
  });

  return { stdout, stderr, code };
}

interface TraceEventFixture {
  name: string;
  taskId?: string;
  data?: Record<string, unknown>;
}

const supportedP0CodexHookEvents = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "Stop",
];

async function readTraceEvents(cwd: string): Promise<TraceEventFixture[]> {
  const raw = await readFile(path.join(cwd, ".krn", "traces", "trace.jsonl"), "utf8");
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TraceEventFixture);
}

async function readRunTraceEvents(cwd: string, taskId: string): Promise<TraceEventFixture[]> {
  const raw = await readFile(path.join(cwd, ".krn", "runs", taskId, "trace.jsonl"), "utf8");
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TraceEventFixture);
}

async function readJson<T>(cwd: string, relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(cwd, relativePath), "utf8")) as T;
}

async function expectDirectory(cwd: string, relativePath: string): Promise<void> {
  await expect(stat(path.join(cwd, relativePath))).resolves.toMatchObject({
    isDirectory: expect.any(Function),
  });
  expect((await stat(path.join(cwd, relativePath))).isDirectory()).toBe(true);
}

async function expectFile(cwd: string, relativePath: string): Promise<void> {
  await expect(stat(path.join(cwd, relativePath))).resolves.toMatchObject({
    isFile: expect.any(Function),
  });
  expect((await stat(path.join(cwd, relativePath))).isFile()).toBe(true);
}

describe("krn CLI", () => {
  it("parses git status paths for handoff changed files", () => {
    expect(parseGitStatusPath(" M packages/cli/src/commands/handoff.ts")).toBe(
      "packages/cli/src/commands/handoff.ts",
    );
    expect(parseGitStatusPath("?? docs/specs/handoff.md")).toBe("docs/specs/handoff.md");
    expect(parseGitStatusPath("R  old/path.ts -> new/path.ts")).toBe("new/path.ts");
  });

  it("prints help", async () => {
    const result = await runInTemp(["--help"]);

    expect(result.code).toBe(0);
    for (const command of [
      "krn status",
      'krn start "<task>"',
      "krn graph",
      "krn context",
      "krn verify",
      "krn handoff",
      "krn doctor",
      "krn eval",
      "krn install",
      "krn memory <command>",
      "krn hook codex <event>",
    ]) {
      expect(result.stdout).toContain(command);
    }
  });

  it("prints helpful output for unknown commands", async () => {
    const result = await runInTemp(["unknown-command"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Unknown command: unknown-command");
    expect(result.stdout).toContain("KRN Harness CLI");
    expect(result.stdout).toContain("krn memory <command>");
    expect(result.stdout).toContain("krn hook codex <event>");
  });

  it("runs status and writes a trace event", async () => {
    const result = await runInTemp(["status"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN status: ready");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([{ name: "cli.status" }]);
  });

  it("runs the full P0 local loop and writes current graph trace artifacts", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));

    for (const args of [
      ["status"],
      ["start", "Update", "a", "frontend", "section", "using", "only", "relevant", "context"],
      ["graph"],
      ["context"],
      ["verify"],
      ["handoff"],
      ["doctor"],
      ["eval"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const contract = await readJson<{ id: string }>(cwd, ".krn/current/task-contract.json");
    const expectedFiles = [
      ".krn/current/task-contract.json",
      ".krn/current/task-contract.md",
      ".krn/current/run.json",
      ".krn/graph/repo-graph.json",
      ".krn/graph/repo-graph.md",
      ".krn/current/context-package.json",
      ".krn/current/context-package.md",
      ".krn/current/verify-result.json",
      ".krn/current/verify-result.md",
      ".krn/current/handoff.md",
      ".krn/current/doctor-result.json",
      ".krn/current/doctor-result.md",
      ".krn/current/eval-result.json",
      ".krn/current/eval-result.md",
      ".krn/traces/trace.jsonl",
      `.krn/runs/${contract.id}/trace.jsonl`,
      `.krn/runs/${contract.id}/run.json`,
      `.krn/runs/${contract.id}/summary.md`,
    ];

    for (const file of expectedFiles) {
      await expectFile(cwd, file);
    }

    expect((await readTraceEvents(cwd)).map((event) => event.name)).toEqual([
      "cli.status",
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
    ]);
    expect((await readRunTraceEvents(cwd, contract.id)).map((event) => event.name)).toEqual([
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
    ]);
  });

  it("runs graph and writes deterministic graph artifacts", async () => {
    const result = await runInTemp(["graph"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toBe(`KRN graph: ready
nodes: 0
edges: 0
json: .krn/graph/repo-graph.json
markdown: .krn/graph/repo-graph.md
`);

    const graphJson = await readJson<{
      schemaVersion: number;
      generatedAt: string;
      nodeCount: number;
      edgeCount: number;
      detectors: string[];
      relationKindCounts: Record<string, number>;
      nodeKindCounts: Record<string, number>;
      statusCounts: Record<string, number>;
      nodes: unknown[];
      edges: unknown[];
    }>(result.cwd, ".krn/graph/repo-graph.json");
    const graphMarkdown = await readFile(path.join(result.cwd, ".krn/graph/repo-graph.md"), "utf8");

    expect(graphJson).toMatchObject({
      schemaVersion: 1,
      generatedAt: "2026-06-03T00:00:00.000Z",
      nodeCount: 0,
      edgeCount: 0,
      relationKindCounts: {},
      nodeKindCounts: {},
      statusCounts: {},
      nodes: [],
      edges: [],
    });
    expect(graphJson.detectors).toEqual([
      "acf-json",
      "composer-json",
      "css-class",
      "docs-links",
      "filesystem",
      "package-json",
      "wordpress-bedrock",
    ]);
    expect(graphMarkdown).toContain("# Graph-Lite Repository Graph");
    expect(graphMarkdown).toContain("## Detectors");
    expect(graphMarkdown).toContain("## Relation Kinds");
    expect(graphMarkdown).toContain("## Evidence Examples");
    expect(graphMarkdown).toContain("Graph-lite is shallow P0 evidence");
    await expect(stat(path.join(result.cwd, ".krn", "runs"))).rejects.toThrow();
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "graph.built",
        data: {
          nodeCount: 0,
          edgeCount: 0,
          detectors: graphJson.detectors,
          relationKindCounts: {},
          nodeKindCounts: {},
        },
      },
    ]);
  });

  it("installs deterministic downstream onboarding artifacts safely and idempotently", async () => {
    const install = await runInTemp(["install"]);

    expect(install.code).toBe(0);
    expect(install.stdout).toContain("KRN install: installed");
    expect(install.stdout).toContain("created: 7");
    expect(install.stdout).toContain("skipped: 0");

    await expectDirectory(install.cwd, ".krn/current");
    await expectDirectory(install.cwd, ".krn/graph");
    await expectDirectory(install.cwd, ".krn/traces");

    await expect(readJson(install.cwd, "krn.config.json")).resolves.toEqual({
      version: 1,
      runtime: {
        dir: ".krn",
      },
    });

    const agents = await readFile(path.join(install.cwd, "AGENTS.md"), "utf8");
    const hooks = await readJson<{
      hooks: Record<string, Array<{ hooks: Array<{ command: string }> }>>;
    }>(install.cwd, ".codex/hooks.json");
    const runtimeSkill = await readFile(
      path.join(install.cwd, ".agents/skills/krn-harness/SKILL.md"),
      "utf8",
    );

    expect(agents).toContain("KRN Harness");
    expect(agents).toContain("krn start");
    expect(agents).toContain("STOP");
    expect(hooks.hooks.SessionStart?.[0]?.hooks[0]?.command).toBe("krn hook codex SessionStart");
    expect(hooks.hooks.Stop?.[0]?.hooks[0]?.command).toBe("krn hook codex Stop");
    expect(runtimeSkill).toContain("krn status");
    expect(runtimeSkill).toContain("krn handoff");

    await expect(readTraceEvents(install.cwd)).resolves.toMatchObject([
      {
        name: "install.ran",
        data: {
          status: "installed",
          created: 7,
          skipped: 0,
          reason: null,
          actions: [
            { path: ".krn/current", kind: "directory", status: "created" },
            { path: ".krn/graph", kind: "directory", status: "created" },
            { path: ".krn/traces", kind: "directory", status: "created" },
            { path: "krn.config.json", kind: "file", status: "created" },
            { path: "AGENTS.md", kind: "file", status: "created" },
            { path: ".codex/hooks.json", kind: "file", status: "created" },
            {
              path: ".agents/skills/krn-harness/SKILL.md",
              kind: "file",
              status: "created",
            },
          ],
        },
      },
    ]);

    const secondInstall = await runInCwd(install.cwd, ["install"]);
    expect(secondInstall).toMatchObject({ code: 0 });
    expect(secondInstall.stdout).toContain("created: 0");
    expect(secondInstall.stdout).toContain("skipped: 7");
    await expect(readTraceEvents(install.cwd)).resolves.toMatchObject([
      { name: "install.ran" },
      {
        name: "install.ran",
        data: {
          status: "installed",
          created: 0,
          skipped: 7,
          reason: null,
          actions: [
            { path: ".krn/current", kind: "directory", status: "skipped" },
            { path: ".krn/graph", kind: "directory", status: "skipped" },
            { path: ".krn/traces", kind: "directory", status: "skipped" },
            { path: "krn.config.json", kind: "file", status: "skipped" },
            { path: "AGENTS.md", kind: "file", status: "skipped" },
            { path: ".codex/hooks.json", kind: "file", status: "skipped" },
            {
              path: ".agents/skills/krn-harness/SKILL.md",
              kind: "file",
              status: "skipped",
            },
          ],
        },
      },
    ]);

    const doctor = await runInCwd(install.cwd, ["doctor"]);
    expect(doctor).toMatchObject({ code: 0 });
    const doctorJson = await readJson<{
      checks: Array<{ name: string; status: string }>;
    }>(install.cwd, ".krn/current/doctor-result.json");

    expect(doctorJson.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "config",
          status: "pass",
          detail: "krn.config.json is valid",
        }),
        expect.objectContaining({
          name: "downstream-agents",
          status: "pass",
          detail: "AGENTS.md is present",
        }),
        expect.objectContaining({
          name: "downstream-runtime-skill",
          status: "pass",
          detail: ".agents/skills/krn-harness/SKILL.md is present",
        }),
        expect.objectContaining({
          name: "downstream-hooks-template",
          status: "pass",
          detail: ".codex/hooks.json is present",
        }),
      ]),
    );
  });

  it("preserves existing downstream instructions during install", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "AGENTS.md"), "# Existing Instructions\n", "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      '{\n  "version": 1,\n  "runtime": {\n    "dir": ".custom-krn"\n  }\n}\n',
      "utf8",
    );

    const install = await runInCwd(cwd, ["install"]);

    expect(install.code).toBe(0);
    expect(install.stdout).toContain("- skipped AGENTS.md: existing file preserved");
    expect(install.stdout).toContain("- skipped krn.config.json: existing file preserved");
    await expect(readFile(path.join(cwd, "AGENTS.md"), "utf8")).resolves.toBe(
      "# Existing Instructions\n",
    );
    await expect(readJson(cwd, "krn.config.json")).resolves.toEqual({
      version: 1,
      runtime: {
        dir: ".custom-krn",
      },
    });
  });

  it("handles Codex hook events with deterministic trace output", async () => {
    const result = await runInTemp(["hook", "codex", "SessionStart"]);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      provider: "codex",
      event: "SessionStart",
      supported: true,
      status: "ok",
      payloadSource: "placeholder",
      detail: "P0 hook entrypoint received event; no policy enforcement is implemented",
    });

    for (const event of supportedP0CodexHookEvents) {
      const supported = await runInCwd(result.cwd, ["hook", "codex", event]);
      expect(supported.code).toBe(0);
      expect(JSON.parse(supported.stdout)).toMatchObject({
        provider: "codex",
        event,
        supported: true,
        status: "ok",
        payloadSource: "placeholder",
      });
    }

    const unknown = await runInCwd(result.cwd, ["hook", "codex", "UnknownEvent"]);
    expect(unknown.code).toBe(0);
    expect(JSON.parse(unknown.stdout)).toMatchObject({
      provider: "codex",
      event: "UnknownEvent",
      supported: false,
      status: "ignored",
      payloadSource: "placeholder",
    });

    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          provider: "codex",
          event: "SessionStart",
          supported: true,
          status: "ok",
          payloadSource: "placeholder",
          detail: "P0 hook entrypoint received event; no policy enforcement is implemented",
        },
      },
      ...supportedP0CodexHookEvents.map((event) => ({
        name: "hook.received",
        data: {
          provider: "codex",
          event,
          supported: true,
          status: "ok",
          payloadSource: "placeholder",
          detail: "P0 hook entrypoint received event; no policy enforcement is implemented",
        },
      })),
      {
        name: "hook.received",
        data: {
          provider: "codex",
          event: "UnknownEvent",
          supported: false,
          status: "ignored",
          payloadSource: "placeholder",
          detail: "Unsupported Codex hook event ignored by P0 hook skeleton",
        },
      },
    ]);
  });

  it("runs the manual governed memory workflow without auto-approval", async () => {
    const proposed = await runInTemp([
      "memory",
      "propose",
      "Prefer",
      "manual",
      "memory",
      "--evidence",
      "docs/specs/memory.schema.md",
    ]);

    expect(proposed.code).toBe(0);
    expect(proposed.stdout).toContain("KRN memory: proposed");
    expect(proposed.stdout).toContain("status: pending");
    expect(proposed.stdout).toContain("store: .krn/memory/pending.json");

    const pendingStore = await readJson<{
      status: string;
      records: Array<{ id: string; status: string; summary: string; evidencePath?: string }>;
    }>(proposed.cwd, ".krn/memory/pending.json");
    const approvedStoreAfterPropose = await readJson<{
      status: string;
      records: Array<{ id: string }>;
    }>(proposed.cwd, ".krn/memory/approved.json");
    const memoryId = pendingStore.records[0]?.id ?? "";

    expect(pendingStore).toMatchObject({
      status: "pending",
      records: [
        {
          id: memoryId,
          status: "pending",
          summary: "Prefer manual memory",
          evidencePath: "docs/specs/memory.schema.md",
        },
      ],
    });
    expect(approvedStoreAfterPropose).toMatchObject({
      status: "approved",
      records: [],
    });

    const approved = await runInCwd(proposed.cwd, ["memory", "approve", memoryId]);

    expect(approved.code).toBe(0);
    expect(approved.stdout).toContain("KRN memory: approved");
    expect(approved.stdout).toContain("store: .krn/memory/approved.json");
    await expect(readJson(proposed.cwd, ".krn/memory/pending.json")).resolves.toMatchObject({
      records: [],
    });
    await expect(readJson(proposed.cwd, ".krn/memory/approved.json")).resolves.toMatchObject({
      records: [
        {
          id: memoryId,
          status: "approved",
          approvedAt: "2026-06-03T00:00:00.000Z",
        },
      ],
    });

    const deprecated = await runInCwd(proposed.cwd, [
      "memory",
      "deprecate",
      memoryId,
      "superseded",
      "by",
      "canon",
    ]);

    expect(deprecated.code).toBe(0);
    expect(deprecated.stdout).toContain("KRN memory: deprecated");
    expect(deprecated.stdout).toContain("reason: superseded by canon");
    await expect(readJson(proposed.cwd, ".krn/memory/approved.json")).resolves.toMatchObject({
      records: [],
    });
    await expect(readJson(proposed.cwd, ".krn/memory/deprecated.json")).resolves.toMatchObject({
      records: [
        {
          id: memoryId,
          status: "deprecated",
          deprecationReason: "superseded by canon",
        },
      ],
    });

    const listed = await runInCwd(proposed.cwd, ["memory", "list"]);

    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain("pending: 0");
    expect(listed.stdout).toContain("approved: 0");
    expect(listed.stdout).toContain("deprecated: 1");
    expect(listed.stdout).toContain(`- deprecated ${memoryId}: Prefer manual memory`);

    await expect(readTraceEvents(proposed.cwd)).resolves.toMatchObject([
      {
        name: "memory.proposed",
        data: {
          id: memoryId,
          status: "pending",
          evidencePath: "docs/specs/memory.schema.md",
          pending: 1,
          approved: 0,
          deprecated: 0,
        },
      },
      {
        name: "memory.approved",
        data: {
          id: memoryId,
          status: "approved",
          pending: 0,
          approved: 1,
          deprecated: 0,
        },
      },
      {
        name: "memory.deprecated",
        data: {
          id: memoryId,
          status: "deprecated",
          reason: "superseded by canon",
          pending: 0,
          approved: 0,
          deprecated: 1,
        },
      },
      {
        name: "memory.listed",
        data: {
          pending: 0,
          approved: 0,
          deprecated: 1,
        },
      },
    ]);
  });

  it("reports missing memory records without crashing", async () => {
    const approved = await runInTemp(["memory", "approve", "memory-missing"]);
    const deprecated = await runInCwd(approved.cwd, ["memory", "deprecate", "memory-missing"]);

    expect(approved.code).toBe(1);
    expect(approved.stderr).toContain("KRN memory approve: memory not found: memory-missing");
    expect(deprecated.code).toBe(1);
    expect(deprecated.stderr).toContain("KRN memory deprecate: memory not found: memory-missing");
  });

  it("surfaces approved memory in context only after manual approval", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Graph",
      "selector",
      "should",
      "stay",
      "generic",
      "--evidence",
      "docs/specs/graph-lite.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{
      records: Array<{ id: string }>;
    }>(cwd, ".krn/memory/pending.json");
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["start", "Harden", "graph", "selector"])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const contextBeforeApproval = await readJson<{
      buckets: { referenceOnly: Array<{ source?: string; memoryId?: string }> };
    }>(cwd, ".krn/current/context-package.json");
    expect(
      contextBeforeApproval.buckets.referenceOnly.some((item) => item.source === "memory"),
    ).toBe(false);

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const contextAfterApproval = await readJson<{
      buckets: {
        mustRead: Array<{ memoryId?: string }>;
        shouldRead: Array<{ memoryId?: string }>;
        referenceOnly: Array<{
          path: string;
          source?: string;
          selector?: string;
          memoryId?: string;
          approvedAt?: string;
          evidencePath?: string;
          matchedTerms?: string[];
        }>;
      };
    }>(cwd, ".krn/current/context-package.json");
    const markdown = await readFile(path.join(cwd, ".krn/current/context-package.md"), "utf8");

    expect(contextAfterApproval.buckets.mustRead.some((item) => item.memoryId === memoryId)).toBe(
      false,
    );
    expect(contextAfterApproval.buckets.shouldRead.some((item) => item.memoryId === memoryId)).toBe(
      false,
    );
    expect(contextAfterApproval.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: `.krn/memory/approved.json#${memoryId}`,
        source: "memory",
        selector: "approved-memory-task-match",
        memoryId,
        approvedAt: "2026-06-03T00:00:00.000Z",
        evidencePath: "docs/specs/graph-lite.md",
        matchedTerms: ["graph", "selector"],
      }),
    );
    expect(markdown).toContain(`.krn/memory/approved.json#${memoryId}`);
    expect(markdown).toContain("source: memory, selector: approved-memory-task-match");
  });

  it("runs start and context with task trace behavior", async () => {
    const result = await runInTemp(["start", "Implement", "a", "slice"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN start: task accepted");

    const context = await runCli(["context"], {
      cwd: result.cwd,
      stdout: (text) => {
        result.stdout += text;
      },
      stderr: (text) => {
        result.stderr += text;
      },
      now: () => new Date("2026-06-03T00:00:00.000Z"),
    });

    expect(context).toBe(0);
    expect(result.stdout).toContain("KRN context: package written");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      { name: "task.started" },
      { name: "context.built" },
    ]);
  });

  it("writes run-scoped trace and run metadata for the current loop", async () => {
    const start = await runInTemp(["start", "goal", "run", "trace", "task"]);
    expect(start.code).toBe(0);

    const contract = await readJson<{ id: string }>(start.cwd, ".krn/current/task-contract.json");
    await expect(runInCwd(start.cwd, ["graph"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["verify"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["doctor"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["eval"])).resolves.toMatchObject({ code: 0 });

    const expectedNames = [
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
    ];
    const globalEvents = await readTraceEvents(start.cwd);
    const runEvents = await readRunTraceEvents(start.cwd, contract.id);
    const runMetadata = await readJson<{
      schemaVersion: number;
      taskId: string;
      startedAt: string;
      lastEventAt: string;
      current: boolean;
      events: Array<{ name: string; timestamp: string }>;
      artifactPaths: Record<string, string>;
    }>(start.cwd, `.krn/runs/${contract.id}/run.json`);
    const runSummary = await readFile(
      path.join(start.cwd, ".krn", "runs", contract.id, "summary.md"),
      "utf8",
    );
    const currentRun = await readJson<{
      schemaVersion: number;
      taskId: string;
      runDir: string;
      tracePath: string;
      graphArtifactPath: string;
    }>(start.cwd, ".krn/current/run.json");

    expect(globalEvents.map((event) => event.name)).toEqual(expectedNames);
    expect(runEvents.map((event) => event.name)).toEqual(expectedNames);
    expect(runEvents.every((event) => event.taskId === contract.id)).toBe(true);
    expect(runMetadata).toMatchObject({
      schemaVersion: 1,
      taskId: contract.id,
      startedAt: "2026-06-03T00:00:00.000Z",
      lastEventAt: "2026-06-03T00:00:00.000Z",
      current: true,
      artifactPaths: {
        globalTrace: ".krn/traces/trace.jsonl",
        graphJson: ".krn/graph/repo-graph.json",
        runSummary: `.krn/runs/${contract.id}/summary.md`,
        runTrace: `.krn/runs/${contract.id}/trace.jsonl`,
        taskContractJson: ".krn/current/task-contract.json",
      },
    });
    expect(runMetadata.events.map((event) => event.name)).toEqual(expectedNames);
    expect(runSummary).toContain("# KRN Run Summary");
    expect(runSummary).toContain(`Task ID: ${contract.id}`);
    expect(runSummary).toContain("Event count: 7");
    expect(runSummary).toContain("Last event: eval.ran");
    expect(runSummary).toContain("This is local evidence only.");
    expect(currentRun).toMatchObject({
      schemaVersion: 1,
      taskId: contract.id,
      runDir: `.krn/runs/${contract.id}`,
      tracePath: `.krn/runs/${contract.id}/trace.jsonl`,
      graphArtifactPath: ".krn/graph/repo-graph.json",
    });
  });

  it("writes deterministic task-contract current artifacts", async () => {
    const result = await runInTemp(["start", "goal", "2", "smoke", "task"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("task_id: task-1354ea37dd50");

    const contract = await readJson<Record<string, unknown>>(
      result.cwd,
      ".krn/current/task-contract.json",
    );
    const markdown = await readFile(path.join(result.cwd, ".krn/current/task-contract.md"), "utf8");

    expect(contract).toMatchObject({
      id: "task-1354ea37dd50",
      rawUserIntent: "goal 2 smoke task",
      task: "goal 2 smoke task",
      classification: "implementation",
      mode: "edit",
      nonTrivial: true,
      stop: false,
    });
    expect(contract.evidenceRequirements).toEqual([
      "current task contract",
      "current context package",
      "trace event for task start",
      "validation command output or explicit reason it could not run",
    ]);
    expect(markdown).toContain("## Raw User Intent");
    expect(markdown).toContain("## Evidence Requirements");
    expect(markdown).toContain("## Stop Conditions");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "task.started",
        taskId: "task-1354ea37dd50",
        data: {
          classification: "implementation",
        },
      },
    ]);
  });

  it("writes STOP context-package current artifacts", async () => {
    const result = await runInTemp([
      "start",
      "Stop",
      "when",
      "required",
      "context",
      "is",
      "missing",
    ]);
    expect(result.code).toBe(0);

    const contextCode = await runCli(["context"], {
      cwd: result.cwd,
      stdout: (text) => {
        result.stdout += text;
      },
      stderr: (text) => {
        result.stderr += text;
      },
      now: () => new Date("2026-06-03T00:00:00.000Z"),
    });

    expect(contextCode).toBe(0);
    expect(result.stdout).toContain("stop: true");

    const pkg = await readJson<{
      stop: boolean;
      stopReason: string;
      buckets: {
        missingContext: Array<{ path: string }>;
        doNotUse: Array<{ path: string }>;
      };
    }>(result.cwd, ".krn/current/context-package.json");
    const markdown = await readFile(
      path.join(result.cwd, ".krn/current/context-package.md"),
      "utf8",
    );

    expect(pkg.stop).toBe(true);
    expect(pkg.stopReason).toBe("Required context is missing: docs/required-context.md");
    expect(pkg.buckets.missingContext).toEqual([
      {
        path: "docs/required-context.md",
        reason: "Required context is absent",
        priority: 100,
        bucket: "missing-context",
        status: "missing",
        source: "task-policy",
        selector: "missing-context-policy",
      },
    ]);
    expect(markdown).toContain("## Missing Context");
    expect(markdown).toContain("STOP: true");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      { name: "task.started" },
      {
        name: "context.built",
        taskId: "task-739518f3ddd0",
        data: {
          stop: true,
        },
      },
    ]);
  });

  it("writes verify and handoff artifacts with full trace order", async () => {
    const start = await runInTemp(["start", "goal", "3", "smoke", "task"]);
    expect(start.code).toBe(0);

    await expect(runInCwd(start.cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    const verify = await runInCwd(start.cwd, ["verify"]);
    expect(verify).toMatchObject({ code: 0 });
    expect(verify.stdout).toContain("KRN verify: not-runnable");

    const handoff = await runInCwd(start.cwd, ["handoff"]);
    expect(handoff).toMatchObject({ code: 0 });
    expect(handoff.stdout).toContain("KRN handoff: ready");

    const verifyResult = await readJson<{
      status: string;
      taskId: string;
      contextStop: boolean;
      graphArtifactPresent: boolean;
      currentRunTracePresent: boolean;
      configuredCommands: string[];
      executedCommands: string[];
      notRunnableReason: string;
    }>(start.cwd, ".krn/current/verify-result.json");
    const verifyMarkdown = await readFile(
      path.join(start.cwd, ".krn/current/verify-result.md"),
      "utf8",
    );
    const handoffMarkdown = await readFile(path.join(start.cwd, ".krn/current/handoff.md"), "utf8");

    expect(verifyResult).toEqual({
      profile: "generic",
      status: "not-runnable",
      taskId: "task-d62ea4fbc009",
      contextStop: false,
      graphArtifactPresent: false,
      currentRunTracePresent: true,
      configuredCommands: [],
      executedCommands: [],
      notRunnableReason: "No verify commands are configured",
      checks: [
        {
          name: "configured-commands",
          status: "warn",
          detail: "No verify commands are configured",
        },
        {
          name: "graph-artifact",
          status: "warn",
          detail: ".krn/graph/repo-graph.json is missing",
        },
        {
          name: "current-run-trace",
          status: "pass",
          detail: "Current run trace is present",
        },
      ],
    });
    expect(verifyMarkdown).toContain("Status: not-runnable");
    expect(handoffMarkdown).toContain("Task ID: task-d62ea4fbc009");
    expect(handoffMarkdown).toContain("Context STOP: false");
    expect(handoffMarkdown).toContain("Status: not-runnable");
    expect(handoffMarkdown).toContain("## Graph");
    expect(handoffMarkdown).toContain("Nodes: missing");
    expect(handoffMarkdown).toContain("Current run trace: .krn/runs/task-d62ea4fbc009/trace.jsonl");
    expect(handoffMarkdown).toContain("## Artifact Pointers");
    expect(handoffMarkdown).toContain("- Task contract: .krn/current/task-contract.json");

    await expect(readTraceEvents(start.cwd)).resolves.toMatchObject([
      { name: "task.started", taskId: "task-d62ea4fbc009" },
      { name: "context.built", taskId: "task-d62ea4fbc009", data: { stop: false } },
      {
        name: "verify.ran",
        taskId: "task-d62ea4fbc009",
        data: {
          status: "not-runnable",
          contextStop: false,
          graphArtifactPresent: false,
          currentRunTracePresent: true,
          configuredCommands: 0,
        },
      },
      {
        name: "handoff.created",
        taskId: "task-d62ea4fbc009",
        data: { contextStop: false, verifyStatus: "not-runnable" },
      },
    ]);
  });

  it("writes STOP-aware verify and handoff artifacts", async () => {
    const start = await runInTemp([
      "start",
      "Stop",
      "when",
      "required",
      "context",
      "is",
      "missing",
    ]);
    expect(start.code).toBe(0);

    await expect(runInCwd(start.cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["verify"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });

    const verifyResult = await readJson<{
      status: string;
      taskId: string;
      contextStop: boolean;
      notRunnableReason: string;
    }>(start.cwd, ".krn/current/verify-result.json");
    const handoffMarkdown = await readFile(path.join(start.cwd, ".krn/current/handoff.md"), "utf8");

    expect(verifyResult).toMatchObject({
      status: "blocked",
      taskId: "task-739518f3ddd0",
      contextStop: true,
      notRunnableReason: "Required context is missing: docs/required-context.md",
    });
    expect(handoffMarkdown).toContain("Context STOP: true");
    expect(handoffMarkdown).toContain(
      "STOP reason: Required context is missing: docs/required-context.md",
    );
    expect(handoffMarkdown).toContain("Status: blocked");
  });

  it("writes doctor and eval artifacts with full P0 trace order", async () => {
    const start = await runInTemp(["start", "goal", "4", "smoke", "task"]);
    expect(start.code).toBe(0);

    await expect(runInCwd(start.cwd, ["graph"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["verify"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(start.cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });

    const doctor = await runInCwd(start.cwd, ["doctor"]);
    expect(doctor).toMatchObject({ code: 0 });
    expect(doctor.stdout).toContain("KRN doctor: warn");

    const evalResult = await runInCwd(start.cwd, ["eval"]);
    expect(evalResult).toMatchObject({ code: 0 });
    expect(evalResult.stdout).toContain("KRN eval: pass");

    const finalHandoff = await runInCwd(start.cwd, ["handoff"]);
    expect(finalHandoff).toMatchObject({ code: 0 });

    const doctorJson = await readJson<{
      status: string;
      checks: Array<{ name: string; status: string }>;
      nextActions: string[];
    }>(start.cwd, ".krn/current/doctor-result.json");
    const verifyJson = await readJson<{
      graphArtifactPresent: boolean;
      currentRunTracePresent: boolean;
    }>(start.cwd, ".krn/current/verify-result.json");
    const doctorMarkdown = await readFile(
      path.join(start.cwd, ".krn/current/doctor-result.md"),
      "utf8",
    );
    const evalJson = await readJson<{
      status: string;
      passCount: number;
      failCount: number;
      fixtures: Array<{ name: string; status: string }>;
      graph: { status: string };
      graphArtifact: { status: string };
      memory: { status: string };
      trace: { status: string };
      runTraceMode: string;
    }>(start.cwd, ".krn/current/eval-result.json");
    const evalMarkdown = await readFile(
      path.join(start.cwd, ".krn/current/eval-result.md"),
      "utf8",
    );
    const handoffMarkdown = await readFile(path.join(start.cwd, ".krn/current/handoff.md"), "utf8");

    expect(doctorJson.status).toBe("warn");
    expect(doctorJson.checks.map((check) => check.name)).toEqual([
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
      "global-trace",
    ]);
    expect(doctorMarkdown).toContain("Status: warn");
    expect(doctorJson.nextActions).toEqual([]);
    expect(verifyJson).toMatchObject({
      graphArtifactPresent: true,
      currentRunTracePresent: true,
    });

    expect(evalJson).toMatchObject({
      status: "pass",
      passCount: 13,
      failCount: 0,
      graph: { status: "pass" },
      graphArtifact: { status: "pass" },
      memory: { status: "pass" },
      trace: { status: "pass" },
      runTraceMode: "run-scoped",
    });
    expect(evalJson.fixtures.map((fixture) => fixture.name)).toEqual([
      "frontend-section-context",
      "stale-doc-trap",
      "missing-context-stop",
    ]);
    expect(evalJson.fixtures.every((fixture) => fixture.status === "pass")).toBe(true);
    expect(evalMarkdown).toContain("### frontend-section-context");
    expect(evalMarkdown).toContain("## Graph Coverage");
    expect(evalMarkdown).toContain("## Memory Governance");
    expect(evalMarkdown).toContain("## Trace Coverage");
    expect(evalMarkdown).toContain("## P0 Limits");
    expect(handoffMarkdown).toContain("## Graph");
    expect(handoffMarkdown).toContain("Status: present");
    expect(handoffMarkdown).toContain("Nodes:");
    expect(handoffMarkdown).toContain("Edges:");
    expect(handoffMarkdown).toContain("Current run trace: .krn/runs/task-a39f90427522/trace.jsonl");
    expect(handoffMarkdown).toContain("## Doctor\n\nStatus: warn");
    expect(handoffMarkdown).toContain("## Eval\n\nStatus: pass");
    expect(handoffMarkdown).toContain("## Artifact Pointers");
    expect(handoffMarkdown).toContain("- Task contract: .krn/current/task-contract.json");
    expect(handoffMarkdown).toContain("- Graph JSON: .krn/graph/repo-graph.json");
    expect(handoffMarkdown).toContain("- Eval result: .krn/current/eval-result.json");

    await expect(readTraceEvents(start.cwd)).resolves.toMatchObject([
      { name: "task.started", taskId: "task-a39f90427522" },
      { name: "graph.built", taskId: "task-a39f90427522" },
      { name: "context.built", taskId: "task-a39f90427522" },
      { name: "verify.ran", taskId: "task-a39f90427522" },
      { name: "handoff.created", taskId: "task-a39f90427522" },
      { name: "doctor.ran", data: { status: "warn", checks: 20 } },
      {
        name: "eval.ran",
        data: {
          status: "pass",
          fixtures: 3,
          passCount: 13,
          failCount: 0,
          memoryStatus: "pass",
        },
      },
      {
        name: "handoff.created",
        taskId: "task-a39f90427522",
        data: { contextStop: false, verifyStatus: "not-runnable" },
      },
    ]);
  });
});
