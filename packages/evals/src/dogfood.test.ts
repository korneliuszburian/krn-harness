import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  type DogfoodRunRecord,
  type DogfoodTaskSpec,
  gradeDogfoodRun,
  loadDogfoodTaskSpec,
  renderDogfoodReport,
  skippedDogfoodRunRecord,
} from "./dogfood.js";

async function writeJson(cwd: string, relativePath: string, value: unknown): Promise<void> {
  const filePath = path.join(cwd, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeText(cwd: string, relativePath: string, value: string): Promise<void> {
  const filePath = path.join(cwd, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, value, "utf8");
}

async function writeTrace(cwd: string, taskId: string, names: string[]): Promise<void> {
  await writeJson(cwd, ".krn/current/run.json", {
    schemaVersion: 1,
    taskId,
    runDir: `.krn/runs/${taskId}`,
    tracePath: `.krn/runs/${taskId}/trace.jsonl`,
  });
  await writeText(
    cwd,
    `.krn/runs/${taskId}/trace.jsonl`,
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
  );
}

function task(overrides: Partial<DogfoodTaskSpec> = {}): DogfoodTaskSpec {
  return {
    id: "test-required-edit",
    prompt: "Change downstream source and test.",
    expectedTouchedFiles: ["src/index.ts", "src/index.test.ts"],
    forbiddenTouchedFiles: ["docs/stale.md"],
    expectedCommands: ["krn start", "krn context", "krn verify"],
    requiredArtifacts: [
      ".krn/current/task-contract.json",
      ".krn/current/context-package.json",
      ".krn/current/verify-result.json",
      ".krn/current/handoff.md",
    ],
    expectedVerifyStatus: "pass",
    handoffRequired: true,
    hooksExpected: true,
    expectedContextStop: false,
    ...overrides,
  };
}

function run(overrides: Partial<DogfoodRunRecord> = {}): DogfoodRunRecord {
  return {
    runId: "dogfood-run-1",
    mode: "krn-explicit-skill",
    taskId: "test-required-edit",
    codexAvailable: true,
    codexCommand: "codex exec --cd <tmp> --sandbox workspace-write --ask-for-approval never",
    startedAt: "2026-06-03T00:00:00.000Z",
    finishedAt: "2026-06-03T00:01:00.000Z",
    status: "pass",
    touchedFiles: ["src/index.ts", "src/index.test.ts"],
    forbiddenTouchedFiles: [],
    requiredArtifactsPresent: [
      ".krn/current/task-contract.json",
      ".krn/current/context-package.json",
      ".krn/current/verify-result.json",
      ".krn/current/handoff.md",
    ],
    krnCommandsObserved: ["krn start", "krn context", "krn verify"],
    hookTraceEvents: 1,
    verifyStatus: "pass",
    handoffPresent: true,
    notes: ["local fixture"],
    ...overrides,
  };
}

describe("dogfood eval artifacts", () => {
  it("grades a prepared KRN run from local artifacts without Codex", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", { id: "task-a" });
    await writeJson(cwd, ".krn/current/context-package.json", { stop: false });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "pass" });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-a", ["task.started", "context.built", "hook.received"]);

    const result = await gradeDogfoodRun({
      repoPath: cwd,
      task: task(),
      run: run(),
    });

    expect(result).toMatchObject({
      status: "pass",
      passCount: 10,
      failCount: 0,
      taskId: "test-required-edit",
      mode: "krn-explicit-skill",
    });
  });

  it("reports forbidden files, missing artifacts, missing hooks, and STOP mismatch", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/context-package.json", { stop: true });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "blocked" });

    const result = await gradeDogfoodRun({
      repoPath: cwd,
      task: task(),
      run: run({
        touchedFiles: ["src/index.ts", "docs/stale.md"],
        forbiddenTouchedFiles: ["docs/stale.md"],
        krnCommandsObserved: ["krn start"],
        hookTraceEvents: 0,
        verifyStatus: "blocked",
        handoffPresent: false,
      }),
    });

    expect(result.status).toBe("fail");
    expect(result.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "required-artifacts", status: "fail" }),
        expect.objectContaining({ name: "expected-touched-files", status: "fail" }),
        expect.objectContaining({ name: "forbidden-touched-files", status: "fail" }),
        expect.objectContaining({ name: "krn-command-compliance", status: "fail" }),
        expect.objectContaining({ name: "verify-status", status: "fail" }),
        expect.objectContaining({ name: "handoff", status: "fail" }),
        expect.objectContaining({ name: "current-run", status: "fail" }),
        expect.objectContaining({ name: "trace", status: "fail" }),
        expect.objectContaining({ name: "hook-trace", status: "fail" }),
        expect.objectContaining({ name: "context-stop", status: "fail" }),
      ]),
    );
  });

  it("renders a short baseline-vs-KRN dogfood report", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", { id: "task-a" });
    await writeJson(cwd, ".krn/current/context-package.json", { stop: false });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "pass" });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-a", ["task.started", "context.built", "hook.received"]);

    const spec = task();
    const record = run();
    const result = await gradeDogfoodRun({ repoPath: cwd, task: spec, run: record });
    const report = renderDogfoodReport({ run: record, task: spec, result });

    for (const heading of [
      "## Summary",
      "## Task",
      "## Mode",
      "## Codex Availability",
      "## KRN Command Compliance",
      "## Artifacts",
      "## Hooks",
      "## Verify",
      "## Handoff",
      "## Touched Files",
      "## Forbidden File Violations",
      "## Notes",
      "## Verdict",
    ]) {
      expect(report).toContain(heading);
    }
    expect(report).toContain("Verdict: pass");
    expect(report).toContain("hook.received events: 1");
  });

  it("loads dogfood task specs and represents skipped Codex runs", async () => {
    const spec = await loadDogfoodTaskSpec(
      path.join(process.cwd(), "fixtures/dogfood/tasks/package-owned-source-test.json"),
    );
    const skipped = skippedDogfoodRunRecord({
      runId: "dogfood-skip",
      mode: "krn-implicit-skill",
      taskId: spec.id,
      startedAt: "2026-06-03T00:00:00.000Z",
      finishedAt: "2026-06-03T00:00:00.000Z",
      note: "codex CLI not available",
    });

    expect(spec).toMatchObject({
      id: "package-owned-source-test",
      expectedTouchedFiles: ["src/index.ts", "src/index.test.ts"],
      expectedVerifyStatus: "pass",
    });
    expect(skipped).toMatchObject({
      status: "skipped",
      codexAvailable: false,
      hookTraceEvents: 0,
      notes: ["codex CLI not available"],
    });
  });
});
