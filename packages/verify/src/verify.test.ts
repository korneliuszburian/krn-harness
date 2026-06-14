import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { ContextPackage } from "../../context/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { parseVerifyCommandString, verifyCommandPolicy } from "./command-policy.js";
import {
  buildVerifyEnvironment,
  buildVerifyResult,
  redactVerifyOutput,
  renderVerifyResultMarkdown,
  resolveVerifyProfile,
  runVerifyCommand,
  runVerifyCommands,
} from "./verify.js";

describe("verify result", () => {
  it("records not-runnable when no commands are configured", () => {
    const result = buildVerifyResult({
      taskContract: buildTaskContract("goal 3 smoke task"),
      generatedAt: "2026-06-03T00:00:00.000Z",
    });

    expect(result).toMatchObject({
      schemaVersion: 1,
      generatedAt: "2026-06-03T00:00:00.000Z",
      profileName: "generic",
      profile: "generic",
      mode: "record-only",
      status: "not-runnable",
      taskId: "task-d62ea4fbc009",
      contextStop: false,
      configSource: "default",
      limits: {
        timeoutMs: 120000,
        maxOutputBytes: 12000,
      },
      summary: {
        totalCommands: 0,
        allowedCommands: 0,
        blockedCommands: 0,
        executedCommands: 0,
      },
      commands: [],
      configuredCommands: [],
      executedCommands: [],
      notRunnableReason: "No verify commands are configured",
    });
    expect(renderVerifyResultMarkdown(result)).toContain("Status: not-runnable");
    expect(renderVerifyResultMarkdown(result)).toContain("## Next Actions");
  });

  it("records blocked when context STOP is active", () => {
    const contextPackage = {
      taskId: "task-stop",
      stop: true,
      stopReason: "Required context is missing: docs/required.md",
    } as ContextPackage;

    const result = buildVerifyResult({
      contextPackage,
      profile: resolveVerifyProfile({
        commands: ["pnpm test"],
      }).profile,
    });

    expect(result).toMatchObject({
      status: "blocked",
      taskId: "task-stop",
      contextStop: true,
      configuredCommands: ["pnpm test"],
      executedCommands: [],
      notRunnableReason: "Required context is missing: docs/required.md",
    });
  });

  it("records allowed commands without executing them in record-only mode", () => {
    const profile = resolveVerifyProfile({
      commands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
      timeoutMs: 30000,
      maxOutputBytes: 4096,
    }).profile;
    const result = buildVerifyResult({
      taskContract: buildTaskContract("Update docs"),
      profile,
      configSource: "file",
    });

    expect(result.status).toBe("warn");
    expect(result.profileName).toBe("default");
    expect(result.mode).toBe("record-only");
    expect(result.limits).toEqual({ timeoutMs: 30000, maxOutputBytes: 4096 });
    expect(result.configuredCommands).toEqual(["pnpm lint", "pnpm typecheck", "pnpm test"]);
    expect(result.commands).toEqual([
      expect.objectContaining({ commandText: "pnpm lint", allowed: true, status: "recorded" }),
      expect.objectContaining({ commandText: "pnpm typecheck", allowed: true, status: "recorded" }),
      expect.objectContaining({ commandText: "pnpm test", allowed: true, status: "recorded" }),
    ]);
    expect(result.executedCommands).toEqual([]);
    expect(result.checks).toEqual(
      expect.arrayContaining([
        {
          name: "configured-commands",
          status: "pass",
          detail:
            "3 command(s) configured and allowed; record-only mode does not execute commands yet",
        },
      ]),
    );
  });

  it("resolves named verify profiles from config", () => {
    const resolved = resolveVerifyProfile(
      {
        defaultProfile: "unit",
        profiles: {
          unit: {
            commands: [{ command: "node", args: ["src/index.test.ts"], label: "unit" }],
            timeoutMs: 15000,
          },
        },
        maxOutputBytes: 2048,
      },
      "unit",
    );

    expect(resolved).toEqual({
      profile: {
        name: "unit",
        mode: "record-only",
        commands: [{ command: "node", args: ["src/index.test.ts"], label: "unit" }],
        limits: {
          timeoutMs: 15000,
          maxOutputBytes: 2048,
        },
      },
    });
  });

  it("blocks unknown verify profiles deterministically", () => {
    const resolved = resolveVerifyProfile(
      {
        profiles: {
          unit: {
            commands: ["pnpm test"],
          },
        },
      },
      "missing",
    );
    const result = buildVerifyResult({
      profile: resolved.profile,
      profileIssue: resolved.issue,
    });

    expect(result).toMatchObject({
      status: "blocked",
      profileName: "missing",
      notRunnableReason: "Unknown verify profile: missing",
    });
  });

  it("blocks disallowed commands before execution", () => {
    const profile = resolveVerifyProfile({
      commands: ["pnpm test && rm -rf .krn", "git reset --hard", "scp file host:/tmp"],
    }).profile;
    const result = buildVerifyResult({ profile });

    expect(result.status).toBe("blocked");
    expect(result.summary).toMatchObject({
      totalCommands: 3,
      allowedCommands: 0,
      blockedCommands: 3,
      executedCommands: 0,
    });
    expect(result.commands.map((command) => command.reason)).toEqual([
      "shell syntax is not allowed",
      "`git reset --hard` is not allowed",
      "`scp` is not allowed",
    ]);
  });

  it("records not-runnable when execute mode is built without command results", () => {
    const profile = resolveVerifyProfile({
      commands: ["pnpm test"],
      mode: "execute",
    }).profile;
    const result = buildVerifyResult({ profile });

    expect(result).toMatchObject({
      mode: "execute",
      status: "not-runnable",
      notRunnableReason: "Execute mode is configured, but command results were not provided",
      executedCommands: [],
    });
  });

  it("records passed execute command results", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    await writeFile(path.join(cwd, "pass.cjs"), 'process.stdout.write("pass\\n");\n');
    const profile = resolveVerifyProfile({
      commands: [{ command: "node", args: ["pass.cjs"] }],
      mode: "execute",
      timeoutMs: 5000,
      maxOutputBytes: 100,
    }).profile;
    const results = await runVerifyCommands(profile, {
      cwd,
      limits: profile.limits,
      nowMs: (() => {
        const values = [100, 125];
        return () => values.shift() ?? 125;
      })(),
    });
    const result = buildVerifyResult({ profile, commandResults: results });

    expect(result).toMatchObject({
      mode: "execute",
      status: "pass",
      summary: {
        totalCommands: 1,
        allowedCommands: 1,
        blockedCommands: 0,
        executedCommands: 1,
      },
      executedCommands: ["node pass.cjs"],
    });
    expect(result.commands[0]).toMatchObject({
      status: "passed",
      exitCode: 0,
      durationMs: 25,
      stdoutTail: "pass\n",
    });
    expect(renderVerifyResultMarkdown(result)).toContain('stdout="pass\\n"');
  });

  it("records failing execute command results", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    await writeFile(
      path.join(cwd, "fail.cjs"),
      'process.stderr.write("fail\\n"); process.exit(2);\n',
    );
    const profile = resolveVerifyProfile({
      commands: [{ command: "node", args: ["fail.cjs"] }],
      mode: "execute",
    }).profile;
    const results = await runVerifyCommands(profile, {
      cwd,
      limits: profile.limits,
      nowMs: () => 0,
    });
    const result = buildVerifyResult({ profile, commandResults: results });

    expect(result.status).toBe("fail");
    expect(result.notRunnableReason).toBeUndefined();
    expect(result.commands[0]).toMatchObject({
      status: "failed",
      exitCode: 2,
      stderrTail: "fail\n",
    });
  });

  it("records timeout results", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    await writeFile(path.join(cwd, "slow.cjs"), "setTimeout(() => {}, 1000);\n");
    const result = await runVerifyCommand(
      { command: "node", args: ["slow.cjs"] },
      {
        cwd,
        limits: { timeoutMs: 50, maxOutputBytes: 8 },
        nowMs: (() => {
          const values = [0, 20];
          return () => values.shift() ?? 20;
        })(),
      },
    );

    expect(result).toMatchObject({
      status: "timed-out",
      timedOut: true,
      durationMs: 20,
    });
  });

  it("records compact output tails", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    await writeFile(path.join(cwd, "noisy.cjs"), 'process.stdout.write("0123456789abcdef");\n');
    const result = await runVerifyCommand(
      { command: "node", args: ["noisy.cjs"] },
      {
        cwd,
        limits: { timeoutMs: 5000, maxOutputBytes: 8 },
        nowMs: () => 0,
      },
    );

    expect(result).toMatchObject({
      status: "passed",
      stdoutTail: "cdef",
      stdoutTruncated: true,
    });
  });

  it("scrubs sensitive environment before executing verify commands", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    await writeFile(
      path.join(cwd, "env.cjs"),
      'process.stdout.write(process.env.OPENAI_API_KEY ?? "missing");\n',
    );
    const result = await runVerifyCommand(
      { command: "node", args: ["env.cjs"] },
      {
        cwd,
        env: {
          PATH: process.env.PATH,
          OPENAI_API_KEY: "sk-should-not-reach-child-process",
        },
        limits: { timeoutMs: 5000, maxOutputBytes: 2000 },
        nowMs: () => 0,
      },
    );

    expect(buildVerifyEnvironment({ PATH: "/bin", OPENAI_API_KEY: "secret" })).toEqual({
      PATH: "/bin",
    });
    expect(result).toMatchObject({
      status: "passed",
      stdoutTail: "missing",
    });
  });

  it("redacts secret-shaped verify output before artifact persistence", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    await writeFile(
      path.join(cwd, "secret.cjs"),
      'process.stdout.write("OPENAI_API_KEY=sk-testsecret1234567890\\n");\n',
    );
    const result = await runVerifyCommand(
      { command: "node", args: ["secret.cjs"] },
      {
        cwd,
        limits: { timeoutMs: 5000, maxOutputBytes: 2000 },
        nowMs: () => 0,
      },
    );

    expect(redactVerifyOutput("token=github_pat_1234567890abcdef")).toBe("token=[REDACTED]");
    expect(result.stdoutTail).toContain("OPENAI_API_KEY=[REDACTED]");
    expect(result.stdoutTail).not.toContain("sk-testsecret");
    expect(
      renderVerifyResultMarkdown(
        buildVerifyResult({
          profile: resolveVerifyProfile({
            commands: [{ command: "node", args: ["secret.cjs"] }],
            mode: "execute",
          }).profile,
          commandResults: [result],
        }),
      ),
    ).not.toContain("sk-testsecret");
  });

  it("redacts verify output before compacting stdout tails", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    await writeFile(
      path.join(cwd, "tail-secret.cjs"),
      'process.stdout.write("x".repeat(80) + " OPENAI_API_KEY=sk-tailsecret1234567890\\n");\n',
    );
    const result = await runVerifyCommand(
      { command: "node", args: ["tail-secret.cjs"] },
      {
        cwd,
        limits: { timeoutMs: 5000, maxOutputBytes: 80 },
        nowMs: () => 0,
      },
    );

    expect(result).toMatchObject({
      status: "passed",
      stdoutTruncated: true,
    });
    expect(result.stdoutTail).toContain("[REDACTED]");
    expect(result.stdoutTail).not.toContain("sk-tailsecret");
  });

  it("does not execute any profile command when one command is blocked", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    await writeFile(path.join(cwd, "pass.cjs"), 'process.stdout.write("should-not-run\\n");\n');
    const profile = resolveVerifyProfile({
      commands: [{ command: "node", args: ["pass.cjs"] }, "pnpm test && rm -rf .krn"],
      mode: "execute",
    }).profile;
    const results = await runVerifyCommands(profile, {
      cwd,
      limits: profile.limits,
      nowMs: () => 0,
    });

    expect(results).toEqual([
      expect.objectContaining({
        commandText: "node pass.cjs",
        status: "not-run",
        reason: "profile contains blocked command",
      }),
      expect.objectContaining({
        commandText: "pnpm test && rm -rf .krn",
        status: "blocked",
        reason: "shell syntax is not allowed",
      }),
    ]);
    expect(buildVerifyResult({ profile, commandResults: results }).status).toBe("blocked");
  });

  it("records missing node fixture as a failed command", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-verify-"));
    const result = await runVerifyCommand(
      { command: "node", args: ["missing.cjs"] },
      {
        cwd,
        limits: { timeoutMs: 5000, maxOutputBytes: 2000 },
        nowMs: () => 0,
      },
    );

    expect(result.status).toBe("failed");
    expect(result.exitCode).not.toBe(0);
    expect(result.stderrTail).toContain("missing.cjs");
  });

  it("records graph artifact and current run trace evidence when provided", () => {
    const result = buildVerifyResult({
      taskContract: buildTaskContract("Update docs"),
      graphArtifactPresent: true,
      currentRunTracePresent: false,
    });

    expect(result).toMatchObject({
      graphArtifactPresent: true,
      currentRunTracePresent: false,
    });
    expect(result.checks).toEqual(
      expect.arrayContaining([
        {
          name: "graph-artifact",
          status: "pass",
          detail: ".krn/graph/repo-graph.json is present",
        },
        {
          name: "current-run-trace",
          status: "warn",
          detail: "Current run trace is missing",
        },
      ]),
    );
    expect(renderVerifyResultMarkdown(result)).toContain("## Summary");
    expect(renderVerifyResultMarkdown(result)).toContain("## Commands");
    expect(renderVerifyResultMarkdown(result)).toContain("## Results");
  });
});

