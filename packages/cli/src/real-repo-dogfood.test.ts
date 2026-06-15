import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  createGitRepoForPreflight,
  expectFile,
  type RealRepoPreflightSummary,
  readJson,
  runRealRepoDogfood,
  runRealRepoExecutionReport,
  runRealRepoPreflight,
} from "./cli-test-utils.js";

describe("krn CLI real repo dogfood reports", () => {
  it("runs dogfood preflight through a pinned shim without source checkout mutation", () => {
    const result = spawnSync(path.join(process.cwd(), "scripts/krn-dogfood-preflight.sh"), {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("KRN dogfood preflight: pass");
    expect(result.stdout).toContain("schema: krn-harness-cli-identity-v1");
    expect(result.stdout).toContain("required_commands_present: true");
  }, 30_000);

  it("rejects the KRN source checkout as a real-repo preflight target", () => {
    const { result, summary } = runRealRepoPreflight(process.cwd());

    expect(result.status).toBe(1);
    expect(summary.eligible).toBe(false);
    expect(summary.blockers).toContain("repo_path_is_krn_source_checkout");
    expect(summary.pinnedKrnPath).toBeNull();
    expect(summary.summaryJsonPath).toBeNull();
  });

  it("warns on dirty real-repo preflight worktrees and missing config", async () => {
    const repo = await createGitRepoForPreflight({ dirty: true });
    const { result, summary } = runRealRepoPreflight(repo, {
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-dirty"),
    });

    expect(result.status).toBe(0);
    expect(summary.eligible).toBe(true);
    expect(summary.dirtyWorktree).toBe(true);
    expect(summary.krnConfigExists).toBe(false);
    expect(summary.verifyProfileStatus).toBe("missing");
    expect(summary.warnings).toEqual(
      expect.arrayContaining(["dirty_worktree", "missing_krn_config_json"]),
    );
    expect(summary.requiredOperatorDecisions).toEqual(
      expect.arrayContaining([
        "clean_or_branch_isolate_before_paid_dogfood",
        "create_or_accept_record_only_krn_config",
        "krn_install_not_run",
      ]),
    );
  }, 20_000);

  it("detects safe verify profile evidence in real-repo preflight", async () => {
    const repo = await createGitRepoForPreflight({
      config: {
        version: 1,
        verify: {
          defaultProfile: "unit",
          profiles: {
            unit: {
              commands: [
                { command: "node", args: ["src/index.test.ts"] },
                { command: "pnpm", args: ["test", "--coverage"] },
              ],
            },
          },
        },
      },
    });
    const { result, summary } = runRealRepoPreflight(repo, {
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-safe"),
    });

    expect(result.status).toBe(0);
    expect(summary.eligible).toBe(true);
    expect(summary.krnConfigExists).toBe(true);
    expect(summary.verifyProfileStatus).toBe("safe");
    expect(summary.safeVerifyCommands).toEqual(["node src/index.test.ts", "pnpm test --coverage"]);
    expect(summary.krnIdentityValid).toBe(true);
    expect(summary.pinnedKrnPath).toBe(path.join(repo, "..", "bin-safe", "krn"));
  }, 20_000);

  it("detects safe python3 readonly verify profile evidence in real-repo preflight", async () => {
    const repo = await createGitRepoForPreflight({
      config: {
        version: 1,
        verify: {
          defaultProfile: "readonly",
          profiles: {
            readonly: {
              commands: [
                {
                  command: "python3",
                  args: ["tools/check_all_readonly.py"],
                  label: "readonly suite",
                },
              ],
            },
          },
        },
      },
    });
    const { result, summary } = runRealRepoPreflight(repo, {
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-python"),
    });

    expect(result.status).toBe(0);
    expect(summary.eligible).toBe(true);
    expect(summary.krnConfigExists).toBe(true);
    expect(summary.verifyProfileStatus).toBe("safe");
    expect(summary.safeVerifyCommands).toEqual(["python3 tools/check_all_readonly.py"]);
    expect(summary.unsafeVerifyCommands).toEqual([]);
  }, 20_000);

  it("writes deterministic real-repo preflight summary files", async () => {
    const repo = await createGitRepoForPreflight({
      config: {
        version: 1,
        verify: {
          commands: ["pnpm lint"],
        },
      },
    });
    const { summary } = runRealRepoPreflight(repo, {
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-shape"),
    });

    expect(Object.keys(summary)).toEqual([
      "schema",
      "eligible",
      "repoPath",
      "sourceRootPath",
      "isGitRepo",
      "dirtyWorktree",
      "krnConfigExists",
      "verifyProfileStatus",
      "verifyDefaultProfile",
      "verifyProfiles",
      "safeVerifyCommands",
      "unsafeVerifyCommands",
      "configIssues",
      "blockers",
      "warnings",
      "requiredOperatorDecisions",
      "pinnedKrnPath",
      "krnIdentityValid",
      "krnIdentity",
      "krnStatusOk",
      "krnStatusOutput",
      "installRun",
      "installOutput",
      "wouldInstall",
      "recommendedNextCommand",
      "summaryJsonPath",
      "summaryMarkdownPath",
    ]);
    expect(summary.wouldInstall).toEqual([
      "AGENTS.md",
      ".codex/hooks.json",
      ".agents/skills/krn-harness/SKILL.md",
      ".krn/",
    ]);
    expect(summary.summaryJsonPath).toBe(
      path.join(repo, ".krn/dogfood/real-repo-preflight/latest/summary.json"),
    );
    expect(summary.summaryMarkdownPath).toBe(
      path.join(repo, ".krn/dogfood/real-repo-preflight/latest/summary.md"),
    );
    expect(
      await readJson<RealRepoPreflightSummary>(
        repo,
        ".krn/dogfood/real-repo-preflight/latest/summary.json",
      ),
    ).toMatchObject({
      schema: "krn-real-repo-preflight-v1",
      verifyProfileStatus: "safe",
      safeVerifyCommands: ["pnpm lint"],
    });
    await expectFile(repo, ".krn/dogfood/real-repo-preflight/latest/summary.md");
  }, 20_000);

  it("writes a skipped real-repo dogfood report when approval env is missing", async () => {
    const artifactRoot = await mkdtemp(path.join(os.tmpdir(), "krn-real-dogfood-artifacts-"));
    const { result, summary } = runRealRepoDogfood({
      KRN_REAL_REPO_DOGFOOD_RUN_ID: "test-missing-env",
      KRN_REAL_REPO_DOGFOOD_PATH: "",
      KRN_REAL_REPO_DOGFOOD_APPROVED: "",
      KRN_REAL_REPO_DOGFOOD_ARTIFACT_ROOT: artifactRoot,
    });

    expect(result.status).toBe(0);
    expect(summary).toMatchObject({
      schema: "krn-real-repo-dogfood-v1",
      runId: "test-missing-env",
      status: "skipped",
      outcomeKind: "skipped-missing-env",
      validationClaim: "not validated; no real repository was preflighted or executed",
      dogfoodApproved: false,
      preflightEligible: null,
      krnIdentityValid: false,
    });
    expect(summary.missingEnv).toEqual([
      "KRN_REAL_REPO_DOGFOOD_PATH",
      "KRN_REAL_REPO_DOGFOOD_APPROVED=1",
    ]);
    expect(summary.missingEnvInstructions).toEqual([
      "Choose an absolute path to a safe non-protected git repository.",
      "export KRN_REAL_REPO_DOGFOOD_PATH=/absolute/path/to/safe-non-protected-repo",
      "export KRN_REAL_REPO_DOGFOOD_APPROVED=1",
      "scripts/krn-real-repo-dogfood.sh",
    ]);
    expect(summary.requiredOperatorDecisions).toEqual(
      expect.arrayContaining([
        "set_KRN_REAL_REPO_DOGFOOD_PATH",
        "set_KRN_REAL_REPO_DOGFOOD_APPROVED",
      ]),
    );
    expect(summary.summaryJsonPath).toBe(
      path.join(artifactRoot, ".krn/dogfood/real-repo-skipped/test-missing-env/summary.json"),
    );
    await expectFile(artifactRoot, ".krn/dogfood/real-repo-skipped/test-missing-env/summary.md");
    await expect(
      readFile(
        path.join(artifactRoot, ".krn/dogfood/real-repo-skipped/test-missing-env/summary.md"),
        "utf8",
      ),
    ).resolves.toContain("Skipped and readiness reports are not real-repo validation.");
  });

  it("blocks real-repo dogfood when preflight rejects the source checkout", async () => {
    const artifactRoot = await mkdtemp(path.join(os.tmpdir(), "krn-real-dogfood-artifacts-"));
    const { result, summary } = runRealRepoDogfood({
      KRN_REAL_REPO_DOGFOOD_RUN_ID: "test-source-checkout",
      KRN_REAL_REPO_DOGFOOD_PATH: process.cwd(),
      KRN_REAL_REPO_DOGFOOD_APPROVED: "1",
      KRN_REAL_REPO_DOGFOOD_ARTIFACT_ROOT: artifactRoot,
    });

    expect(result.status).toBe(0);
    expect(summary.status).toBe("blocked");
    expect(summary.preflightEligible).toBe(false);
    expect(summary.blockers).toContain("repo_path_is_krn_source_checkout");
    expect(summary.pinnedKrnPath).toBeNull();
    expect(summary.summaryJsonPath).toBe(
      path.join(artifactRoot, ".krn/dogfood/real-repo-skipped/test-source-checkout/summary.json"),
    );
  });

  it("writes a real-repo dogfood readiness report for an eligible repo without paid Codex", async () => {
    const repo = await createGitRepoForPreflight({
      config: {
        version: 1,
        verify: {
          defaultProfile: "unit",
          profiles: {
            unit: {
              commands: [{ command: "node", args: ["src/index.test.ts"] }],
            },
          },
        },
      },
    });
    const { result, summary } = runRealRepoDogfood({
      KRN_REAL_REPO_DOGFOOD_RUN_ID: "test-readiness",
      KRN_REAL_REPO_DOGFOOD_PATH: repo,
      KRN_REAL_REPO_DOGFOOD_APPROVED: "1",
      KRN_REAL_REPO_PREFLIGHT_BIN_DIR: path.join(repo, "..", "bin-dogfood"),
    });

    expect(result.status).toBe(0);
    expect(summary.status).toBe("readiness");
    expect(summary.preflightEligible).toBe(true);
    expect(summary.codexApproved).toBe(false);
    expect(summary.warnings).toContain("paid_codex_execution_not_approved");
    expect(summary.requiredOperatorDecisions).toEqual(
      expect.arrayContaining(["approve_paid_codex_or_run_manual_protocol", "krn_install_not_run"]),
    );
    expect(summary.pinnedKrnPath).toBe(path.join(repo, "..", "bin-dogfood", "krn"));
    expect(summary.krnIdentityValid).toBe(true);
    expect(summary.verifyProfileStatus).toBe("safe");
    expect(summary.safeVerifyCommands).toEqual(["node src/index.test.ts"]);
    await expectFile(repo, ".krn/dogfood/real-repo-dogfood/test-readiness/summary.json");
    await expectFile(repo, ".krn/dogfood/real-repo-dogfood/test-readiness/summary.md");
  }, 20_000);

  it("writes a manual real-repo execution result without committing or claiming production proof", async () => {
    const repo = await createGitRepoForPreflight();
    await writeFile(path.join(repo, "README.md"), "# Fixture\n\nTiny wording change.\n", "utf8");

    const { result, summary } = runRealRepoExecutionReport({
      KRN_REAL_REPO_EXECUTION_RUN_ID: "test-manual-execution",
      KRN_REAL_REPO_EXECUTION_TARGET_REPO_PATH: repo,
      KRN_REAL_REPO_EXECUTION_WORKTREE_PATH: repo,
      KRN_REAL_REPO_EXECUTION_TARGET_CLEAN_BEFORE: "1",
      KRN_REAL_REPO_EXECUTION_KIND: "manual-codex",
      KRN_REAL_REPO_EXECUTION_CODEX_SESSION_ID: "session-test",
      KRN_REAL_REPO_EXECUTION_CODEX_EXIT_CODE: "0",
      KRN_REAL_REPO_EXECUTION_CODEX_COMMAND_SHAPE:
        "codex -a never -s workspace-write -C <repo> exec <prompt>",
      KRN_REAL_REPO_EXECUTION_PINNED_KRN_PATH: path.join(repo, "..", "bin", "krn"),
      KRN_REAL_REPO_EXECUTION_KRN_IDENTITY_VALID: "1",
      KRN_REAL_REPO_EXECUTION_VALIDATION_COMMAND: "python3 tools/check_all_readonly.py",
      KRN_REAL_REPO_EXECUTION_VALIDATION_STATUS: "pass",
      KRN_REAL_REPO_EXECUTION_VALIDATION_DURATION_SECONDS: "1.25",
      KRN_REAL_REPO_EXECUTION_HOOK_TRUST_STATUS: "unproven",
    });

    expect(result.status).toBe(0);
    expect(summary).toMatchObject({
      schema: "krn-real-repo-execution-result-v1",
      runId: "test-manual-execution",
      status: "pass",
      executionKind: "manual-codex",
      targetRepoPath: repo,
      executionWorktreePath: repo,
      targetRepoCleanBefore: true,
      targetRepoCleanAfter: false,
      validationStatus: "pass",
      changedFiles: ["README.md"],
      forbiddenTouchedFiles: [],
      committedTargetRepo: false,
      pushedTargetRepo: false,
      hookTrustStatus: "unproven",
      productionProof: false,
    });
    expect(summary.summaryJsonPath).toBe(
      path.join(repo, ".krn/dogfood/real-repo-execution/test-manual-execution/summary.json"),
    );
    await expectFile(repo, ".krn/dogfood/real-repo-execution/test-manual-execution/summary.md");
  });
});
