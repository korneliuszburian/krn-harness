import { access, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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
    ambientKrnCommandPath: null,
    krnCommandPath: "/tmp/krn-dogfood-bin/krn",
    krnIdentity:
      "schema: krn-harness-cli-identity-v1\npackage: @krn-harness/cli\nrequired_commands_present: true\n",
    krnIdentityValid: true,
    globalKrnFallbackUsed: false,
    krnCommandsObserved: ["krn start", "krn context", "krn verify"],
    hookTraceEvents: 1,
    hookEvidenceSource: "unknown",
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
      passCount: 11,
      failCount: 0,
      taskId: "test-required-edit",
      mode: "krn-explicit-skill",
    });
  });

  it("fails KRN runs with missing or invalid CLI identity", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", { id: "task-a" });
    await writeJson(cwd, ".krn/current/context-package.json", { stop: false });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "pass" });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-a", ["task.started", "context.built", "hook.received"]);

    const result = await gradeDogfoodRun({
      repoPath: cwd,
      task: task(),
      run: run({
        krnCommandPath: "/home/krn/.local/bin/krn",
        krnIdentity: "some other cli",
        krnIdentityValid: false,
      }),
    });

    expect(result.status).toBe("fail");
    expect(result.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "krn-cli-identity", status: "fail" }),
      ]),
    );
  });

  it("does not require KRN CLI identity for baseline runs", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", { id: "task-a" });
    await writeJson(cwd, ".krn/current/context-package.json", { stop: false });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "pass" });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-a", ["task.started", "context.built", "hook.received"]);

    const result = await gradeDogfoodRun({
      repoPath: cwd,
      task: task(),
      run: run({
        mode: "baseline",
        krnCommandPath: null,
        krnIdentity: null,
        krnIdentityValid: false,
      }),
    });

    expect(result.status).toBe("pass");
    expect(result.grades.some((item) => item.name === "krn-cli-identity")).toBe(false);
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

  it("grades realistic dogfood evidence beyond self-report fields", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", {
      id: "task-wp",
      intentQuality: "high",
      intentWarnings: [],
    });
    await writeJson(cwd, ".krn/current/context-package.json", {
      stop: false,
      buckets: {
        doNotUse: [{ path: "docs/stale-acf-notes.md" }, { path: "acf/legacy_group.json" }],
      },
    });
    await writeJson(cwd, ".krn/current/verify-result.json", {
      status: "pass",
      mode: "execute",
      summary: { executedCommands: 1 },
    });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n\nStatus: pass\nMode: execute\n");
    await writeTrace(cwd, "task-wp", [
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "handoff.created",
    ]);

    const result = await gradeDogfoodRun({
      repoPath: cwd,
      task: task({
        id: "wp-acf-field-mapping",
        expectedTouchedFiles: ["acf/group_hero.json", "tests/theme.test.js"],
        expectedUntouchedFiles: ["docs/stale-acf-notes.md"],
        forbiddenTouchedFiles: ["docs/stale-acf-notes.md"],
        expectedCommands: ["krn start", "krn graph", "krn context", "krn verify --execute"],
        requiredDoNotUsePaths: ["docs/stale-acf-notes.md", "acf/legacy_group.json"],
        requiredTraceEvents: ["task.started", "graph.built", "context.built", "verify.ran"],
        expectedVerifyMode: "execute",
        minExecutedCommands: 1,
        minTaskIntentQuality: "medium",
        requireHandoffContent: ["Status: pass", "Mode: execute"],
        hooksExpected: false,
      }),
      run: run({
        taskId: "wp-acf-field-mapping",
        touchedFiles: ["acf/group_hero.json", "tests/theme.test.js"],
        forbiddenTouchedFiles: [],
        krnCommandsObserved: ["krn start", "krn graph", "krn context", "krn verify --execute"],
        hookTraceEvents: 0,
      }),
    });

    expect(result.status).toBe("pass");
    expect(result.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "expected-untouched-files", status: "pass" }),
        expect.objectContaining({ name: "verify-mode", status: "pass" }),
        expect.objectContaining({ name: "verify-executed-commands", status: "pass" }),
        expect.objectContaining({ name: "handoff-content", status: "pass" }),
        expect.objectContaining({ name: "trace-events", status: "pass" }),
        expect.objectContaining({ name: "context-do-not-use", status: "pass" }),
        expect.objectContaining({ name: "task-spec-do-not-use-paths", status: "pass" }),
        expect.objectContaining({ name: "task-intent-quality", status: "pass" }),
      ]),
    );
  });

  it("separates low task intent from context do-not-use failures", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", {
      id: "task-wp",
      intentQuality: "low",
      intentWarnings: [
        "Task intent looks like a slug or task id; pass the full user intent to krn start.",
      ],
    });
    await writeJson(cwd, ".krn/current/context-package.json", {
      stop: false,
      buckets: {
        doNotUse: [{ path: "docs/stale-acf-notes.md" }],
      },
    });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "pass" });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-wp", ["task.started", "context.built"]);

    const result = await gradeDogfoodRun({
      repoPath: cwd,
      task: task({
        id: "wp-acf-field-mapping",
        requiredDoNotUsePaths: ["docs/stale-acf-notes.md", "acf/legacy_group.json"],
        minTaskIntentQuality: "medium",
        hooksExpected: false,
      }),
      run: run({
        taskId: "wp-acf-field-mapping",
        hookTraceEvents: 0,
      }),
    });

    expect(result.status).toBe("fail");
    expect(result.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "context-do-not-use", status: "fail" }),
        expect.objectContaining({ name: "task-intent-quality", status: "fail" }),
      ]),
    );
  });

  it("separates missing task-spec do-not-use requirements from context failures", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", {
      id: "task-wp",
      intentQuality: "high",
      intentWarnings: [],
    });
    await writeJson(cwd, ".krn/current/context-package.json", {
      stop: false,
      buckets: { doNotUse: [] },
    });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "pass" });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-wp", ["task.started", "context.built"]);

    const result = await gradeDogfoodRun({
      repoPath: cwd,
      task: task({
        id: "wp-acf-field-mapping",
        requiredDoNotUsePaths: undefined,
        minTaskIntentQuality: "medium",
        hooksExpected: false,
      }),
      run: run({
        taskId: "wp-acf-field-mapping",
        hookTraceEvents: 0,
      }),
    });

    expect(result.status).toBe("fail");
    expect(result.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "task-spec-do-not-use-paths", status: "fail" }),
        expect.objectContaining({ name: "task-intent-quality", status: "pass" }),
      ]),
    );
    expect(result.grades.some((item) => item.name === "context-do-not-use")).toBe(false);
  });

  it("fails when executable verification is required but verify stayed record-only", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", { id: "task-wp" });
    await writeJson(cwd, ".krn/current/context-package.json", { stop: false });
    await writeJson(cwd, ".krn/current/verify-result.json", {
      status: "warn",
      mode: "record",
      summary: { executedCommands: 0 },
    });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-wp", ["task.started", "context.built", "verify.ran"]);

    const result = await gradeDogfoodRun({
      repoPath: cwd,
      task: task({
        expectedCommands: ["krn verify --execute"],
        expectedVerifyStatus: "pass",
        expectedVerifyMode: "execute",
        minExecutedCommands: 1,
        hooksExpected: false,
      }),
      run: run({
        krnCommandsObserved: ["krn verify"],
        verifyStatus: "warn",
        hookTraceEvents: 0,
      }),
    });

    expect(result.status).toBe("fail");
    expect(result.grades).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "krn-command-compliance", status: "fail" }),
        expect.objectContaining({ name: "verify-status", status: "fail" }),
        expect.objectContaining({ name: "verify-mode", status: "fail" }),
        expect.objectContaining({ name: "verify-executed-commands", status: "fail" }),
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
      "## Run Validity",
      "## KRN Command Compliance",
      "## KRN CLI Identity",
      "## Evidence Artifacts",
      "## Context Quality",
      "## Hook Status",
      "## Verify",
      "## Handoff",
      "## Touched Files",
      "## Forbidden File Safety",
      "## Notes",
      "## Verdict",
    ]) {
      expect(report).toContain(heading);
    }
    expect(report).toContain("Verdict: pass");
    expect(report).toContain("Run validity: valid");
    expect(report).toContain("Command path: /tmp/krn-dogfood-bin/krn");
    expect(report).toContain("Global differs from pinned: unknown");
    expect(report).toContain("Global fallback used: false");
    expect(report).toContain("schema: krn-harness-cli-identity-v1");
    expect(report).toContain("Trace path: .krn/runs/task-a/trace.jsonl");
    expect(report).toContain("Missing required artifacts:\n- none");
    expect(report).toContain("STOP: false");
    expect(report).toContain("hook.received events: 1");
    expect(report).toContain("real non-bypass Codex provenance is not recorded");
  });

  it("renders invalid KRN identity and global fallback evidence clearly", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", { id: "task-a" });
    await writeJson(cwd, ".krn/current/context-package.json", { stop: false });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "pass" });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-a", ["task.started", "context.built"]);

    const spec = task({ hooksExpected: false });
    const record = run({
      ambientKrnCommandPath: "/home/krn/.local/bin/krn",
      krnCommandPath: "/home/krn/.local/bin/krn",
      krnIdentity: "not the harness cli",
      krnIdentityValid: false,
      globalKrnFallbackUsed: true,
      hookTraceEvents: 0,
    });
    const result = await gradeDogfoodRun({ repoPath: cwd, task: spec, run: record });
    const report = renderDogfoodReport({ run: record, task: spec, result });

    expect(result.status).toBe("fail");
    expect(report).toContain("Run validity: invalid");
    expect(report).toContain("Global fallback used: true");
    expect(report).toContain("global krn fallback was used");
    expect(report).toContain("missing krn-harness-cli-identity-v1 marker");
    expect(report).toContain("missing @krn-harness/cli marker");
    expect(report).toContain("missing required_commands_present: true marker");
  });

  it("renders hook status as unproven when no hook trace exists", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-dogfood-"));
    await writeJson(cwd, ".krn/current/task-contract.json", { id: "task-a" });
    await writeJson(cwd, ".krn/current/context-package.json", { stop: false });
    await writeJson(cwd, ".krn/current/verify-result.json", { status: "pass" });
    await writeText(cwd, ".krn/current/handoff.md", "# Handoff\n");
    await writeTrace(cwd, "task-a", ["task.started", "context.built"]);

    const spec = task({ hooksExpected: false });
    const record = run({ hookTraceEvents: 0 });
    const result = await gradeDogfoodRun({ repoPath: cwd, task: spec, run: record });
    const report = renderDogfoodReport({ run: record, task: spec, result });

    expect(report).toContain("hook.received events: 0");
    expect(report).toContain("Status: unproven: no hook.received events recorded");
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

  it("keeps WordPress ACF dogfood task specs deterministic and fixture-backed", async () => {
    const repoRoot = process.cwd();
    const indexPath = path.join(repoRoot, "fixtures/dogfood/tasks/wp-acf-theme-index.json");
    const index = JSON.parse(await readFile(indexPath, "utf8")) as {
      fixtureRepo: string;
      tasks: string[];
    };
    const fixtureRoot = path.join(repoRoot, index.fixtureRepo);

    expect(index).toEqual({
      fixtureRepo: "fixtures/repos/wordpress-acf-theme",
      tasks: [
        "wp-acf-hero-copy",
        "wp-acf-field-mapping",
        "wp-css-token-change",
        "wp-js-data-attribute",
        "wp-stale-doc-trap",
        "wp-missing-context-stop",
        "wp-package-owned-source-test",
        "wp-handoff-required",
      ],
    });

    for (const taskId of index.tasks) {
      const spec = await loadDogfoodTaskSpec(
        path.join(repoRoot, "fixtures/dogfood/tasks", `${taskId}.json`),
      );

      expect(spec.id).toBe(taskId);
      expect(spec.prompt.length).toBeGreaterThan(20);
      expect(spec.requiredArtifacts).toContain(".krn/current/task-contract.json");
      expect(spec.requiredArtifacts).toContain(".krn/current/context-package.json");
      expect(spec.expectedCommands).toContain("krn start");
      expect(spec.expectedCommands).toContain("krn context");
      expect(["pass", "blocked"]).toContain(spec.expectedVerifyStatus);

      if (spec.expectedVerifyStatus === "pass") {
        expect(spec.expectedCommands).toContain("krn verify --execute");
        expect(spec.requiredArtifacts).toContain(".krn/current/verify-result.json");
      }

      if (spec.handoffRequired) {
        expect(spec.expectedCommands).toContain("krn handoff");
        expect(spec.requiredArtifacts).toContain(".krn/current/handoff.md");
      }

      for (const relativePath of [...spec.expectedTouchedFiles, ...spec.forbiddenTouchedFiles]) {
        expect(await fileExists(path.join(fixtureRoot, relativePath)), relativePath).toBe(true);
      }
    }
  });
});