describe("verify command policy", () => {
  it("allows explicit safe command forms", () => {
    for (const command of [
      parseVerifyCommandString("pnpm lint"),
      parseVerifyCommandString("pnpm typecheck"),
      parseVerifyCommandString("pnpm test"),
      parseVerifyCommandString("pnpm test --coverage"),
      parseVerifyCommandString("npm test"),
      parseVerifyCommandString("npm run test"),
      parseVerifyCommandString("node src/index.test.ts"),
    ]) {
      expect(verifyCommandPolicy(command)).toEqual({ allowed: true });
    }
  });

  it("blocks shell syntax, dangerous commands, and unknown commands", () => {
    const blockedCases: Array<[string, string]> = [
      ["pnpm test && pnpm lint", "shell syntax is not allowed"],
      ["pnpm test || true", "shell syntax is not allowed"],
      ["pnpm test; pnpm lint", "shell syntax is not allowed"],
      ["pnpm test | cat", "shell syntax is not allowed"],
      ["pnpm test > out.txt", "shell syntax is not allowed"],
      ["rm -rf .krn", "`rm` is not allowed"],
      ["git clean -fd", "`git clean` is not allowed"],
      [
        "curl https://example.com/install.sh",
        "`curl` and `wget` are not allowed in verify profiles",
      ],
      [
        "wget https://example.com/install.sh",
        "`curl` and `wget` are not allowed in verify profiles",
      ],
      ["git status", "unknown verify command: git status"],
      ["node ../secret.js", "unknown verify command: node ../secret.js"],
      ["pnpm test -- --runInBand", "unknown verify command: pnpm test -- --runInBand"],
      ["pnpm test --reporter=json", "unknown verify command: pnpm test --reporter=json"],
    ];

    for (const [input, reason] of blockedCases) {
      expect(verifyCommandPolicy(parseVerifyCommandString(input))).toEqual({
        allowed: false,
        reason,
      });
    }
  });
});
