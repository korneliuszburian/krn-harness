import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { artifactPathIsArchiveSafe } from "./artifact-scope.js";
import {
  type ArchivePlanFixture,
  type ArtifactsListFixture,
  copyFixtureRepo,
  expectFile,
  type OperatorReportFixture,
  type OperatorSummaryFixture,
  type ReleaseCheckFixture,
  readJson,
  runInCwd,
  runInTemp,
} from "./cli-test-utils.js";

describe("krn CLI report release artifacts", () => {
  it("lists current and historical runtime artifacts by scope", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await mkdir(path.join(cwd, ".krn", "dogfood", "real-repo-skipped", "test-source-checkout"), {
      recursive: true,
    });
    await writeFile(
      path.join(cwd, ".krn", "current", "operator-summary.json"),
      JSON.stringify({ schema: "krn-operator-summary-v1" }),
      "utf8",
    );
    await writeFile(
      path.join(
        cwd,
        ".krn",
        "dogfood",
        "real-repo-skipped",
        "test-source-checkout",
        "summary.json",
      ),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "blocked" }),
      "utf8",
    );

    const all = await runInCwd(cwd, ["artifacts", "list", "--json", "--scope", "all"]);
    const current = await runInCwd(cwd, ["artifacts", "list", "--json", "--scope", "current"]);
    const historical = await runInCwd(cwd, [
      "artifacts",
      "list",
      "--json",
      "--scope",
      "historical",
    ]);

    expect(all.code).toBe(0);
    expect(current.code).toBe(0);
    expect(historical.code).toBe(0);
    expect((JSON.parse(all.stdout) as ArtifactsListFixture).artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ".krn/current/operator-summary.json",
          scope: "current",
        }),
        expect.objectContaining({
          path: ".krn/dogfood/real-repo-skipped/test-source-checkout/summary.json",
          scope: "stale-blocking",
        }),
      ]),
    );
    expect((JSON.parse(current.stdout) as ArtifactsListFixture).artifacts).toEqual([
      expect.objectContaining({ path: ".krn/current/operator-summary.json", scope: "current" }),
    ]);
    expect((JSON.parse(historical.stdout) as ArtifactsListFixture).artifacts).toEqual([
      expect.objectContaining({
        path: ".krn/dogfood/real-repo-skipped/test-source-checkout/summary.json",
        scope: "stale-blocking",
      }),
    ]);
  });

  it("archives historical artifacts only when confirmed", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const historicalPath = ".krn/dogfood/real-repo-skipped/test-missing-env/summary.json";
    await mkdir(path.dirname(path.join(cwd, historicalPath)), { recursive: true });
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, historicalPath),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "skipped" }),
      "utf8",
    );
    await writeFile(path.join(cwd, ".krn", "current", "operator-summary.json"), "{}", "utf8");

    const dryRun = await runInCwd(cwd, ["artifacts", "archive", "--dry-run", "--json"]);
    const dryRunPlan = JSON.parse(dryRun.stdout) as ArchivePlanFixture;
    expect(dryRun.code).toBe(0);
    expect(dryRunPlan.dryRun).toBe(true);
    expect(dryRunPlan.candidates).toEqual([
      expect.objectContaining({ path: historicalPath, scope: "stale-blocking" }),
    ]);
    await expectFile(cwd, historicalPath);

    const confirmed = await runInCwd(cwd, ["artifacts", "archive", "--confirm", "--json"]);
    const confirmedPlan = JSON.parse(confirmed.stdout) as ArchivePlanFixture;
    expect(confirmed.code).toBe(0);
    expect(confirmedPlan.confirm).toBe(true);
    const archivedPath = confirmedPlan.candidates[0]?.archivePath;
    expect(archivedPath).toBeDefined();
    await expect(stat(path.join(cwd, historicalPath))).rejects.toThrow();
    await expectFile(cwd, archivedPath ?? "");
    await expectFile(cwd, ".krn/current/operator-summary.json");
  });

  it("refuses unsafe artifact archive candidates", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const unsafePath = ".krn/dogfood/secret-run/summary.json";
    await mkdir(path.dirname(path.join(cwd, unsafePath)), { recursive: true });
    await writeFile(
      path.join(cwd, unsafePath),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "skipped" }),
      "utf8",
    );

    const result = await runInCwd(cwd, ["artifacts", "archive", "--dry-run", "--json"]);
    const plan = JSON.parse(result.stdout) as ArchivePlanFixture;
    expect(result.code).toBe(0);
    expect(plan.candidates).toEqual([]);
    expect(plan.refused).toEqual([
      expect.objectContaining({ path: unsafePath, reason: expect.stringContaining("not safe") }),
    ]);
    expect(artifactPathIsArchiveSafe("../outside.json")).toBe(false);
  });

  it("prints operator report JSON without requiring existing current state", async () => {
    const result = await runInTemp(["report", "--json"]);
    const report = JSON.parse(result.stdout) as OperatorReportFixture;

    expect(result.code).toBe(0);
    expect(report.schema).toBe("krn-operator-report-v1");
    expect(report.verdict).toBe("warn");
    expect(report.productionProof).toMatchObject({
      value: false,
      summary: expect.stringContaining("production proof remains false"),
    });
    expect(report.hookTrust.status).toBe("unproven");
  });

  it("writes markdown, JSON, and static HTML operator reports", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await runInCwd(cwd, ["start", "Review <script>alert(1)</script> report output"]);

    const result = await runInCwd(cwd, ["report", "--write"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain(".krn/current/operator-report.md");
    expect(result.stdout).toContain(".krn/current/operator-report.json");
    expect(result.stdout).toContain(".krn/current/operator-report.html");

    const report = await readJson<OperatorReportFixture>(cwd, ".krn/current/operator-report.json");
    const markdown = await readFile(
      path.join(cwd, ".krn", "current", "operator-report.md"),
      "utf8",
    );
    const html = await readFile(path.join(cwd, ".krn", "current", "operator-report.html"), "utf8");

    expect(report.schema).toBe("krn-operator-report-v1");
    expect(markdown).toContain("# KRN Operator Report");
    expect(markdown).toContain("Production proof: false");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).toContain("Local file only");
    expect(html).not.toMatch(/https?:\/\//);
  });

  it("writes a local static report bundle with a manifest", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await runInCwd(cwd, ["start", "Bundle report artifacts for operator handoff"]);
    await runInCwd(cwd, ["summary", "--write"]);
    await runInCwd(cwd, ["config", "doctor"]);

    const result = await runInCwd(cwd, ["report", "--bundle"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("bundle: .krn/current/report-bundle/manifest.json");

    const manifest = await readJson<{
      schema: string;
      productionProof: boolean;
      files: Array<{ path: string; present: boolean; required: boolean }>;
    }>(cwd, ".krn/current/report-bundle/manifest.json");
    const bundleHtml = await readFile(
      path.join(cwd, ".krn", "current", "report-bundle", "operator-report.html"),
      "utf8",
    );

    expect(manifest.schema).toBe("krn-report-bundle-manifest-v1");
    expect(manifest.productionProof).toBe(false);
    expect(manifest.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "operator-report.md", present: true, required: true }),
        expect.objectContaining({ path: "operator-report.html", present: true, required: true }),
        expect.objectContaining({ path: "operator-summary.json", present: true, required: true }),
        expect.objectContaining({ path: "config-doctor.json", present: true }),
        expect.objectContaining({ path: "verify-result.json", present: false }),
      ]),
    );
    expect(bundleHtml).toContain("Local file only");
    expect(bundleHtml).not.toMatch(/https?:\/\//);
  });

  it("keeps stale source dogfood blockers as report caveats", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const stalePath = ".krn/dogfood/real-repo-skipped/test-source-checkout/summary.json";
    await mkdir(path.dirname(path.join(cwd, stalePath)), { recursive: true });
    await writeFile(
      path.join(cwd, stalePath),
      JSON.stringify({ schema: "krn-real-repo-dogfood-v1", status: "blocked" }),
      "utf8",
    );

    const summary = await runInCwd(cwd, ["summary", "--write"]);
    expect(summary.code).toBe(0);
    expect(summary.stdout).toContain("KRN summary: warn");

    const operatorSummary = await readJson<OperatorSummaryFixture>(
      cwd,
      ".krn/current/operator-summary.json",
    );
    expect(operatorSummary.realRepoDogfood).toMatchObject({
      status: "warn",
      latestPath: stalePath,
    });
    expect(operatorSummary.realRepoDogfood.summary).toContain("stale source-local test caveat");

    const result = await runInCwd(cwd, ["report", "--json"]);
    const report = JSON.parse(result.stdout) as OperatorReportFixture;
    expect(result.code).toBe(0);
    expect(report.verdict).toBe("warn");
    expect(report.realRepoEvidence).toMatchObject({
      status: "warn",
      staleHistoricalBlocker: false,
    });
    expect(report.blockers).not.toEqual(
      expect.arrayContaining([expect.stringContaining("realRepoDogfood")]),
    );
    expect(report.historicalCaveats).toEqual([
      expect.objectContaining({ path: stalePath, scope: "stale-blocking" }),
    ]);
  });

  it("runs a local release readiness check and writes artifacts", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const files = [
      "packages/cli/src/commands/run.ts",
      "packages/cli/src/commands/report.ts",
      "packages/cli/src/commands/artifacts.ts",
      "packages/cli/src/commands/uninstall.ts",
      "packages/cli/src/commands/config.ts",
      "docs/specs/install-result.schema.md",
      "docs/specs/uninstall-result.schema.md",
      "docs/specs/config-doctor.schema.md",
      "docs/specs/run-result.schema.md",
      "docs/specs/operator-report.schema.md",
      "docs/specs/release-check.schema.md",
      "docs/product/evidence-matrix.md",
      "docs/product/mvp-state.md",
      ".github/workflows/verify.yml",
      "packages/verify/src/command-policy.ts",
      ".krn/current/operator-report.md",
      ".krn/current/operator-report.json",
      ".krn/current/operator-report.html",
      ".krn/current/report-bundle/manifest.json",
    ];

    await writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({
        scripts: {
          lint: "biome check .",
          typecheck: "tsc --noEmit",
          test: "vitest",
          "verify:local": "pnpm lint && pnpm typecheck && pnpm test",
        },
      }),
      "utf8",
    );
    for (const relativePath of files) {
      await mkdir(path.dirname(path.join(cwd, relativePath)), { recursive: true });
      await writeFile(path.join(cwd, relativePath), `${relativePath}\n`, "utf8");
    }

    const result = await runInCwd(cwd, ["release-check", "--json", "--write"]);
    const releaseCheck = JSON.parse(result.stdout) as ReleaseCheckFixture;

    expect(result.code).toBe(0);
    expect(releaseCheck.schema).toBe("krn-release-check-v1");
    expect(releaseCheck.status).toBe("pass");
    expect(releaseCheck.blockers).toEqual([]);
    expect(releaseCheck.nextActions).toEqual([]);
    expect(releaseCheck.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "package-scripts", status: "pass" }),
        expect.objectContaining({ id: "run-command", status: "pass" }),
        expect.objectContaining({ id: "uninstall-command", status: "pass" }),
        expect.objectContaining({ id: "config-command", status: "pass" }),
        expect.objectContaining({ id: "run-result-schema", status: "pass" }),
        expect.objectContaining({ id: "release-check-schema", status: "pass" }),
        expect.objectContaining({ id: "ci-workflow", status: "pass" }),
        expect.objectContaining({ id: "operator-report-artifacts", status: "pass" }),
        expect.objectContaining({ id: "operator-report-bundle", status: "pass" }),
      ]),
    );
    await expectFile(cwd, ".krn/current/release-check.json");
    await expectFile(cwd, ".krn/current/release-check.md");
  });

  it("writes a v0.1 release bundle with local proof-state caveats", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const files = [
      "packages/cli/src/commands/run.ts",
      "packages/cli/src/commands/report.ts",
      "packages/cli/src/commands/artifacts.ts",
      "packages/cli/src/commands/uninstall.ts",
      "packages/cli/src/commands/config.ts",
      "docs/specs/install-result.schema.md",
      "docs/specs/uninstall-result.schema.md",
      "docs/specs/config-doctor.schema.md",
      "docs/specs/run-result.schema.md",
      "docs/specs/operator-report.schema.md",
      "docs/specs/release-check.schema.md",
      "docs/product/evidence-matrix.md",
      "docs/product/mvp-state.md",
      ".github/workflows/verify.yml",
      "packages/verify/src/command-policy.ts",
    ];

    await writeFile(
      path.join(cwd, "package.json"),
      JSON.stringify({
        scripts: {
          lint: "biome check .",
          typecheck: "tsc --noEmit",
          test: "vitest",
          "verify:local": "pnpm lint && pnpm typecheck && pnpm test",
        },
      }),
      "utf8",
    );
    for (const relativePath of files) {
      await mkdir(path.dirname(path.join(cwd, relativePath)), { recursive: true });
      await writeFile(path.join(cwd, relativePath), `${relativePath}\n`, "utf8");
    }

    await mkdir(path.join(cwd, ".krn", "current", "report-bundle"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "operator-report.json"),
      `${JSON.stringify(
        {
          schema: "krn-operator-report-v1",
          verdict: "warn",
          hookTrust: { status: "unproven", summary: "No trusted hook provenance." },
          productionProof: {
            value: false,
            summary: "KRN report is local operator evidence only.",
          },
          realRepoEvidence: {
            status: "warn",
            summary: "Readiness only.",
            staleHistoricalBlocker: true,
          },
          blockers: [],
          warnings: ["stale source-local dogfood caveat"],
          nextActions: ["Run real-repo product-code proof after approval."],
          historicalCaveatCount: 1,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "operator-report.md"),
      "# KRN Operator Report\n\nProduction proof: false\nHook trust: unproven\n",
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "operator-report.html"),
      "<!doctype html><html><body>Local file only</body></html>\n",
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "report-bundle", "manifest.json"),
      `${JSON.stringify(
        {
          schema: "krn-report-bundle-manifest-v1",
          productionProof: false,
          files: [{ path: "verify-result.json", present: false }],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "eval-result.json"),
      `${JSON.stringify(
        {
          status: "pass",
          passCount: 1,
          failCount: 0,
          fixtures: [{ name: "product-code-test-dogfood", status: "pass" }],
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runInCwd(cwd, ["release-check", "--bundle"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("Bundle: .krn/current/release-bundle/manifest.json");

    const manifest = await readJson<{
      schema: string;
      productionProof: boolean;
      hookTrustStatus: string;
      files: Array<{ path: string; present: boolean; required: boolean }>;
      validationCommands: Array<{ command: string; status: string }>;
    }>(cwd, ".krn/current/release-bundle/manifest.json");
    const evidenceSummary = await readFile(
      path.join(cwd, ".krn", "current", "release-bundle", "evidence-summary.md"),
      "utf8",
    );
    const commandsRun = await readFile(
      path.join(cwd, ".krn", "current", "release-bundle", "commands-run.md"),
      "utf8",
    );
    const knownGaps = await readFile(
      path.join(cwd, ".krn", "current", "release-bundle", "known-gaps.md"),
      "utf8",
    );
    const noProtectedData = await readFile(
      path.join(cwd, ".krn", "current", "release-bundle", "no-protected-data.md"),
      "utf8",
    );
    const bundleHtml = await readFile(
      path.join(cwd, ".krn", "current", "release-bundle", "operator-report.html"),
      "utf8",
    );

    expect(manifest.schema).toBe("krn-release-bundle-manifest-v1");
    expect(manifest.productionProof).toBe(false);
    expect(manifest.hookTrustStatus).toBe("unproven");
    expect(manifest.files).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "release-check.json", present: true, required: true }),
        expect.objectContaining({ path: "release-check.md", present: true, required: true }),
        expect.objectContaining({ path: "operator-report.md", present: true, required: true }),
        expect.objectContaining({ path: "operator-report.json", present: true, required: true }),
        expect.objectContaining({ path: "operator-report.html", present: true, required: true }),
        expect.objectContaining({ path: "report-bundle/manifest.json", present: true }),
        expect.objectContaining({ path: "evidence-summary.md", present: true, required: true }),
        expect.objectContaining({ path: "known-gaps.md", present: true, required: true }),
        expect.objectContaining({ path: "commands-run.md", present: true, required: true }),
        expect.objectContaining({ path: "validation-summary.md", present: true, required: true }),
        expect.objectContaining({ path: "no-protected-data.md", present: true, required: true }),
      ]),
    );
    expect(manifest.files.map((file) => file.path).join("\n")).not.toContain("trace");
    expect(manifest.validationCommands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          command: "pnpm verify:local",
          status: "recorded-not-executed-by-release-check",
        }),
        expect.objectContaining({ command: "pnpm --silent krn release-check --bundle" }),
        expect.objectContaining({ command: "git diff --check" }),
      ]),
    );
    expect(evidenceSummary).toContain("Production proof: false");
    expect(evidenceSummary).toContain("Hook trust: unproven");
    expect(evidenceSummary).toContain("Historical caveats: 1");
    expect(commandsRun).toContain("does not execute shell validation");
    expect(knownGaps).toContain("`productionProof` remains `false`");
    expect(knownGaps).toContain("Hook trust remains unproven");
    expect(noProtectedData).toContain("`.env`");
    expect(noProtectedData).toContain("raw trace dumps");
    expect(bundleHtml).not.toMatch(/https?:\/\//);
    await expectFile(cwd, ".krn/current/release-bundle/validation-summary.json");
    await expectFile(cwd, ".krn/current/release-bundle/evidence-summary.json");
  });

  it("fails release readiness when required local contracts are missing", async () => {
    const result = await runInTemp(["release-check", "--json"]);
    const releaseCheck = JSON.parse(result.stdout) as ReleaseCheckFixture;

    expect(result.code).toBe(1);
    expect(releaseCheck.status).toBe("fail");
    expect(releaseCheck.blockers).toEqual(
      expect.arrayContaining([
        expect.stringContaining("package-scripts"),
        expect.stringContaining("mvp-state"),
        expect.stringContaining("ci-workflow"),
      ]),
    );
    expect(releaseCheck.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("operator-report-artifacts"),
        expect.stringContaining("operator-report-bundle"),
      ]),
    );
  });

  it("keeps the local CLI bin entrypoint linkable for dogfood", async () => {
    const packageJson = await readJson<{
      bin: { krn: string };
    }>(process.cwd(), "packages/cli/package.json");
    const bin = await readFile(path.join(process.cwd(), "packages/cli/src/bin.js"), "utf8");

    expect(packageJson.bin.krn).toBe("./src/bin.js");
    expect(bin.startsWith("#!/usr/bin/env node\n")).toBe(true);
    expect(bin).toContain("node_modules/tsx/dist/esm/index.mjs");
    expect(bin).toContain("cwd: process.cwd()");
    expect(bin).toContain("KRN_HARNESS_BIN_WRAPPER");
    expect(bin).toContain("KRN_HARNESS_SOURCE_ROOT");
  });

  it("prints KRN CLI identity without writing runtime artifacts", async () => {
    const result = await runInTemp(["doctor", "cli"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN Harness CLI identity");
    expect(result.stdout).toContain("schema: krn-harness-cli-identity-v1");
    expect(result.stdout).toContain("package: @krn-harness/cli");
    expect(result.stdout).toContain(
      "supported_commands: run,status,start,graph,context,verify,handoff,doctor,eval,install,uninstall,config,summary,review,report,release-check,artifacts,memory,hook",
    );
    expect(result.stdout).toContain("required_commands_present: true");
    expect(result.stdout).toContain(`runtime_cwd: ${result.cwd}`);
    await expect(stat(path.join(result.cwd, ".krn"))).rejects.toThrow();
  });

  it("runs the local CLI bin wrapper from a downstream cwd", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");
    const binPath = path.join(process.cwd(), "packages/cli/src/bin.js");
    const result = spawnSync(process.execPath, [binPath, "install"], {
      cwd,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("KRN install: installed");
    await expectFile(cwd, "AGENTS.md");
    await expectFile(cwd, ".codex/hooks.json");
    await expectFile(cwd, ".agents/skills/krn-harness/SKILL.md");
  });

  it("generates a pinned local shim that preserves downstream cwd", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");
    const binDir = await mkdtemp(path.join(os.tmpdir(), "krn-harness-bin-"));
    const shimResult = spawnSync(path.join(process.cwd(), "scripts/krn-local-shim.sh"), [binDir], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(shimResult.status).toBe(0);
    const shimPath = shimResult.stdout.trim();
    const identity = spawnSync(shimPath, ["doctor", "cli"], {
      cwd,
      encoding: "utf8",
    });

    expect(identity.status).toBe(0);
    expect(identity.stdout).toContain("schema: krn-harness-cli-identity-v1");
    expect(identity.stdout).toContain(`command_path: ${shimPath}`);
    expect(identity.stdout).toContain(`bin_wrapper_path: ${shimPath}`);
    expect(identity.stdout).toContain(`source_root_path: ${process.cwd()}`);
    expect(identity.stdout).toContain(`runtime_cwd: ${cwd}`);

    const install = spawnSync(shimPath, ["install"], {
      cwd,
      encoding: "utf8",
    });

    expect(install.status).toBe(0);
    expect(install.stdout).toContain("KRN install: installed");
    await expectFile(cwd, "AGENTS.md");
    await expectFile(cwd, ".krn/traces/trace.jsonl");
  }, 10_000);
});
