import { describe, expect, it } from "vitest";
import type { ContextPackage } from "../../context/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { parseVerifyCommandString, verifyCommandPolicy } from "./command-policy.js";
import { buildVerifyResult, renderVerifyResultMarkdown, resolveVerifyProfile } from "./verify.js";

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

  it("supports execute mode as configured but does not execute before the engine exists", () => {
    const profile = resolveVerifyProfile({
      commands: ["pnpm test"],
      mode: "execute",
    }).profile;
    const result = buildVerifyResult({ profile });

    expect(result).toMatchObject({
      mode: "execute",
      status: "not-runnable",
      notRunnableReason: "Execute mode is configured, but the execution engine is not implemented",
      executedCommands: [],
    });
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
    ];

    for (const [input, reason] of blockedCases) {
      expect(verifyCommandPolicy(parseVerifyCommandString(input))).toEqual({
        allowed: false,
        reason,
      });
    }
  });
});
