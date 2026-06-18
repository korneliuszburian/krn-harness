import { mkdir, mkdtemp, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  copyFixtureRepo,
  expectFile,
  type OperatorSummaryFixture,
  type ReviewResultFixture,
  readJson,
  readRunTraceEvents,
  readTraceEvents,
  runInCwd,
  runInTemp,
} from "./cli-test-utils.js";

describe("krn CLI review and operator summary", () => {
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
      ["review", "--write"],
      ["summary", "--write"],
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
      ".krn/current/operator-summary.json",
      ".krn/current/operator-summary.md",
      ".krn/current/review-summary.json",
      ".krn/current/review-summary.md",
      ".krn/current/review-result.json",
      ".krn/current/review-result.md",
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
      "review.ran",
      "summary.ran",
    ]);
    expect((await readRunTraceEvents(cwd, contract.id)).map((event) => event.name)).toEqual([
      "task.started",
      "graph.built",
      "context.built",
      "verify.ran",
      "handoff.created",
      "doctor.ran",
      "eval.ran",
      "review.ran",
      "summary.ran",
    ]);
  });

  it("rejects unsupported review options", async () => {
    const result = await runInTemp(["review", "--llm"]);

    expect(result.code).toBe(1);
    expect(result.stderr).toContain("KRN review: `--llm` is not implemented");
  });

  it("runs deterministic reviewers without executing model or verify commands", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");

    for (const args of [
      ["install"],
      ["start", "Review deterministic local artifacts after safe fixture verification."],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const review = await runInCwd(cwd, ["review", "--write"]);

    expect(review.code).toBe(0);
    expect(review.stdout).toContain("KRN review:");
    expect(review.stdout).toContain("records: 7");
    await expectFile(cwd, ".krn/current/review-summary.json");
    await expectFile(cwd, ".krn/current/review-summary.md");
    await expectFile(cwd, ".krn/current/review-result.json");
    await expectFile(cwd, ".krn/current/review-result.md");

    const result = await readJson<ReviewResultFixture>(cwd, ".krn/current/review-summary.json");
    expect(result.schema).toBe("krn-review-summary-v1");
    expect(result.reviewers.map((item) => item.reviewer)).toEqual([
      "safety",
      "evidence",
      "context",
      "verify",
      "handoff",
      "dogfood",
      "release",
    ]);
    expect(result.reviewers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reviewer: "evidence", status: "pass" }),
        expect.objectContaining({ reviewer: "verify", status: "pass" }),
        expect.objectContaining({ reviewer: "handoff", status: "pass" }),
        expect.objectContaining({ reviewer: "release", status: "warn" }),
      ]),
    );
    expect(result.reviewers.find((item) => item.reviewer === "dogfood")?.status).toBe("warn");
    expect((await readTraceEvents(cwd)).map((event) => event.name)).toContain("review.ran");
  }, 20_000);

  it("fails target validation boundaries that do not match verify evidence", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await writeFile(path.join(cwd, "pass.cjs"), "console.log('pass');\n", "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "unit",
            profiles: {
              unit: {
                commands: ["node pass.cjs"],
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
          prompt: "Validate target boundary mismatch without mutating target state.",
          expectedTouchedFiles: ["pass.cjs"],
          forbiddenTouchedFiles: [".env", ".git/**"],
          boundaries: {
            targetValidation: {
              authority: "target-owned",
              command: "node target.test.js",
              coverage: "full-suite",
              reason: "The task claims this target validation command is authoritative.",
            },
            rollback: {
              boundary: "No automatic rollback; discard the isolated checkout if invalid.",
            },
            noPush: true,
            noMerge: true,
            targetIsolation: {
              isolated: true,
              sourceCheckoutRejected: true,
              isolatedPath: "/tmp/target-proof",
              baseCommit: "fixture-base",
              reason: "Target proof runs outside the source checkout.",
            },
            targetApproval: {
              required: true,
              approvalRef: "operator-approved-fixture-run",
            },
            protectedData: {
              allowed: false,
              paths: [".env"],
              reason: "Protected data is outside this target proof.",
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    for (const args of [
      ["start", "--task-spec", "task.json"],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const verify = result.reviewers.find((item) => item.reviewer === "verify");

    expect(verify).toMatchObject({
      status: "fail",
      summary:
        "Verify status is pass in execute mode. Task-spec target validation boundary was checked.",
    });
    expect(verify?.evidence).toEqual([
      ".krn/current/verify-result.json",
      ".krn/current/task-contract.json",
    ]);
    expect(verify?.findings).toEqual([
      "target validation command is not configured: node target.test.js",
    ]);
    expect(result.blockers).toContain(
      "target validation command is not configured: node target.test.js",
    );
  }, 20_000);

  it("fails target validation task specs missing target-run boundaries", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
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
          prompt: "Validate target proof boundary completeness.",
          boundaries: {
            targetValidation: {
              authority: "target-owned",
              command: "node target.test.js",
              coverage: "full-suite",
              reason: "Target test is the declared validation authority.",
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    for (const args of [
      ["start", "--task-spec", "task.json"],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const verify = result.reviewers.find((item) => item.reviewer === "verify");

    expect(verify).toMatchObject({ status: "fail" });
    expect(verify?.findings).toEqual([
      "target validation task spec is missing required target-run boundaries: expected touched files, forbidden touched files, rollback boundary, no-push boundary, no-merge boundary, target approval boundary, target isolation boundary, protected data boundary",
    ]);
    expect(result.blockers).toContain(
      "target validation task spec is missing required target-run boundaries: expected touched files, forbidden touched files, rollback boundary, no-push boundary, no-merge boundary, target approval boundary, target isolation boundary, protected data boundary",
    );
  }, 20_000);

  it("fails target validation task specs missing approval references", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
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
          prompt: "Validate target proof approval reference completeness.",
          expectedTouchedFiles: ["target.test.js"],
          forbiddenTouchedFiles: [".env", ".git/**"],
          boundaries: {
            targetValidation: {
              authority: "target-owned",
              command: "node target.test.js",
              coverage: "full-suite",
              reason: "Target test is the declared validation authority.",
            },
            rollback: {
              boundary: "No automatic rollback; discard the isolated checkout if invalid.",
            },
            noPush: true,
            noMerge: true,
            targetIsolation: {
              isolated: true,
              sourceCheckoutRejected: true,
              isolatedPath: "/tmp/target-proof",
              baseCommit: "fixture-base",
              reason: "Target proof runs outside the source checkout.",
            },
            targetApproval: {
              required: true,
            },
            protectedData: {
              allowed: false,
              paths: [".env"],
              reason: "Protected data is outside this target proof.",
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    for (const args of [
      ["start", "--task-spec", "task.json"],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const verify = result.reviewers.find((item) => item.reviewer === "verify");

    expect(verify).toMatchObject({ status: "fail" });
    expect(verify?.findings).toEqual([
      "target validation task spec is missing required target-run boundaries: target approval reference",
    ]);
    expect(result.blockers).toContain(
      "target validation task spec is missing required target-run boundaries: target approval reference",
    );
  }, 20_000);

  it("fails Python wrapper target validation without documented limits", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, "tools"), { recursive: true });
    await writeFile(path.join(cwd, "tools", "check_quality.py"), "print('target pass')\n", "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "unit",
            profiles: {
              unit: {
                commands: ["python3 tools/check_quality.py"],
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
          prompt: "Validate Python wrapper target proof safety metadata.",
          expectedTouchedFiles: ["tools/check_quality.py"],
          forbiddenTouchedFiles: [".env", ".git/**"],
          boundaries: {
            targetValidation: {
              authority: "target-owned",
              command: "python3 tools/check_quality.py",
              coverage: "full-suite",
              reason: "Target-owned wrapper calls the local quality gate.",
            },
            rollback: {
              boundary: "No automatic rollback; discard the isolated checkout if invalid.",
            },
            noPush: true,
            noMerge: true,
            targetIsolation: {
              isolated: true,
              sourceCheckoutRejected: true,
              isolatedPath: "/tmp/target-proof",
              baseCommit: "fixture-base",
              reason: "Target proof runs outside the source checkout.",
            },
            targetApproval: {
              required: true,
              approvalRef: "operator-approved-fixture-run",
            },
            protectedData: {
              allowed: false,
              paths: [".env"],
              reason: "Protected data is outside this target proof.",
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    for (const args of [
      ["start", "--task-spec", "task.json"],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const verify = result.reviewers.find((item) => item.reviewer === "verify");

    expect(verify).toMatchObject({ status: "fail" });
    expect(verify?.findings).toEqual([
      "target validation wrapper command is missing limitations: python3 tools/check_quality.py",
      "target validation wrapper command is missing unsafe conditions: python3 tools/check_quality.py",
    ]);
    expect(result.blockers).toContain(
      "target validation wrapper command is missing limitations: python3 tools/check_quality.py",
    );
    expect(result.blockers).toContain(
      "target validation wrapper command is missing unsafe conditions: python3 tools/check_quality.py",
    );
  }, 20_000);

  it("accepts Python wrapper target validation with documented limits", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, "tools"), { recursive: true });
    await writeFile(path.join(cwd, "tools", "check_quality.py"), "print('target pass')\n", "utf8");
    await writeFile(
      path.join(cwd, "krn.config.json"),
      JSON.stringify(
        {
          version: 1,
          verify: {
            defaultProfile: "unit",
            profiles: {
              unit: {
                commands: ["python3 tools/check_quality.py"],
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
          prompt: "Validate complete Python wrapper target proof metadata.",
          expectedTouchedFiles: ["krn.config.json", "tools/check_quality.py"],
          forbiddenTouchedFiles: [".env", ".git/**"],
          boundaries: {
            targetValidation: {
              authority: "target-owned",
              command: "python3 tools/check_quality.py",
              coverage: "fast-quality-gate",
              reason: "Target-owned wrapper calls the local quality gate.",
              limitations: ["Focused wrapper gate only; not production or CI proof."],
              unsafeIf: [
                "Invalid if it reads protected data, uses network, or hides full-suite failure.",
              ],
            },
            rollback: {
              boundary: "No automatic rollback; discard the isolated checkout if invalid.",
            },
            noPush: true,
            noMerge: true,
            targetIsolation: {
              isolated: true,
              sourceCheckoutRejected: true,
              isolatedPath: "/tmp/target-proof",
              baseCommit: "fixture-base",
              reason: "Target proof runs outside the source checkout.",
            },
            targetApproval: {
              required: true,
              approvalRef: "operator-approved-fixture-run",
            },
            protectedData: {
              allowed: false,
              paths: [".env"],
              reason: "Protected data is outside this target proof.",
            },
          },
        },
        null,
        2,
      ),
      "utf8",
    );

    for (const args of [
      ["start", "--task-spec", "task.json"],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const verify = result.reviewers.find((item) => item.reviewer === "verify");

    expect(verify).toMatchObject({ status: "warn" });
    expect(verify?.findings).toEqual([
      "target validation coverage is fast-quality-gate, not full-suite",
      "target validation declares local wrapper/config adoption overhead files: krn.config.json, tools/check_quality.py",
    ]);
    expect(result.blockers).not.toContain(
      "target validation wrapper command is missing limitations: python3 tools/check_quality.py",
    );
    expect(result.blockers).not.toContain(
      "target validation wrapper command is missing unsafe conditions: python3 tools/check_quality.py",
    );
  }, 20_000);

  it("keeps dogfood reviewer findings focused when historical skips accumulate", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));

    for (const runId of ["run-1", "run-2", "run-3"]) {
      const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-skipped", runId);
      await mkdir(runDir, { recursive: true });
      await writeFile(
        path.join(runDir, "summary.json"),
        JSON.stringify(
          {
            schema: "krn-real-repo-dogfood-v1",
            status: "skipped",
            outcomeKind: "skipped-missing-env",
          },
          null,
          2,
        ),
      );
    }

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "warn",
      summary:
        "Found 3 dogfood summary artifact(s): 0 failing, 0 invalid, 0 blocked, 3 skipped, 0 readiness-only, 0 preflight-only, 0 execution-result.",
    });
    expect(dogfood?.evidence).toHaveLength(3);
    expect(dogfood?.findings).toEqual([
      "skipped dogfood summary: .krn/dogfood/real-repo-skipped/run-3/summary.json",
      "skipped dogfood summary: 2 older artifact(s) omitted; see evidence list.",
    ]);
  });

  it("treats readiness-only dogfood as warning rather than execution proof", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-dogfood", "readiness-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-dogfood-v1",
          status: "readiness",
          outcomeKind: "readiness-only",
          validationClaim: "readiness-only; not real-repo execution validation",
        },
        null,
        2,
      ),
    );

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "warn",
      summary:
        "Found 1 dogfood summary artifact(s): 0 failing, 0 invalid, 0 blocked, 0 skipped, 1 readiness-only, 0 preflight-only, 0 execution-result.",
      findings: [
        "readiness-only dogfood summary: .krn/dogfood/real-repo-dogfood/readiness-run/summary.json",
      ],
      nextActions: [
        "Review blocked/skipped/readiness/preflight/execution dogfood reports before claiming execution proof.",
      ],
    });
  });

  it("treats preflight-only dogfood as warning rather than execution proof", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-preflight", "latest");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-preflight-v1",
          eligible: true,
          krnIdentityValid: true,
          blockers: [],
          warnings: ["missing_krn_config_json"],
        },
        null,
        2,
      ),
    );

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "warn",
      summary:
        "Found 1 dogfood summary artifact(s): 0 failing, 0 invalid, 0 blocked, 0 skipped, 0 readiness-only, 1 preflight-only, 0 execution-result.",
      findings: [
        "preflight-only dogfood summary: .krn/dogfood/real-repo-preflight/latest/summary.json",
      ],
      nextActions: [
        "Review blocked/skipped/readiness/preflight/execution dogfood reports before claiming execution proof.",
      ],
    });
  });

  it("treats manual execution with unproven hook trust as warning evidence", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "manual-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "pass",
          executionKind: "manual-codex",
          validationStatus: "pass",
          forbiddenTouchedFiles: [],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "unproven",
          productionProof: false,
        },
        null,
        2,
      ),
    );

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "warn",
      summary:
        "Found 1 dogfood summary artifact(s): 0 failing, 0 invalid, 0 blocked, 0 skipped, 0 readiness-only, 0 preflight-only, 1 execution-result.",
      findings: [
        "execution-result warning: .krn/dogfood/real-repo-execution/manual-run/summary.json",
      ],
      nextActions: [
        "Review blocked/skipped/readiness/preflight/execution dogfood reports before claiming execution proof.",
      ],
    });
  });

  it("fails unsafe real-repo execution results", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "unsafe-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "pass",
          executionKind: "manual-codex",
          validationStatus: "pass",
          forbiddenTouchedFiles: [".env"],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "partially-proven",
          productionProof: false,
        },
        null,
        2,
      ),
    );

    const review = await runInCwd(cwd, ["review", "--json"]);
    const result = JSON.parse(review.stdout) as ReviewResultFixture;
    const dogfood = result.reviewers.find((item) => item.reviewer === "dogfood");

    expect(dogfood).toMatchObject({
      status: "fail",
      findings: [
        "unsafe execution result: .krn/dogfood/real-repo-execution/unsafe-run/summary.json",
      ],
      nextActions: ["Inspect failing, invalid, or unsafe dogfood reports."],
    });
  });

  it("prints operator summary JSON without requiring existing .krn state", async () => {
    const result = await runInTemp(["summary", "--json"]);

    expect(result.code).toBe(0);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;
    expect(summary.schema).toBe("krn-operator-summary-v1");
    expect(summary.status).toBe("warn");
    expect(summary.currentTask.status).toBe("missing");
    expect(summary.hooks.status).toBe("unproven");
    expect(summary.realRepoDogfood.status).toBe("unproven");
    expect(summary.reviewers.status).toBe("missing");
    await expect(
      stat(path.join(result.cwd, ".krn", "current", "operator-summary.json")),
    ).rejects.toThrow();
  });

  it("prints conservative operator summary limits in markdown", async () => {
    const result = await runInTemp(["summary"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain(
      "Skipped, readiness, missing, unproven, manual-diagnostic-only, and partially-proven are never production proof states.",
    );
  });

  it("surfaces missing real-repo dogfood env in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-skipped", "missing-env");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-dogfood-v1",
          status: "skipped",
          outcomeKind: "skipped-missing-env",
          missingEnv: ["KRN_REAL_REPO_DOGFOOD_PATH", "KRN_REAL_REPO_DOGFOOD_APPROVED=1"],
          repoPath: null,
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "skipped",
      outcomeKind: "skipped-missing-env",
      missingEnv: ["KRN_REAL_REPO_DOGFOOD_PATH", "KRN_REAL_REPO_DOGFOOD_APPROVED=1"],
    });
    expect(summary.realRepoDogfood.summary).toBe(
      "Real-repo dogfood was skipped because required environment is missing: KRN_REAL_REPO_DOGFOOD_PATH, KRN_REAL_REPO_DOGFOOD_APPROVED=1.",
    );
    expect(summary.nextActions).toContain(
      "Set KRN_REAL_REPO_DOGFOOD_PATH and KRN_REAL_REPO_DOGFOOD_APPROVED=1, then rerun scripts/krn-real-repo-dogfood.sh.",
    );
  });

  it("uses readiness dogfood next command in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-dogfood", "readiness-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-dogfood-v1",
          status: "readiness",
          outcomeKind: "readiness-only",
          repoPath: cwd,
          nextCommand: "Review readiness artifact before approving paid/manual execution.",
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "readiness",
      outcomeKind: "readiness-only",
    });
    expect(summary.nextActions).toContain(
      "Review readiness artifact before approving paid/manual execution.",
    );
    expect(summary.nextActions).not.toContain(
      "Run real-repo dogfood on an approved non-protected repository.",
    );
  });

  it("surfaces preflight-only dogfood as unproven in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-preflight", "latest");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-preflight-v1",
          eligible: true,
          repoPath: cwd,
          blockers: [],
          warnings: ["missing_krn_config_json"],
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "unproven",
      outcomeKind: "preflight-only",
      summary: "Only real-repo preflight summary exists; readiness/execution remains unproven.",
    });
    expect(summary.nextActions).toContain(
      "Run scripts/krn-real-repo-dogfood.sh with approved env to produce readiness or execution state.",
    );
  });

  it("surfaces manual real-repo execution evidence without production proof", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "manual-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "pass",
          executionKind: "manual-codex",
          targetRepoPath: cwd,
          executionWorktreePath: cwd,
          validationStatus: "pass",
          forbiddenTouchedFiles: [],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "unproven",
          productionProof: false,
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "execution-evidence",
      repoPath: cwd,
      executionWorktreePath: cwd,
      outcomeKind: "manual-codex",
      executionKind: "manual-codex",
      validationStatus: "pass",
      productionProof: false,
      hookTrustStatus: "unproven",
      summary:
        "Real-repo dogfood has manual-codex execution evidence; production proof remains false.",
    });
    expect(summary.nextActions).toContain(
      "Run a non-bypass Codex hook trust probe before claiming hook validation.",
    );
  });

  it("fails unsafe real-repo execution evidence in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "unsafe-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "pass",
          executionKind: "manual-codex",
          repoPath: cwd,
          validationStatus: "pass",
          forbiddenTouchedFiles: [".env"],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "partially-proven",
          productionProof: false,
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "fail",
      summary:
        "Real-repo execution result is unsafe: forbidden files, target commit/push, or production-proof overclaim detected.",
    });
    expect(summary.blockers).toContain(
      "realRepoDogfood: Real-repo execution result is unsafe: forbidden files, target commit/push, or production-proof overclaim detected.",
    );
  });

  it("uses execution-result blocker next action in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const runDir = path.join(cwd, ".krn", "dogfood", "real-repo-execution", "blocked-run");
    await mkdir(runDir, { recursive: true });
    await writeFile(
      path.join(runDir, "summary.json"),
      JSON.stringify(
        {
          schema: "krn-real-repo-execution-result-v1",
          status: "blocked",
          executionKind: "blocked",
          targetRepoPath: cwd,
          executionWorktreePath: cwd,
          validationStatus: "pass",
          forbiddenTouchedFiles: [],
          committedTargetRepo: false,
          pushedTargetRepo: false,
          hookTrustStatus: "unproven",
          productionProof: false,
          nextActions: ["Set KRN_REAL_REPO_CODEX_APPROVED=1 only after operator approval."],
        },
        null,
        2,
      ),
    );

    const result = await runInCwd(cwd, ["summary", "--json"]);
    const summary = JSON.parse(result.stdout) as OperatorSummaryFixture;

    expect(summary.realRepoDogfood).toMatchObject({
      status: "blocked",
      executionKind: "blocked",
      validationStatus: "pass",
      productionProof: false,
    });
    expect(summary.nextActions).toContain(
      "Set KRN_REAL_REPO_CODEX_APPROVED=1 only after operator approval.",
    );
  });

  it("writes operator summary with reviewer aggregate when review summary exists", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");

    for (const args of [
      ["install"],
      ["start", "Summarize deterministic operator evidence."],
      ["graph"],
      ["context"],
      ["verify", "--execute"],
      ["handoff"],
      ["review", "--write"],
      ["summary", "--write"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    await expectFile(cwd, ".krn/current/operator-summary.json");
    await expectFile(cwd, ".krn/current/operator-summary.md");
    const summary = await readJson<OperatorSummaryFixture>(
      cwd,
      ".krn/current/operator-summary.json",
    );

    expect(summary.schema).toBe("krn-operator-summary-v1");
    expect(summary.currentTask.status).toBe("pass");
    expect(summary.verify).toMatchObject({
      status: "pass",
      mode: "execute",
      executedCommands: 1,
    });
    expect(summary.hooks.status).toBe("unproven");
    expect(summary.realRepoDogfood.status).toBe("unproven");
    expect(summary.reviewers).toMatchObject({
      status: "warn",
      total: 7,
    });
    expect(summary.nextActions).toContain(
      "Run a non-bypass Codex hook trust probe before claiming hook validation.",
    );
    expect((await readTraceEvents(cwd)).map((event) => event.name)).toContain("summary.ran");
  }, 20_000);

  it("classifies manual hook trace evidence as diagnostic-only in operator summary", async () => {
    const cwd = await copyFixtureRepo("downstream-basic");

    for (const args of [
      ["install"],
      ["start", "Check manual hook evidence semantics."],
      ["graph"],
      ["context"],
      ["hook", "codex", "SessionStart"],
    ]) {
      await expect(runInCwd(cwd, args)).resolves.toMatchObject({ code: 0 });
    }

    const summary = await runInCwd(cwd, ["summary", "--json"]);
    const result = JSON.parse(summary.stdout) as OperatorSummaryFixture;

    expect(result.hooks).toMatchObject({
      status: "manual-diagnostic-only",
      hookReceivedCount: 1,
      hookTrustStatus: "manual-diagnostic-only",
    });
    expect(result.hooks.summary).toContain("Only diagnostic-level hook.received events exist");
  }, 20_000);

  it("classifies trusted hook trace markers as partially proven in operator summary", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "traces"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "traces", "trace.jsonl"),
      `${JSON.stringify({
        id: "trace-trusted-hook",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          payloadSource: "codex-trusted-hook",
          trustedHookLoad: true,
          decision: "allow",
          enforced: false,
        },
      })}\n`,
      "utf8",
    );

    const summary = await runInCwd(cwd, ["summary", "--json"]);
    const result = JSON.parse(summary.stdout) as OperatorSummaryFixture;

    expect(result.hooks).toMatchObject({
      status: "partially-proven",
      hookReceivedCount: 1,
      hookTrustStatus: "partially-proven",
    });
    expect(result.hooks.summary).toContain("only partially proven");
    expect(result.nextActions).not.toContain(
      "Run a non-bypass Codex hook trust probe before claiming hook validation.",
    );
  });
});
