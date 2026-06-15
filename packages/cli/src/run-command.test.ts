import { mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  expectFile,
  type ReleaseCheckFixture,
  type RunBundleManifestFixture,
  type RunResultFixture,
  readJson,
  runInCwd,
  runInTemp,
  writeReleaseCheckFixtureFiles,
} from "./cli-test-utils.js";

describe("krn CLI run command", () => {
  it("runs the condensed workflow from task text", async () => {
    const result = await runInTemp(["run", "--task", "Smoke local run"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN run: ran");
    await expectFile(result.cwd, ".krn/current/run-result.json");
    await expectFile(result.cwd, ".krn/current/run-result.md");
    await expectFile(result.cwd, ".krn/current/operator-report.json");

    const run = await readJson<RunResultFixture>(result.cwd, ".krn/current/run-result.json");
    expect(run).toMatchObject({
      schema: "krn-run-result-v1",
      status: "ran",
      dryRun: false,
      executeVerify: false,
      taskText: "Smoke local run",
      verify: {
        mode: "record-only",
        status: "not-runnable",
        executedCommands: 0,
      },
      proof: {
        productionProof: false,
        hookTrustStatus: "unproven",
      },
    });
    expect(run.steps.start.status).toBe("ran");
    expect(run.steps.graph.status).toBe("ran");
    expect(run.steps.context.status).toBe("ran");
    expect(run.steps.verify.status).toBe("ran");
    expect(run.steps.report.status).toBe("ran");
    expect(run.artifacts.runResultJson).toBe(".krn/current/run-result.json");
  }, 15_000);

  it("keeps dry-run verify record-only even when execute is requested", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "pass.cjs"), 'process.stdout.write("dry-pass\\n");\n', "utf8");
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
              },
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runInCwd(cwd, [
      "run",
      "--task",
      "Dry run smoke",
      "--dry-run",
      "--execute-verify",
    ]);
    const run = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");

    expect(result.code).toBe(0);
    expect(run.status).toBe("planned");
    expect(run.dryRun).toBe(true);
    expect(run.executeVerify).toBe(true);
    expect(run.verify).toMatchObject({
      mode: "record-only",
      status: "warn",
      executedCommands: 0,
      totalCommands: 1,
      profileName: "unit",
    });
    expect(run.warnings).toContain(
      "KRN run: --dry-run kept verify in record-only mode despite --execute-verify.",
    );
  }, 15_000);

  it("prints run-result JSON without subcommand chatter", async () => {
    const result = await runInTemp(["run", "--task", "JSON smoke", "--json"]);
    const run = JSON.parse(result.stdout) as RunResultFixture;

    expect(result.code).toBe(0);
    expect(run.schema).toBe("krn-run-result-v1");
    expect(run.taskText).toBe("JSON smoke");
    expect(result.stdout.trimStart().startsWith("{")).toBe(true);
  }, 15_000);

  it("runs from task spec paths", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(
      path.join(cwd, "task.json"),
      `${JSON.stringify(
        {
          prompt: "Task spec smoke",
          expectedTouchedFiles: ["src/index.ts"],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runInCwd(cwd, ["run", "--task-spec", "task.json"]);
    const run = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");

    expect(result.code).toBe(0);
    expect(run.taskText).toBe("Task spec smoke");
    expect(run.taskSpecPath).toBe("task.json");
  }, 15_000);

  it("keeps task-spec do-not-use paths out of graph content reads during runs", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, "raw", "acf-json"), { recursive: true });
    await writeFile(path.join(cwd, "raw", "acf-json", "broken.json"), "{not json", "utf8");
    await writeFile(path.join(cwd, "README.md"), "# Fixture\n", "utf8");
    await writeFile(
      path.join(cwd, "task.json"),
      `${JSON.stringify(
        {
          prompt: "Update README without reading raw protected context.",
          expectedTouchedFiles: ["README.md"],
          requiredDoNotUsePaths: ["raw/**"],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runInCwd(cwd, ["run", "--task-spec", "task.json"]);
    const run = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");
    const graph = await readJson<{ nodes: Array<{ evidencePath: string }> }>(
      cwd,
      ".krn/graph/repo-graph.json",
    );

    expect(result.code).toBe(0);
    expect(run.status).toBe("ran");
    expect(run.steps.graph.status).toBe("ran");
    expect(graph.nodes.map((node) => node.evidencePath).join("\n")).not.toContain(
      "raw/acf-json/broken.json",
    );
  }, 15_000);

  it("surfaces schema-backed task spec errors in run results", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(
      path.join(cwd, "task.json"),
      `${JSON.stringify(
        {
          prompt: "Invalid task spec smoke",
          expectedTouchedFiles: [""],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runInCwd(cwd, ["run", "--task-spec", "task.json"]);
    const run = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");

    expect(result.code).toBe(1);
    expect(run.status).toBe("failed");
    expect(run.steps.start.summary).toBe(
      "KRN start: --task-spec JSON expectedTouchedFiles must be an array of non-empty strings",
    );
    expect(run.blockers).toEqual([
      "KRN start: --task-spec JSON expectedTouchedFiles must be an array of non-empty strings",
    ]);
  }, 15_000);

  it("executes allowlisted verify only when requested", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "pass.cjs"), 'process.stdout.write("run-pass\\n");\n', "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      `${JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "unit",
            profiles: {
              unit: {
                commands: [{ command: "node", args: ["pass.cjs"], label: "unit smoke" }],
              },
            },
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const recordOnly = await runInCwd(cwd, ["run", "--task", "Record-only run"]);
    const recordOnlyResult = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");
    expect(recordOnly.code).toBe(0);
    expect(recordOnlyResult.status).toBe("ran");
    expect(recordOnlyResult.verify).toMatchObject({
      mode: "record-only",
      executedCommands: 0,
    });

    const executed = await runInCwd(cwd, [
      "run",
      "--task",
      "Execute verify run",
      "--execute-verify",
    ]);
    const executedResult = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");

    expect(executed.code).toBe(0);
    expect(executedResult.status).toBe("verified");
    expect(executedResult.steps.verify.status).toBe("verified");
    expect(executedResult.verify).toMatchObject({
      mode: "execute",
      status: "pass",
      executedCommands: 1,
      totalCommands: 1,
      profileName: "unit",
    });
  }, 15_000);

  it("writes a run bundle without expanding release-check bundle", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeReleaseCheckFixtureFiles(cwd);

    const result = await runInCwd(cwd, ["run", "--task", "Bundle smoke", "--bundle"]);
    const run = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");
    const manifest = await readJson<RunBundleManifestFixture>(
      cwd,
      ".krn/current/run-bundle/manifest.json",
    );

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("bundle: .krn/current/run-bundle/manifest.json");
    expect(run.status).toBe("ran");
    expect(run.steps.releaseCheck?.summary).toBe("KRN release-check: pass");
    expect(manifest).toMatchObject({
      schema: "krn-run-bundle-manifest-v1",
      runStatus: "ran",
      productionProof: false,
      hookTrustStatus: "unproven",
    });
    expect(manifest.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "run-result.json", present: true, required: true }),
        expect.objectContaining({ path: "run-result.md", present: true, required: true }),
        expect.objectContaining({ path: "operator-report.md", present: true, required: true }),
        expect.objectContaining({ path: "operator-report.json", present: true, required: true }),
        expect.objectContaining({ path: "operator-report.html", present: true, required: true }),
        expect.objectContaining({ path: "release-check.json", present: true, required: true }),
        expect.objectContaining({ path: "release-check.md", present: true, required: true }),
      ]),
    );
    expect(manifest.files.map((file) => file.path).join("\n")).not.toContain("trace");
    await expect(
      stat(path.join(cwd, ".krn/current/release-bundle/manifest.json")),
    ).rejects.toThrow();
  }, 15_000);

  it("does not let source release-check block bundled target runs", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-target-run-"));
    await writeFile(path.join(cwd, "target.test.js"), "console.log('target pass');\n", "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "unit",
            profiles: {
              unit: {
                commands: ["node target.test.js"],
              },
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );
    await writeFile(
      path.join(cwd, "task.json"),
      JSON.stringify(
        {
          prompt:
            "Approved downstream target run. Update product code and verify with the local target test.",
          expectedTouchedFiles: ["target.test.js"],
          forbiddenTouchedFiles: ["raw/**", ".env", ".git/**"],
          requiredDoNotUsePaths: ["raw/**"],
        },
        null,
        2,
      ),
      "utf8",
    );

    const result = await runInCwd(cwd, [
      "run",
      "--task-spec",
      "task.json",
      "--execute-verify",
      "--bundle",
    ]);
    const run = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");
    const releaseCheck = await readJson<ReleaseCheckFixture>(
      cwd,
      ".krn/current/release-check.json",
    );
    const manifest = await readJson<RunBundleManifestFixture>(
      cwd,
      ".krn/current/run-bundle/manifest.json",
    );

    expect(result.code).toBe(0);
    expect(run.status).toBe("verified");
    expect(run.verify).toMatchObject({ mode: "execute", status: "pass", executedCommands: 1 });
    expect(run.steps.releaseCheck).toMatchObject({
      status: "ran",
      summary: "KRN release-check: fail (non-blocking target run)",
    });
    expect(run.blockers).toEqual([]);
    expect(run.warnings.join("\n")).toContain("source release-check is not applicable");
    expect(releaseCheck.status).toBe("fail");
    expect(manifest).toMatchObject({
      schema: "krn-run-bundle-manifest-v1",
      runStatus: "verified",
      productionProof: false,
    });
  }, 15_000);

  it("blocks later run steps when context STOP is active", async () => {
    const result = await runInTemp([
      "run",
      "--task",
      "Stop when required context is missing",
      "--execute-verify",
      "--bundle",
    ]);
    const run = await readJson<RunResultFixture>(result.cwd, ".krn/current/run-result.json");
    const manifest = await readJson<RunBundleManifestFixture>(
      result.cwd,
      ".krn/current/run-bundle/manifest.json",
    );

    expect(result.code).toBe(1);
    expect(run.status).toBe("blocked");
    expect(run.context.stop).toBe(true);
    expect(run.steps.verify.status).toBe("blocked");
    expect(run.steps.report.status).toBe("blocked");
    expect(run.steps.releaseCheck?.status).toBe("blocked");
    expect(run.blockers).toEqual(["Required context is missing: docs/required-context.md"]);
    expect(manifest.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "operator-report.json", present: false }),
        expect.objectContaining({ path: "release-check.json", present: false }),
      ]),
    );
  }, 15_000);

  it("keeps stale source dogfood caveats from blocking current run", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const stalePath = ".krn/dogfood/real-repo-skipped/test-source-checkout/summary.json";
    await mkdir(path.dirname(path.join(cwd, stalePath)), { recursive: true });
    await writeFile(
      path.join(cwd, stalePath),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "blocked" }),
      "utf8",
    );

    const result = await runInCwd(cwd, ["run", "--task", "Stale caveat smoke"]);
    const run = await readJson<RunResultFixture>(cwd, ".krn/current/run-result.json");

    expect(result.code).toBe(0);
    expect(run.status).toBe("ran");
    expect(run.blockers).toEqual([]);
    expect(run.warnings.join("\n")).toContain("stale source-local test caveat");
  }, 15_000);
});
