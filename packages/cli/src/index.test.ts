import { mkdtemp, readFile } from "node:fs/promises";
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

async function readTraceEvents(cwd: string): Promise<TraceEventFixture[]> {
  const raw = await readFile(path.join(cwd, ".krn", "traces", "trace.jsonl"), "utf8");
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as TraceEventFixture);
}

async function readJson<T>(cwd: string, relativePath: string): Promise<T> {
  return JSON.parse(await readFile(path.join(cwd, relativePath), "utf8")) as T;
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
    expect(result.stdout).toContain("krn status");
  });

  it("runs status and writes a trace event", async () => {
    const result = await runInTemp(["status"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN status: ready");
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([{ name: "cli.status" }]);
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
    expect(pkg.stopReason).toBe(
      "Required context is missing: fixtures/repos/missing-context-stop/docs/required-context.md",
    );
    expect(pkg.buckets.missingContext).toEqual([
      {
        path: "fixtures/repos/missing-context-stop/docs/required-context.md",
        reason: "Required fixture context is absent",
        priority: 100,
        bucket: "missing-context",
        status: "missing",
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
      configuredCommands: [],
      executedCommands: [],
      notRunnableReason: "No verify commands are configured",
      checks: [
        {
          name: "configured-commands",
          status: "warn",
          detail: "No verify commands are configured",
        },
      ],
    });
    expect(verifyMarkdown).toContain("Status: not-runnable");
    expect(handoffMarkdown).toContain("Task ID: task-d62ea4fbc009");
    expect(handoffMarkdown).toContain("Context STOP: false");
    expect(handoffMarkdown).toContain("Status: not-runnable");

    await expect(readTraceEvents(start.cwd)).resolves.toMatchObject([
      { name: "task.started", taskId: "task-d62ea4fbc009" },
      { name: "context.built", taskId: "task-d62ea4fbc009", data: { stop: false } },
      {
        name: "verify.ran",
        taskId: "task-d62ea4fbc009",
        data: { status: "not-runnable", contextStop: false, configuredCommands: 0 },
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
      notRunnableReason:
        "Required context is missing: fixtures/repos/missing-context-stop/docs/required-context.md",
    });
    expect(handoffMarkdown).toContain("Context STOP: true");
    expect(handoffMarkdown).toContain(
      "STOP reason: Required context is missing: fixtures/repos/missing-context-stop/docs/required-context.md",
    );
    expect(handoffMarkdown).toContain("Status: blocked");
  });
});
