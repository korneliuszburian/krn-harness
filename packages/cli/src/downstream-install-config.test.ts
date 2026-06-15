import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixtureRepo,
  expectDirectory,
  expectFile,
  readJson,
  readRunTraceEvents,
  readTraceEvents,
  runInCwd,
  runInTemp,
  supportedP0CodexHookEvents,
} from "./cli-test-utils.js";

describe("krn CLI downstream install config", () => {
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
      "package-conventions",
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
    expect(install.stdout).toContain("created: 11");
    expect(install.stdout).toContain("skipped: 0");

    await expectDirectory(install.cwd, ".krn/current");
    await expectDirectory(install.cwd, ".krn/graph");
    await expectDirectory(install.cwd, ".krn/traces");
    await expectDirectory(install.cwd, ".krn/runs");
    await expectDirectory(install.cwd, ".krn/memory");
    await expectDirectory(install.cwd, ".krn/bin");
    await expectFile(install.cwd, ".krn/bin/krn");
    await expectFile(install.cwd, ".krn/current/install-result.json");
    await expectFile(install.cwd, ".krn/current/install-result.md");

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
    expect(agents).toContain("KRN-HARNESS-MANAGED:v1");
    expect(agents).toContain("krn start");
    expect(agents).toContain("STOP");
    expect(agents.length).toBeLessThan(2200);
    expect(agents).not.toContain("Architecture Spec");
    for (const event of supportedP0CodexHookEvents) {
      expect(hooks.hooks[event]?.[0]?.hooks[0]?.command).toBe(`./.krn/bin/krn hook codex ${event}`);
    }
    expect((hooks as { _krnManaged?: string })._krnManaged).toBe("KRN-HARNESS-MANAGED:v1");
    expect(runtimeSkill).toContain("krn status");
    expect(runtimeSkill).toContain("KRN-HARNESS-MANAGED:v1");
    expect(runtimeSkill).toContain("krn start");
    expect(runtimeSkill).toContain("krn context");
    expect(runtimeSkill).toContain("krn verify");
    expect(runtimeSkill).toContain("krn handoff");
    expect(runtimeSkill.length).toBeLessThan(1600);
    expect(runtimeSkill).not.toContain("Architecture Spec");

    await expect(readTraceEvents(install.cwd)).resolves.toMatchObject([
      {
        name: "install.ran",
        data: {
          status: "installed",
          created: 11,
          skipped: 0,
          reason: null,
          actions: [
            { path: ".krn/current", kind: "directory", status: "created" },
            { path: ".krn/graph", kind: "directory", status: "created" },
            { path: ".krn/traces", kind: "directory", status: "created" },
            { path: ".krn/runs", kind: "directory", status: "created" },
            { path: ".krn/memory", kind: "directory", status: "created" },
            { path: ".krn/bin", kind: "directory", status: "created" },
            { path: "krn.config.json", kind: "file", status: "created" },
            { path: "AGENTS.md", kind: "file", status: "created" },
            { path: ".krn/bin/krn", kind: "file", status: "created" },
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
    expect(secondInstall.stdout).toContain("skipped: 11");
    await expect(readTraceEvents(install.cwd)).resolves.toMatchObject([
      { name: "install.ran" },
      {
        name: "install.ran",
        data: {
          status: "installed",
          created: 0,
          skipped: 11,
          reason: null,
          actions: [
            { path: ".krn/current", kind: "directory", status: "skipped" },
            { path: ".krn/graph", kind: "directory", status: "skipped" },
            { path: ".krn/traces", kind: "directory", status: "skipped" },
            { path: ".krn/runs", kind: "directory", status: "skipped" },
            { path: ".krn/memory", kind: "directory", status: "skipped" },
            { path: ".krn/bin", kind: "directory", status: "skipped" },
            { path: "krn.config.json", kind: "file", status: "skipped" },
            { path: "AGENTS.md", kind: "file", status: "skipped" },
            { path: ".krn/bin/krn", kind: "file", status: "skipped" },
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
          detail: "AGENTS.md is present; downstream guidance may be project-owned",
        }),
        expect.objectContaining({
          name: "downstream-runtime-skill",
          status: "pass",
          detail: ".agents/skills/krn-harness/SKILL.md is present and routes through the KRN CLI",
        }),
        expect.objectContaining({
          name: "downstream-hooks-template",
          status: "pass",
          detail: ".codex/hooks.json covers 7 P0 Codex hook event(s)",
        }),
      ]),
    );
  });

  it("plans install without writing files in dry-run mode", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const result = await runInCwd(cwd, ["install", "--dry-run", "--json"]);
    const plan = JSON.parse(result.stdout) as {
      schema: string;
      dryRun: boolean;
      status: string;
      actions: Array<{ path: string; status: string }>;
    };

    expect(result.code).toBe(0);
    expect(plan.schema).toBe("krn-install-result-v1");
    expect(plan.dryRun).toBe(true);
    expect(plan.status).toBe("planned");
    expect(plan.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "AGENTS.md", status: "would-create" }),
        expect.objectContaining({ path: ".codex/hooks.json", status: "would-create" }),
        expect.objectContaining({ path: ".krn/bin/krn", status: "would-create" }),
      ]),
    );
    await expect(stat(path.join(cwd, ".krn"))).rejects.toThrow();
    await expect(stat(path.join(cwd, "AGENTS.md"))).rejects.toThrow();
  });

  it("uninstalls only managed files and preserves runtime evidence", async () => {
    const install = await runInTemp(["install"]);
    await writeFile(
      path.join(install.cwd, ".krn", "current", "operator-report.json"),
      "{}",
      "utf8",
    );

    const dryRun = await runInCwd(install.cwd, ["uninstall", "--dry-run", "--json"]);
    const dryRunPlan = JSON.parse(dryRun.stdout) as {
      schema: string;
      dryRun: boolean;
      candidates: Array<{ path: string; status: string }>;
      refused: Array<{ path: string; reason: string }>;
      preserved: string[];
    };

    expect(dryRun.code).toBe(0);
    expect(dryRunPlan.schema).toBe("krn-uninstall-result-v1");
    expect(dryRunPlan.dryRun).toBe(true);
    expect(dryRunPlan.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "AGENTS.md", status: "would-remove" }),
        expect.objectContaining({ path: ".codex/hooks.json", status: "would-remove" }),
        expect.objectContaining({
          path: ".agents/skills/krn-harness/SKILL.md",
          status: "would-remove",
        }),
        expect.objectContaining({ path: ".krn/bin/krn", status: "would-remove" }),
      ]),
    );
    expect(dryRunPlan.refused).toEqual([]);
    expect(dryRunPlan.preserved).toContain(".krn/current");
    await expectFile(install.cwd, "AGENTS.md");

    const confirmed = await runInCwd(install.cwd, ["uninstall", "--confirm", "--json"]);
    const result = JSON.parse(confirmed.stdout) as { status: string; removed: number };
    expect(confirmed.code).toBe(0);
    expect(result).toMatchObject({ status: "uninstalled", removed: 4 });
    await expect(stat(path.join(install.cwd, "AGENTS.md"))).rejects.toThrow();
    await expect(stat(path.join(install.cwd, ".codex", "hooks.json"))).rejects.toThrow();
    await expect(stat(path.join(install.cwd, ".krn", "bin", "krn"))).rejects.toThrow();
    await expectFile(install.cwd, ".krn/current/operator-report.json");
    await expectFile(install.cwd, ".krn/current/uninstall-result.json");
  });

  it("refuses to uninstall user-owned files without a managed marker", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "AGENTS.md"), "# User instructions\n", "utf8");

    const result = await runInCwd(cwd, ["uninstall", "--dry-run", "--json"]);
    const plan = JSON.parse(result.stdout) as {
      candidates: Array<{ path: string }>;
      refused: Array<{ path: string; reason: string }>;
    };

    expect(result.code).toBe(0);
    expect(plan.candidates).toEqual([]);
    expect(plan.refused).toEqual([
      expect.objectContaining({
        path: "AGENTS.md",
        reason: expect.stringContaining("no KRN managed marker"),
      }),
    ]);
    await expect(readFile(path.join(cwd, "AGENTS.md"), "utf8")).resolves.toBe(
      "# User instructions\n",
    );
  });

  it("validates config and initializes safe starter profiles", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const missing = await runInCwd(cwd, ["config", "doctor", "--json"]);
    const missingReport = JSON.parse(missing.stdout) as { status: string; source: string };
    expect(missing.code).toBe(0);
    expect(missingReport).toMatchObject({ status: "warn", source: "default" });

    const dryRun = await runInCwd(cwd, [
      "config",
      "init",
      "--dry-run",
      "--profile",
      "readonly-python",
      "--json",
    ]);
    const initPlan = JSON.parse(dryRun.stdout) as {
      status: string;
      dryRun: boolean;
      profile: string;
      config: { verify?: { defaultProfile?: string; timeoutMs?: number } };
    };
    expect(initPlan).toMatchObject({
      status: "planned",
      dryRun: true,
      profile: "readonly-python",
    });
    expect(initPlan.config.verify?.defaultProfile).toBe("readonly");
    expect(initPlan.config.verify?.timeoutMs).toBe(360_000);
    await expect(stat(path.join(cwd, "krn.config.json"))).rejects.toThrow();

    const write = await runInCwd(cwd, [
      "config",
      "init",
      "--write",
      "--profile",
      "readonly-python",
    ]);
    expect(write.code).toBe(0);
    await expectFile(cwd, "krn.config.json");

    const doctor = await runInCwd(cwd, ["config", "doctor", "--json"]);
    const doctorReport = JSON.parse(doctor.stdout) as {
      status: string;
      source: string;
      commands: Array<{ command: string; allowed: boolean }>;
    };
    expect(doctor.code).toBe(0);
    expect(doctorReport).toMatchObject({ status: "pass", source: "file" });
    expect(doctorReport.commands).toEqual([
      { command: "python3 tools/check_all_readonly.py", allowed: true },
    ]);

    const overwrite = await runInCwd(cwd, ["config", "init", "--write", "--json"]);
    expect(overwrite.code).toBe(1);
    expect(JSON.parse(overwrite.stdout)).toMatchObject({ status: "blocked" });
  });

  it("fails config doctor on unsafe verify commands", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(
      path.join(cwd, "krn.config.json"),
      JSON.stringify({
        version: 1,
        verify: {
          commands: ["pnpm test && rm -rf .krn"],
        },
      }),
      "utf8",
    );

    const result = await runInCwd(cwd, ["config", "doctor", "--json"]);
    const report = JSON.parse(result.stdout) as {
      status: string;
      commands: Array<{ allowed: boolean; reason?: string }>;
    };
    expect(result.code).toBe(1);
    expect(report.status).toBe("fail");
    expect(report.commands).toEqual([
      expect.objectContaining({
        allowed: false,
        reason: "shell syntax is not allowed",
      }),
    ]);
  });

  it("preserves existing downstream instructions during install", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "AGENTS.md"), "# Existing Instructions\n", "utf8");
    await mkdir(path.join(cwd, ".codex"), { recursive: true });
    await writeFile(path.join(cwd, ".codex/hooks.json"), '{\n  "hooks": {}\n}\n', "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      '{\n  "version": 1,\n  "runtime": {\n    "dir": ".custom-krn"\n  }\n}\n',
      "utf8",
    );

    const install = await runInCwd(cwd, ["install"]);

    expect(install.code).toBe(0);
    expect(install.stdout).toContain("- skipped AGENTS.md: existing file preserved");
    expect(install.stdout).toContain("- skipped krn.config.json: existing file preserved");
    expect(install.stdout).toContain("- skipped .codex/hooks.json: existing file preserved");
    await expect(readFile(path.join(cwd, "AGENTS.md"), "utf8")).resolves.toBe(
      "# Existing Instructions\n",
    );
    await expect(readJson(cwd, ".codex/hooks.json")).resolves.toEqual({
      hooks: {},
    });
    await expect(readJson(cwd, "krn.config.json")).resolves.toEqual({
      version: 1,
      runtime: {
        dir: ".custom-krn",
      },
    });
  });

  it("runs the downstream-basic acceptance loop on a temp fixture copy", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");

    await expect(runInCwd(cwd, ["install"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["status"])).resolves.toMatchObject({ code: 0 });
    const start = await runInCwd(cwd, [
      "start",
      "Harden",
      "downstream",
      "basic",
      "fixture",
      "context",
    ]);
    expect(start).toMatchObject({ code: 0 });

    const contract = await readJson<{ id: string; task: string }>(
      cwd,
      ".krn/current/task-contract.json",
    );
    await expect(runInCwd(cwd, ["graph"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });
    const contextJson = await readJson<{
      stop: boolean;
      bucketSummaries: {
        mustRead: { totalItems: number; hiddenFromMarkdown: number };
        shouldRead: { totalItems: number; hiddenFromMarkdown: number };
        referenceOnly: { totalItems: number; hiddenFromMarkdown: number };
        doNotUse: { totalItems: number; hiddenFromMarkdown: number };
      };
      compactness: {
        totalItems: number;
        markdownVisibleItems: number;
        markdownHiddenItems: number;
      };
      overInclusion: {
        risk: string;
        score: number;
        reasons: string[];
      };
      buckets: {
        mustRead: Array<{
          path: string;
          selector?: string;
          operatorMessage?: string;
        }>;
        shouldRead: Array<{
          path: string;
          selector?: string;
          relationKind?: string;
          operatorMessage?: string;
        }>;
        referenceOnly: Array<{
          path: string;
          selector?: string;
          operatorMessage?: string;
        }>;
        doNotUse: Array<{
          path: string;
          selector?: string;
        }>;
      };
    }>(cwd, ".krn/current/context-package.json");
    const contextMarkdown = await readFile(
      path.join(cwd, ".krn/current/context-package.md"),
      "utf8",
    );
    expect(contextJson.stop).toBe(false);
    expect(contextJson.bucketSummaries).toMatchObject({
      mustRead: { totalItems: 2, hiddenFromMarkdown: 0 },
      shouldRead: { totalItems: 4, hiddenFromMarkdown: 0 },
      referenceOnly: { totalItems: 3, hiddenFromMarkdown: 0 },
      doNotUse: { totalItems: 1, hiddenFromMarkdown: 0 },
    });
    expect(contextJson.compactness).toMatchObject({
      totalItems: 10,
      markdownVisibleItems: 10,
      markdownHiddenItems: 0,
    });
    expect(contextJson.overInclusion).toMatchObject({
      risk: "low",
      score: 3,
      reasons: ["within-p0-budget"],
    });
    expect(contextJson.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "src/index.ts",
        selector: "package-owned-source",
        operatorMessage: "Read source owned by the matched package.",
      }),
    );
    expect(contextJson.buckets.shouldRead).toContainEqual(
      expect.objectContaining({
        path: "src/index.test.ts",
        selector: "tests-source-for-owned-source",
        relationKind: "tests-source",
        operatorMessage: "Review the paired test for the selected source.",
      }),
    );
    expect(contextJson.buckets.shouldRead).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "krn.config.json",
          selector: "package-owned-config",
        }),
        expect.objectContaining({
          path: "package.json",
          selector: "package-owned-config",
        }),
      ]),
    );
    expect(contextJson.buckets.referenceOnly).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "README.md",
          selector: "package-owned-doc",
          operatorMessage: "Use package docs as reference; code remains source of truth.",
        }),
        expect.objectContaining({
          path: "docs/overview.md",
          selector: "package-owned-doc",
        }),
      ]),
    );
    expect(contextJson.buckets.doNotUse).toContainEqual(
      expect.objectContaining({
        path: "docs/stale.md",
      }),
    );
    expect(
      contextJson.buckets.mustRead
        .map((item) => item.path)
        .some((item) => item.startsWith("fixtures/repos/")),
    ).toBe(false);
    expect(contextMarkdown).toContain("Read source owned by the matched package.");
    expect(contextMarkdown).toContain("Items: 10 total, 10 shown, 0 hidden from markdown");
    expect(contextMarkdown).toContain("Summary: 2 total, showing 2/8, hidden 0");
    expect(contextMarkdown).toContain("selector: tests-source-for-owned-source");

    const sessionStart = await runInCwd(cwd, ["hook", "codex", "SessionStart"]);
    expect(sessionStart).toMatchObject({ code: 0 });
    expect(JSON.parse(sessionStart.stdout)).toMatchObject({
      event: "SessionStart",
      decision: "allow",
      status: "ok",
      enforced: false,
    });
    const hook = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({ tool: "Read", filePath: "src/index.ts" }),
    });
    expect(hook).toMatchObject({ code: 0 });
    expect(JSON.parse(hook.stdout)).toMatchObject({
      event: "PreToolUse",
      decision: "allow",
      status: "ok",
      enforced: false,
    });
    const outOfScopeHook = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({ toolName: "Write", filePath: "src/out-of-scope.ts" }),
    });
    expect(outOfScopeHook).toMatchObject({ code: 0 });
    expect(JSON.parse(outOfScopeHook.stdout)).toMatchObject({
      event: "PreToolUse",
      decision: "block",
      status: "blocked",
      enforced: false,
      findings: [expect.objectContaining({ code: "out-of-scope-edit" })],
    });

    await expect(runInCwd(cwd, ["verify"])).resolves.toMatchObject({ code: 0 });
    const executeVerify = await runInCwd(cwd, ["verify", "--execute"]);
    expect(executeVerify).toMatchObject({ code: 0 });
    expect(executeVerify.stdout).toContain("KRN verify: pass");
    await expect(readJson(cwd, ".krn/current/verify-result.json")).resolves.toMatchObject({
      status: "pass",
      mode: "execute",
      summary: { executedCommands: 1 },
      executedCommands: ["node src/index.test.ts"],
    });
    await expect(runInCwd(cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });
    const doctor = await runInCwd(cwd, ["doctor"]);
    const evalResult = await runInCwd(cwd, ["eval"]);

    expect(doctor).toMatchObject({ code: 0 });
    expect(evalResult).toMatchObject({ code: 0 });
    const handoffMarkdown = await readFile(path.join(cwd, ".krn/current/handoff.md"), "utf8");
    expect(handoffMarkdown).toContain("## Install\n\nStatus: present");
    expect(handoffMarkdown).toContain("Profile: unit");
    expect(handoffMarkdown).toContain("Mode: execute");
    expect(handoffMarkdown).toContain("Commands: total 1, blocked 0, executed 1");
    await expectFile(cwd, "krn.config.json");
    await expectFile(cwd, "AGENTS.md");
    await expectFile(cwd, ".codex/hooks.json");
    await expectFile(cwd, ".agents/skills/krn-harness/SKILL.md");
    await expectFile(cwd, ".krn/current/handoff.md");
    await expectFile(cwd, ".krn/current/doctor-result.json");
    await expectFile(cwd, ".krn/current/eval-result.json");
    await expectFile(cwd, ".krn/current/verify-result.json");
    await expectFile(cwd, ".krn/graph/repo-graph.json");
    await expectFile(cwd, ".krn/traces/trace.jsonl");
    await expectFile(cwd, `.krn/runs/${contract.id}/trace.jsonl`);
    await expectFile(cwd, `.krn/runs/${contract.id}/run.json`);

    const doctorJson = await readJson<{
      checks: Array<{ name: string; status: string; detail: string }>;
    }>(cwd, ".krn/current/doctor-result.json");
    expect(doctorJson.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "downstream-agents", status: "pass" }),
        expect.objectContaining({ name: "downstream-runtime-skill", status: "pass" }),
        expect.objectContaining({ name: "downstream-hooks-template", status: "pass" }),
      ]),
    );

    const evalJson = await readJson<{
      status: string;
      downstream?: { status: string };
    }>(cwd, ".krn/current/eval-result.json");
    expect(evalJson).toMatchObject({
      status: "pass",
      downstream: { status: "pass" },
    });

    expect((await readTraceEvents(cwd)).map((event) => event.name)).toEqual([
      "install.ran",
      "cli.status",
      "task.started",
      "graph.built",
      "context.built",
      "hook.received",
      "hook.received",
      "hook.received",
      "verify.ran",
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
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
    ]);
  });

  it("runs product-code dogfood fixture with paired test and stale-doc guard", async () => {
    const cwd = await copyFixtureRepo("product-code-dogfood");
    await mkdir(path.join(cwd, "fixtures", "dogfood", "tasks"), { recursive: true });
    await writeFile(
      path.join(cwd, "fixtures", "dogfood", "tasks", "product-code-test-dogfood.json"),
      await readFile(
        path.join(process.cwd(), "fixtures", "dogfood", "tasks", "product-code-test-dogfood.json"),
        "utf8",
      ),
      "utf8",
    );

    spawnSync("git", ["init", "-q"], { cwd, encoding: "utf8" });
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });
    spawnSync(
      "git",
      [
        "-c",
        "user.email=krn@example.invalid",
        "-c",
        "user.name=KRN Test",
        "commit",
        "-q",
        "-m",
        "fixture baseline",
      ],
      { cwd, encoding: "utf8" },
    );

    await expect(
      runInCwd(cwd, [
        "start",
        "--task-spec",
        "fixtures/dogfood/tasks/product-code-test-dogfood.json",
      ]),
    ).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["graph"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const contextJson = await readJson<{
      buckets: {
        mustRead: Array<{ path: string; selector?: string }>;
        shouldRead: Array<{ path: string; selector?: string }>;
        referenceOnly: Array<{ path: string; selector?: string }>;
        doNotUse: Array<{ path: string; selector?: string }>;
      };
    }>(cwd, ".krn/current/context-package.json");

    expect(contextJson.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "src/index.ts",
        selector: "expected-touched-file",
      }),
    );
    expect(contextJson.buckets.shouldRead).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "src/index.test.ts",
          selector: "explicit-task-path",
        }),
        expect.objectContaining({
          path: "krn.config.json",
          selector: "package-owned-config",
        }),
      ]),
    );
    expect(contextJson.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: "docs/current-pricing.md",
        selector: "package-owned-doc",
      }),
    );
    expect(contextJson.buckets.doNotUse).toContainEqual(
      expect.objectContaining({
        path: "docs/stale-pricing.md",
        selector: "required-do-not-use-path",
      }),
    );

    const failingVerify = await runInCwd(cwd, ["verify", "--execute"]);
    expect(failingVerify.code).toBe(0);
    expect(failingVerify.stdout).toContain("KRN verify: fail");
    await expect(readJson(cwd, ".krn/current/verify-result.json")).resolves.toMatchObject({
      status: "fail",
      mode: "execute",
      summary: { executedCommands: 1 },
    });

    await writeFile(
      path.join(cwd, "src", "index.ts"),
      [
        "export function formatInvoiceTotal(cents: number): string {",
        "  const dollars = Math.floor(cents / 100);",
        "  const remainder = cents % 100;",
        "",
        '  return "$" + dollars + "." + remainder.toString().padStart(2, "0");',
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const passingVerify = await runInCwd(cwd, ["verify", "--execute"]);
    expect(passingVerify.code).toBe(0);
    expect(passingVerify.stdout).toContain("KRN verify: pass");
    await expect(runInCwd(cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });

    const diff = spawnSync("git", ["diff", "--name-only"], { cwd, encoding: "utf8" });
    expect(diff.stdout.trim()).toBe("src/index.ts");
    await expect(readJson(cwd, ".krn/current/verify-result.json")).resolves.toMatchObject({
      status: "pass",
      mode: "execute",
      summary: { executedCommands: 1 },
      executedCommands: ["node src/index.test.ts"],
    });
    const handoffMarkdown = await readFile(path.join(cwd, ".krn/current/handoff.md"), "utf8");
    expect(handoffMarkdown).toContain("## Verify");
    expect(handoffMarkdown).toContain("Status: pass");
  });

  it("runs product-code tax fixture with localized context and report classification", async () => {
    const cwd = await copyFixtureRepo("product-code-dogfood");
    await mkdir(path.join(cwd, "fixtures", "dogfood", "tasks"), { recursive: true });
    await writeFile(
      path.join(cwd, "fixtures", "dogfood", "tasks", "product-code-tax-dogfood.json"),
      await readFile(
        path.join(process.cwd(), "fixtures", "dogfood", "tasks", "product-code-tax-dogfood.json"),
        "utf8",
      ),
      "utf8",
    );

    spawnSync("git", ["init", "-q"], { cwd, encoding: "utf8" });
    spawnSync("git", ["add", "."], { cwd, encoding: "utf8" });
    spawnSync(
      "git",
      [
        "-c",
        "user.email=krn@example.invalid",
        "-c",
        "user.name=KRN Test",
        "commit",
        "-q",
        "-m",
        "fixture baseline",
      ],
      { cwd, encoding: "utf8" },
    );

    await expect(
      runInCwd(cwd, [
        "start",
        "--task-spec",
        "fixtures/dogfood/tasks/product-code-tax-dogfood.json",
      ]),
    ).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["graph"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const contextJson = await readJson<{
      buckets: {
        mustRead: Array<{ path: string; selector?: string }>;
        shouldRead: Array<{ path: string; selector?: string }>;
        referenceOnly: Array<{ path: string; selector?: string }>;
        doNotUse: Array<{ path: string; selector?: string }>;
      };
    }>(cwd, ".krn/current/context-package.json");
    const activePaths = [
      ...contextJson.buckets.mustRead.map((item) => item.path),
      ...contextJson.buckets.shouldRead.map((item) => item.path),
      ...contextJson.buckets.referenceOnly.map((item) => item.path),
    ];

    expect(contextJson.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "src/regional-tax.ts",
        selector: "expected-touched-file",
      }),
    );
    expect(contextJson.buckets.shouldRead).toContainEqual(
      expect.objectContaining({
        path: "src/regional-tax.test.ts",
        selector: "explicit-task-path",
      }),
    );
    expect(contextJson.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: "docs/current-tax.md",
        selector: "package-owned-doc",
      }),
    );
    expect(contextJson.buckets.doNotUse).toContainEqual(
      expect.objectContaining({
        path: "docs/stale-tax.md",
        selector: "required-do-not-use-path",
      }),
    );
    expect(activePaths).not.toContain("src/index.ts");
    expect(activePaths).not.toContain("src/index.test.ts");
    expect(activePaths).not.toContain("docs/stale-tax.md");

    const failingVerify = await runInCwd(cwd, ["verify", "--profile", "tax", "--execute"]);
    expect(failingVerify.code).toBe(0);
    expect(failingVerify.stdout).toContain("KRN verify: fail");

    await writeFile(
      path.join(cwd, "src", "regional-tax.ts"),
      [
        'export type TaxRegion = "standard" | "reduced";',
        "",
        "const rates: Record<TaxRegion, number> = {",
        "  standard: 0.075,",
        "  reduced: 0.025,",
        "};",
        "",
        "export function calculateRegionalTax(cents: number, region: TaxRegion): number {",
        "  return Math.round(cents * rates[region]);",
        "}",
        "",
      ].join("\n"),
      "utf8",
    );

    const passingVerify = await runInCwd(cwd, ["verify", "--profile", "tax", "--execute"]);
    expect(passingVerify.code).toBe(0);
    expect(passingVerify.stdout).toContain("KRN verify: pass");
    await expect(runInCwd(cwd, ["handoff"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["review", "--write"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["summary", "--write"])).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["report", "--write"])).resolves.toMatchObject({ code: 0 });

    const diff = spawnSync("git", ["diff", "--name-only"], { cwd, encoding: "utf8" });
    expect(diff.stdout.trim()).toBe("src/regional-tax.ts");
    await expect(readJson(cwd, ".krn/current/verify-result.json")).resolves.toMatchObject({
      status: "pass",
      mode: "execute",
      profileName: "tax",
      summary: { executedCommands: 1 },
      executedCommands: ["node src/regional-tax.test.ts"],
    });
    await expect(readJson(cwd, ".krn/current/operator-report.json")).resolves.toMatchObject({
      schema: "krn-operator-report-v1",
      task: {
        classification: "implementation",
      },
      productionProof: { value: false },
      hookTrust: { status: "unproven" },
    });
  });
});
