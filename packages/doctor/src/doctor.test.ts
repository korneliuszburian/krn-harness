import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { renderDoctorResultMarkdown, runDoctor } from "./doctor.js";

async function tempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "krn-doctor-"));
}

describe("doctor result current state and config", () => {
  it("reports deterministic warnings for missing current-state artifacts", async () => {
    const cwd = await tempRepo();
    const result = await runDoctor(cwd);

    expect(result.status).toBe("warn");
    expect(result.checks.map((check) => check.name)).toEqual([
      "config",
      "verify-config-policy",
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
    expect(result.checks).toContainEqual({
      name: "verify-config-policy",
      status: "pass",
      detail: "No verify commands configured; policy check skipped",
    });
    expect(result.checks).toContainEqual({
      name: "downstream-agents",
      status: "warn",
      detail: "AGENTS.md is missing; run `krn install` in the downstream repo",
    });
    expect(result.checks).toContainEqual({
      name: "downstream-runtime-skill",
      status: "warn",
      detail:
        ".agents/skills/krn-harness/SKILL.md is missing; run `krn install` in the downstream repo",
    });
    expect(result.checks).toContainEqual({
      name: "downstream-hooks-template",
      status: "warn",
      detail: ".codex/hooks.json is missing; run `krn install` in the downstream repo",
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

  it("fails disallowed verify commands configured in a profile", async () => {
    const cwd = await tempRepo();
    await writeFile(
      path.join(cwd, "krn.config.json"),
      `${JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "unsafe",
            profiles: {
              unsafe: {
                commands: ["pnpm test && rm -rf .krn"],
              },
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "verify-config-policy",
      status: "fail",
      detail:
        "Disallowed verify command(s): unsafe: pnpm test && rm -rf .krn - shell syntax is not allowed",
    });
  });

  it("warns when the current verify result is not-runnable", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "verify-result.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-06-03T00:00:00.000Z",
        profileName: "generic",
        mode: "record-only",
        status: "not-runnable",
        configSource: "default",
        contextStop: false,
        summary: {
          totalCommands: 0,
          allowedCommands: 0,
          blockedCommands: 0,
          executedCommands: 0,
        },
        limits: { timeoutMs: 120000, maxOutputBytes: 12000 },
        commands: [],
      })}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "current-verify-result",
      status: "warn",
      detail:
        "Current verify result is not-runnable; configure or select a runnable verify profile",
    });
    expect(result.nextActions).toContain(
      "Configure an allowed verify profile or run `krn verify --profile <name>`.",
    );
  });

  it("fails inconsistent current verify pass results", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "verify-result.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-06-03T00:00:00.000Z",
        profileName: "unit",
        mode: "execute",
        status: "pass",
        configSource: "file",
        contextStop: false,
        summary: {
          totalCommands: 1,
          allowedCommands: 1,
          blockedCommands: 0,
          executedCommands: 1,
        },
        limits: { timeoutMs: 120000, maxOutputBytes: 12000 },
        commands: [
          {
            command: { command: "node", args: ["fail.cjs"] },
            commandText: "node fail.cjs",
            allowed: true,
            status: "failed",
            exitCode: 1,
          },
        ],
      })}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "current-verify-result",
      status: "fail",
      detail: "Verify result status is pass but at least one command did not pass",
    });
  });

  it("fails current verify output that exceeds the recorded byte budget", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "verify-result.json"),
      `${JSON.stringify({
        schemaVersion: 1,
        generatedAt: "2026-06-03T00:00:00.000Z",
        profileName: "unit",
        mode: "execute",
        status: "fail",
        configSource: "file",
        contextStop: false,
        summary: {
          totalCommands: 1,
          allowedCommands: 1,
          blockedCommands: 0,
          executedCommands: 1,
        },
        limits: { timeoutMs: 120000, maxOutputBytes: 4 },
        commands: [
          {
            command: { command: "node", args: ["noisy.cjs"] },
            commandText: "node noisy.cjs",
            allowed: true,
            status: "failed",
            exitCode: 1,
            stdoutTail: "12345",
          },
        ],
      })}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "current-verify-result",
      status: "fail",
      detail: "node noisy.cjs output exceeds verify maxOutputBytes",
    });
  });

  it("fails malformed downstream hook and runtime skill artifacts", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".codex"), { recursive: true });
    await mkdir(path.join(cwd, ".agents", "skills", "krn-harness"), { recursive: true });
    await writeFile(path.join(cwd, ".codex", "hooks.json"), '{"hooks":{}}\n', "utf8");
    await writeFile(
      path.join(cwd, ".agents", "skills", "krn-harness", "SKILL.md"),
      "# KRN Harness\n\nRun `krn status` only.\n",
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "downstream-runtime-skill",
      status: "fail",
      detail:
        ".agents/skills/krn-harness/SKILL.md is missing runtime command(s): krn start, krn context, krn verify, krn handoff",
    });
    expect(result.checks).toContainEqual({
      name: "downstream-hooks-template",
      status: "fail",
      detail:
        ".codex/hooks.json is missing hook event(s): SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, PostCompact, Stop",
    });
  });

  it("warns when downstream AGENTS exists without KRN workflow", async () => {
    const cwd = await tempRepo();
    await writeFile(
      path.join(cwd, "AGENTS.md"),
      "# Project Notes\n\nUse local conventions.\n",
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "downstream-agents",
      status: "warn",
      detail:
        "AGENTS.md is present but does not mention the KRN workflow; review project guidance or run `krn install` if KRN should manage onboarding",
    });
  });

  it("uses source-checkout wording for missing downstream runtime artifacts", async () => {
    const cwd = await tempRepo();
    await writeFile(
      path.join(cwd, "package.json"),
      `${JSON.stringify({ name: "krn-harness" }, null, 2)}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.checks).toEqual(
      expect.arrayContaining([
        {
          name: "downstream-agents",
          status: "warn",
          detail: "AGENTS.md is missing in source checkout; source guidance unavailable",
        },
        {
          name: "downstream-runtime-skill",
          status: "warn",
          detail:
            ".agents/skills/krn-harness/SKILL.md is not installed in the source checkout; adapter template is checked separately",
        },
        {
          name: "downstream-hooks-template",
          status: "warn",
          detail:
            ".codex/hooks.json is not installed in the source checkout; adapter template is checked separately",
        },
      ]),
    );
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
          moduleDependencies: [],
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
