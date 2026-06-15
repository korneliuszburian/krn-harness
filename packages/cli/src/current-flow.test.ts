import { mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixtureRepo,
  readJson,
  readRunTraceEvents,
  readTraceEvents,
  runInCwd,
  runInTemp,
} from "./cli-test-utils.js";
import { runCli } from "./index.js";

describe("krn CLI current flow artifacts", () => {
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
      intentQuality: "medium",
      intentWarnings: ["Task intent is very short."],
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
    expect(markdown).toContain("Intent quality: medium");
    expect(markdown).toContain("## Intent Warnings");
    expect(markdown).toContain("## Evidence Requirements");
    expect(markdown).toContain("## Stop Conditions");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "task.started",
        taskId: "task-1354ea37dd50",
        data: {
          classification: "implementation",
          intentQuality: "medium",
        },
      },
    ]);
  });

  it("warns but accepts a slug-like start task", async () => {
    const result = await runInTemp(["start", "wp-acf-field-mapping"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("intent_quality: low");
    expect(result.stderr).toContain("KRN start warning:");

    const contract = await readJson<Record<string, unknown>>(
      result.cwd,
      ".krn/current/task-contract.json",
    );

    expect(contract).toMatchObject({
      task: "wp-acf-field-mapping",
      intentQuality: "low",
    });
    expect(contract.intentWarnings).toEqual(
      expect.arrayContaining([
        "Task intent looks like a slug or task id; pass the full user intent to krn start.",
      ]),
    );
  });

  it("starts from a local dogfood task spec", async () => {
    const cwd = await copyFixtureRepo("wordpress-acf-theme");
    await mkdir(path.join(cwd, "fixtures", "dogfood", "tasks"), { recursive: true });
    await writeFile(
      path.join(cwd, "fixtures", "dogfood", "tasks", "wp-acf-field-mapping.json"),
      JSON.stringify(
        {
          prompt:
            "Update the active hero ACF field mapping and paired static proof without using legacy ACF notes.",
          expectedTouchedFiles: ["acf/group_hero.json", "tests/theme.test.js"],
          forbiddenTouchedFiles: ["acf/legacy_group.json", "docs/stale-acf-notes.md"],
          requiredDoNotUsePaths: ["acf/legacy_group.json", "docs/stale-acf-notes.md"],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runInCwd(cwd, [
      "start",
      "--task-spec",
      "fixtures/dogfood/tasks/wp-acf-field-mapping.json",
    ]);

    expect(result.code).toBe(0);
    const contract = await readJson<Record<string, unknown>>(
      cwd,
      ".krn/current/task-contract.json",
    );
    const markdown = await readFile(path.join(cwd, ".krn/current/task-contract.md"), "utf8");

    expect(contract).toMatchObject({
      task: "Update the active hero ACF field mapping and paired static proof without using legacy ACF notes.",
      metadata: {
        taskSpecPath: "fixtures/dogfood/tasks/wp-acf-field-mapping.json",
        expectedTouchedFiles: ["acf/group_hero.json", "tests/theme.test.js"],
        forbiddenTouchedFiles: ["acf/legacy_group.json", "docs/stale-acf-notes.md"],
        requiredDoNotUsePaths: ["acf/legacy_group.json", "docs/stale-acf-notes.md"],
      },
    });
    expect(markdown).toContain("## Metadata");
    expect(markdown).toContain("Task spec path: fixtures/dogfood/tasks/wp-acf-field-mapping.json");
  });

  it("rejects task spec symlinks that resolve outside the repository", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const externalDir = await mkdtemp(path.join(os.tmpdir(), "krn-harness-external-"));
    await writeFile(
      path.join(externalDir, "task.json"),
      `${JSON.stringify({ prompt: "outside" })}\n`,
      "utf8",
    );
    await symlink(path.join(externalDir, "task.json"), path.join(cwd, "task-link.json"));

    const result = await runInCwd(cwd, ["start", "--task-spec", "task-link.json"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("--task-spec must resolve inside the current repository");
  });

  it("rejects malformed task spec metadata before rendering artifacts", async () => {
    const cwd = await copyFixtureRepo("wordpress-acf-theme");
    await mkdir(path.join(cwd, "fixtures", "dogfood", "tasks"), { recursive: true });
    await writeFile(
      path.join(cwd, "fixtures", "dogfood", "tasks", "bad-task-spec.json"),
      JSON.stringify({
        prompt: "Update active ACF mapping.",
        expectedTouchedFiles: "acf/group_hero.json",
      }),
      "utf8",
    );

    const result = await runInCwd(cwd, [
      "start",
      "--task-spec",
      "fixtures/dogfood/tasks/bad-task-spec.json",
    ]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain(
      "--task-spec JSON expectedTouchedFiles must be an array of non-empty strings",
    );
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
      schemaVersion: number;
      status: string;
      profileName: string;
      mode: string;
      taskId: string;
      summary: {
        totalCommands: number;
        allowedCommands: number;
        blockedCommands: number;
        executedCommands: number;
      };
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
      schemaVersion: 1,
      generatedAt: "2026-06-03T00:00:00.000Z",
      profileName: "generic",
      profile: "generic",
      mode: "record-only",
      status: "not-runnable",
      summary: {
        totalCommands: 0,
        allowedCommands: 0,
        blockedCommands: 0,
        executedCommands: 0,
      },
      configSource: "default",
      limits: {
        timeoutMs: 120000,
        maxOutputBytes: 12000,
      },
      taskId: "task-d62ea4fbc009",
      contextStop: false,
      graphArtifactPresent: false,
      currentRunTracePresent: true,
      commands: [],
      configuredCommands: [],
      executedCommands: [],
      notRunnableReason: "No verify commands are configured",
      checks: [
        {
          name: "verify-profile",
          status: "pass",
          detail: "Profile generic resolved in record-only mode",
        },
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
    expect(handoffMarkdown).toContain("Profile: generic");
    expect(handoffMarkdown).toContain("Mode: record-only");
    expect(handoffMarkdown).toContain("Commands: total 0, blocked 0, executed 0");
    expect(handoffMarkdown).toContain("## Graph");
    expect(handoffMarkdown).toContain("Nodes: missing");
    expect(handoffMarkdown).toContain("Current run trace: .krn/runs/task-d62ea4fbc009/trace.jsonl");
    expect(handoffMarkdown).toContain("Global trace: .krn/traces/trace.jsonl");
    expect(handoffMarkdown).toContain("## Install\n\nStatus: missing");
    expect(handoffMarkdown).toContain("## Artifact Pointers");
    expect(handoffMarkdown).toContain("- Task contract: .krn/current/task-contract.json");

    await expect(readTraceEvents(start.cwd)).resolves.toMatchObject([
      { name: "task.started", taskId: "task-d62ea4fbc009" },
      { name: "context.built", taskId: "task-d62ea4fbc009", data: { stop: false } },
      {
        name: "verify.ran",
        taskId: "task-d62ea4fbc009",
        data: {
          profileName: "generic",
          mode: "record-only",
          status: "not-runnable",
          contextStop: false,
          graphArtifactPresent: false,
          currentRunTracePresent: true,
          totalCommands: 0,
          allowedCommands: 0,
          blockedCommands: 0,
          executedCommands: 0,
        },
      },
      {
        name: "handoff.created",
        taskId: "task-d62ea4fbc009",
        data: { contextStop: false, verifyStatus: "not-runnable" },
      },
    ]);
  });

  it("resolves named verify profiles from krn.config.json without executing commands", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(
      path.join(cwd, "krn.config.json"),
      `${JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "quality",
            profiles: {
              quality: {
                commands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
                timeoutMs: 30000,
                maxOutputBytes: 4096,
              },
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await expect(runInCwd(cwd, ["start", "verify", "profile", "task"])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    const verify = await runInCwd(cwd, ["verify", "--profile", "quality"]);

    expect(verify).toMatchObject({ code: 0 });
    expect(verify.stdout).toContain("KRN verify: warn");
    expect(verify.stdout).toContain("profile: quality");
    expect(verify.stdout).toContain("mode: record-only");
    expect(verify.stdout).toContain("commands: 3");

    const result = await readJson<{
      profileName: string;
      status: string;
      summary: { totalCommands: number; allowedCommands: number; executedCommands: number };
      limits: { timeoutMs: number; maxOutputBytes: number };
      configuredCommands: string[];
      executedCommands: string[];
    }>(cwd, ".krn/current/verify-result.json");

    expect(result).toMatchObject({
      profileName: "quality",
      status: "warn",
      summary: {
        totalCommands: 3,
        allowedCommands: 3,
        executedCommands: 0,
      },
      limits: {
        timeoutMs: 30000,
        maxOutputBytes: 4096,
      },
      configuredCommands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
      executedCommands: [],
    });

    const missingProfile = await runInCwd(cwd, ["verify", "--profile", "missing"]);
    expect(missingProfile).toMatchObject({ code: 0 });
    expect(missingProfile.stdout).toContain("KRN verify: blocked");
    await expect(readJson(cwd, ".krn/current/verify-result.json")).resolves.toMatchObject({
      profileName: "missing",
      status: "blocked",
      notRunnableReason: "Unknown verify profile: missing",
    });
  });

  it("runs allowlisted verify commands only when execute mode is explicit", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "pass.cjs"), 'process.stdout.write("cli-pass\\n");\n', "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      `${JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "unit",
            mode: "execute",
            profiles: {
              unit: {
                commands: [{ command: "node", args: ["pass.cjs"], label: "unit smoke" }],
                timeoutMs: 5000,
                maxOutputBytes: 100,
              },
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    await expect(runInCwd(cwd, ["start", "execute", "verify", "task"])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const recordOnly = await runInCwd(cwd, ["verify", "--profile", "unit"]);
    expect(recordOnly.stdout).toContain("KRN verify: warn");
    expect(recordOnly.stdout).toContain("mode: record-only");
    expect(recordOnly.stdout).toContain("executed: 0");

    const executed = await runInCwd(cwd, ["verify", "--profile", "unit", "--execute"]);
    expect(executed).toMatchObject({ code: 0 });
    expect(executed.stdout).toContain("KRN verify: pass");
    expect(executed.stdout).toContain("mode: execute");
    expect(executed.stdout).toContain("executed: 1");

    const result = await readJson<{
      status: string;
      mode: string;
      summary: { executedCommands: number };
      executedCommands: string[];
      commands: Array<{ status: string; exitCode: number; stdoutTail: string }>;
    }>(cwd, ".krn/current/verify-result.json");
    expect(result).toMatchObject({
      status: "pass",
      mode: "execute",
      summary: { executedCommands: 1 },
      executedCommands: ["node pass.cjs"],
      commands: [{ status: "passed", exitCode: 0, stdoutTail: "cli-pass\n" }],
    });

    await expect(readTraceEvents(cwd)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "verify.ran",
          data: expect.objectContaining({
            mode: "execute",
            status: "pass",
            executedCommands: 1,
          }),
        }),
      ]),
    );
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
      hooks: { status: string };
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
    expect(doctorMarkdown).toContain("Status: warn");
    expect(doctorJson.nextActions).toEqual([
      "Configure an allowed verify profile or run `krn verify --profile <name>`.",
    ]);
    expect(verifyJson).toMatchObject({
      graphArtifactPresent: true,
      currentRunTracePresent: true,
    });

    expect(evalJson).toMatchObject({
      status: "pass",
      passCount: 25,
      failCount: 0,
      graph: { status: "pass" },
      graphArtifact: { status: "pass" },
      downstream: { status: "pass" },
      verify: { status: "pass" },
      hooks: { status: "pass" },
      memory: { status: "pass" },
      trace: { status: "pass" },
      runTraceMode: "run-scoped",
    });
    expect(evalJson.fixtures.map((fixture) => fixture.name)).toEqual([
      "frontend-section-context",
      "stale-doc-trap",
      "missing-context-stop",
      "downstream-basic-package-context",
      "product-code-test-dogfood",
      "product-code-tax-dogfood",
    ]);
    expect(evalJson.fixtures.every((fixture) => fixture.status === "pass")).toBe(true);
    expect(evalMarkdown).toContain("### frontend-section-context");
    expect(evalMarkdown).toContain("## Graph Coverage");
    expect(evalMarkdown).toContain("## Downstream Acceptance");
    expect(evalMarkdown).toContain("## Verify Profiles");
    expect(evalMarkdown).toContain("## Hook Guardrails");
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
    expect(handoffMarkdown).toContain("Downstream acceptance: pass");
    expect(handoffMarkdown).toContain("Global trace: .krn/traces/trace.jsonl");
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
      { name: "doctor.ran", data: { status: "warn", checks: 22 } },
      {
        name: "eval.ran",
        data: {
          status: "pass",
          fixtures: 6,
          passCount: 25,
          failCount: 0,
          downstreamStatus: "pass",
          verifyStatus: "pass",
          hookStatus: "pass",
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
