import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildTaskContract } from "../../task-contract/src/index.js";
import {
  readTraceEvents,
  runInCwd,
  runInTemp,
  supportedP0CodexHookEvents,
} from "./cli-test-utils.js";

function taskContractJson(id: string, task: string): string {
  return `${JSON.stringify({ ...buildTaskContract(task), id }, null, 2)}\n`;
}

describe("krn CLI hook guardrails", () => {
  it("handles Codex hook events with deterministic trace output", async () => {
    const result = await runInTemp(["hook", "codex", "SessionStart"]);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      provider: "codex",
      event: "SessionStart",
      supported: true,
      status: "ok",
      decision: "allow",
      enforced: false,
      payloadSource: "placeholder",
      findings: [],
      detail: "P0 hook guardrails passed; hooks remain guardrails and trace points, not a sandbox",
      operatorMessageVersion: "hook-operator-message-v1",
      userFacingMessage: {
        en: "Hook guardrails passed. Continue.",
        pl: "Guardrails hooka przeszły. Możesz kontynuować.",
      },
      remediationCodes: [],
      remediationHints: [],
    });

    for (const event of supportedP0CodexHookEvents) {
      const supported = await runInCwd(result.cwd, ["hook", "codex", event]);
      expect(supported.code).toBe(0);
      expect(JSON.parse(supported.stdout)).toMatchObject({
        provider: "codex",
        event,
        supported: true,
        decision: expect.any(String),
        enforced: false,
        payloadSource: "placeholder",
        findings: expect.any(Array),
        operatorMessageVersion: "hook-operator-message-v1",
        userFacingMessage: expect.objectContaining({
          en: expect.any(String),
          pl: expect.any(String),
        }),
        remediationCodes: expect.any(Array),
        remediationHints: expect.any(Array),
      });
    }

    const unknown = await runInCwd(result.cwd, ["hook", "codex", "UnknownEvent"]);
    expect(unknown.code).toBe(0);
    expect(JSON.parse(unknown.stdout)).toMatchObject({
      provider: "codex",
      event: "UnknownEvent",
      supported: false,
      status: "ignored",
      decision: "allow",
      enforced: false,
      payloadSource: "placeholder",
      findings: [],
      operatorMessageVersion: "hook-operator-message-v1",
      remediationCodes: [],
    });

    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          provider: "codex",
          event: "SessionStart",
          supported: true,
          status: "ok",
          decision: "allow",
          enforced: false,
          payloadSource: "placeholder",
          detail:
            "P0 hook guardrails passed; hooks remain guardrails and trace points, not a sandbox",
          findingCodes: [],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: [],
          tracePayloadMode: "full",
        },
      },
      ...supportedP0CodexHookEvents.map((event) => ({
        name: "hook.received",
        data: {
          provider: "codex",
          event,
          supported: true,
          status: expect.any(String),
          decision: expect.any(String),
          enforced: false,
          payloadSource: "placeholder",
          findingCodes: expect.any(Array),
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: expect.any(Array),
          tracePayloadMode: "full",
        },
      })),
      {
        name: "hook.received",
        data: {
          provider: "codex",
          event: "UnknownEvent",
          supported: false,
          status: "ignored",
          decision: "allow",
          enforced: false,
          payloadSource: "placeholder",
          detail: "Unsupported Codex hook event ignored by P0 hook guardrail",
          findingCodes: [],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: [],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("writes continuation state on PreCompact and surfaces it on SessionStart", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      taskContractJson("task-hook", "Continue after compaction"),
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          taskId: "task-hook",
          items: [],
          buckets: {
            mustRead: [
              {
                path: "packages/hooks/src/codex-hook-entry.ts",
                reason: "Hook entry",
                priority: 10,
                bucket: "must-read",
                status: "available",
              },
            ],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 1, present: 1, missing: 0, confidence: "high" },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "verify-result.json"),
      `${JSON.stringify({ taskId: "task-hook", status: "pass" }, null, 2)}\n`,
      "utf8",
    );
    await writeFile(path.join(cwd, ".krn", "current", "handoff.md"), "# Handoff\n", "utf8");
    await writeFile(
      path.join(cwd, ".krn", "current", "run-result.json"),
      `${JSON.stringify({ schema: "krn.run-result.v1", status: "verified" }, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "operator-report.json"),
      `${JSON.stringify({ schema: "krn.operator-report.v1", verdict: "pass" }, null, 2)}\n`,
      "utf8",
    );

    const preCompact = await runInCwd(cwd, ["hook", "codex", "PreCompact"]);
    expect(preCompact.code).toBe(0);
    expect(JSON.parse(preCompact.stdout)).toMatchObject({
      event: "PreCompact",
      status: "ok",
      decision: "allow",
      enforced: false,
      findings: [
        expect.objectContaining({
          code: "pre-compact-continuation-state-written",
          severity: "info",
        }),
      ],
      remediationCodes: ["read-continuation-state"],
    });

    const continuationState = JSON.parse(
      await readFile(path.join(cwd, ".krn", "current", "continuation-state.json"), "utf8"),
    ) as {
      schema: string;
      createdAt: string;
      triggerEvent: string;
      task: { id: string | null };
      proof: { productionProof: boolean; hookTrustStatus: string };
    };
    expect(continuationState).toMatchObject({
      schema: "krn.continuation-state.v1",
      createdAt: "2026-06-03T00:00:00.000Z",
      triggerEvent: "PreCompact",
      task: { id: "task-hook" },
      proof: {
        productionProof: false,
        hookTrustStatus: "unproven",
      },
    });
    await expect(
      readFile(path.join(cwd, ".krn", "current", "continuation-state.md"), "utf8"),
    ).resolves.toContain("Read the continuation handoff and continue");

    const sessionStart = await runInCwd(cwd, ["hook", "codex", "SessionStart"]);
    expect(sessionStart.code).toBe(0);
    expect(JSON.parse(sessionStart.stdout)).toMatchObject({
      event: "SessionStart",
      status: "warn",
      decision: "warn",
      enforced: false,
      findings: [
        expect.objectContaining({
          code: "session-continuation-state-present",
          severity: "warn",
        }),
      ],
      remediationCodes: ["read-continuation-state"],
    });

    await expect(readTraceEvents(cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreCompact",
          status: "ok",
          decision: "allow",
          findingCodes: ["pre-compact-continuation-state-written"],
          remediationCodes: ["read-continuation-state"],
        },
      },
      {
        name: "hook.received",
        data: {
          event: "SessionStart",
          status: "warn",
          decision: "warn",
          findingCodes: ["session-continuation-state-present"],
          remediationCodes: ["read-continuation-state"],
        },
      },
    ]);
  });

  it("warns on missing current-state guardrails for hook events without edit payloads", async () => {
    const result = await runInTemp(["hook", "codex", "PreToolUse"]);

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      provider: "codex",
      event: "PreToolUse",
      supported: true,
      status: "warn",
      decision: "warn",
      enforced: false,
      findings: [
        expect.objectContaining({ code: "missing-task-contract", severity: "warn" }),
        expect.objectContaining({ code: "missing-context-package", severity: "warn" }),
      ],
      userFacingMessage: {
        en: 'Current task and context are missing. Run `krn start "<task>"`, then run `krn context`.',
        pl: 'Brakuje aktualnego zadania i kontekstu. Uruchom `krn start "<zadanie>"`, potem `krn context`.',
      },
      remediationCodes: ["run-krn-start", "run-krn-context"],
    });

    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "warn",
          decision: "warn",
          enforced: false,
          findingCodes: ["missing-task-contract", "missing-context-package"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-start", "run-krn-context"],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("blocks missing current-state guardrails for edit hook payloads", async () => {
    const result = await runInTemp(["hook", "codex", "PreToolUse"]);
    const blocked = await runInCwd(result.cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        tool: "apply_patch",
        arguments: {
          patch: "*** Begin Patch\n*** Update File: src/in-scope.ts\n@@\n+test\n*** End Patch\n",
        },
      }),
    });

    expect(blocked.code).toBe(0);
    expect(JSON.parse(blocked.stdout)).toMatchObject({
      status: "blocked",
      decision: "block",
      payloadSource: "stdin-json",
      findings: [
        expect.objectContaining({ code: "missing-task-contract", severity: "block" }),
        expect.objectContaining({ code: "missing-context-package", severity: "block" }),
      ],
      remediationCodes: ["run-krn-start", "run-krn-context"],
    });
    await expect(readTraceEvents(result.cwd)).resolves.toMatchObject([
      { name: "hook.received" },
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "blocked",
          decision: "block",
          payloadSource: "stdin-json",
          findingCodes: ["missing-task-contract", "missing-context-package"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-start", "run-krn-context"],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("records out-of-scope edit guardrail decisions from stdin payload", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      taskContractJson("task-hook", "Edit scoped file"),
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          taskId: "task-hook",
          items: [],
          buckets: {
            mustRead: [
              {
                path: "src/in-scope.ts",
                reason: "In scope",
                priority: 10,
                bucket: "must-read",
                status: "available",
              },
            ],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 1, present: 1, missing: 0, confidence: "high" },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        tool: "apply_patch",
        arguments: {
          patch:
            "*** Begin Patch\n*** Update File: src/out-of-scope.ts\n@@\n+test\n*** End Patch\n",
        },
      }),
    });

    expect(result.code).toBe(0);
    expect(JSON.parse(result.stdout)).toMatchObject({
      status: "blocked",
      decision: "block",
      payloadSource: "stdin-json",
      findings: [
        expect.objectContaining({
          code: "out-of-scope-edit",
          path: "src/out-of-scope.ts",
        }),
      ],
      userFacingMessage: {
        en: "Blocked: this edit is outside the current context. Run `krn context` or add this path to the task scope.",
        pl: "Zablokowano: ta zmiana jest poza aktualnym kontekstem. Uruchom `krn context` albo dodaj tę ścieżkę do zakresu zadania.",
      },
      remediationCodes: ["run-krn-context", "scope-path"],
    });
    const traceEvents = await readTraceEvents(cwd);
    expect(traceEvents).toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "blocked",
          decision: "block",
          payloadSource: "stdin-json",
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "full",
        },
      },
    ]);
    expect(traceEvents[0]?.data).not.toHaveProperty("userFacingMessage");
    expect(traceEvents[0]?.data).not.toHaveProperty("remediationHints");
  });

  it("records task-owned proof path hints for hook guardrail decisions", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      taskContractJson("task-hook", "Harden hook guardrail ownership hints"),
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          taskId: "task-hook",
          items: [],
          buckets: {
            mustRead: [
              {
                path: "src/in-scope.ts",
                reason: "In scope",
                priority: 10,
                bucket: "must-read",
                status: "available",
              },
            ],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 1, present: 1, missing: 0, confidence: "high" },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const owned = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        toolName: "Write",
        filePath: "docs/specs/hooks-pack.md",
      }),
    });
    const unowned = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        toolName: "Write",
        filePath: "docs/unowned-proof.md",
      }),
    });

    expect(owned.code).toBe(0);
    expect(JSON.parse(owned.stdout)).toMatchObject({
      status: "warn",
      decision: "warn",
      ownershipModel: "task-context-owned-proof-paths-v1",
      ownedProofPathHintLimit: 4,
      tracePayloadByteLimit: 1024,
      ownedProofPathHints: ["docs/specs/hooks-pack.md"],
      findings: [
        expect.objectContaining({
          code: "proof-path-exception",
          path: "docs/specs/hooks-pack.md",
          ownershipHint: "docs/specs/hooks-pack.md",
        }),
      ],
      userFacingMessage: {
        en: "Warning: allowed as an owned proof path. Review it before handoff.",
        pl: "Ostrzeżenie: dozwolone jako owned proof path. Sprawdź to przed handoffem.",
      },
      remediationCodes: ["review-owned-proof-path"],
    });
    expect(unowned.code).toBe(0);
    expect(JSON.parse(unowned.stdout)).toMatchObject({
      status: "blocked",
      decision: "block",
      findings: [
        expect.objectContaining({
          code: "out-of-scope-edit",
          path: "docs/unowned-proof.md",
        }),
      ],
    });
    await expect(readTraceEvents(cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "warn",
          decision: "warn",
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: ["docs/specs/hooks-pack.md"],
          findingCodes: ["proof-path-exception"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["review-owned-proof-path"],
          tracePayloadMode: "full",
        },
      },
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "blocked",
          decision: "block",
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: [],
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "full",
        },
      },
    ]);
  });

  it("records non-hook package-owned proof path hints from current context", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      taskContractJson("task-config", "Harden config loading behavior"),
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          taskId: "task-config",
          items: [],
          buckets: {
            mustRead: [
              {
                path: "packages/config/src/load-config.ts",
                reason: "Config package source",
                priority: 10,
                bucket: "must-read",
                status: "available",
              },
            ],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 1, present: 1, missing: 0, confidence: "high" },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const owned = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        toolName: "Write",
        filePath: "packages/config/src/load-config.test.ts",
      }),
    });
    const crossPackage = await runInCwd(cwd, ["hook", "codex", "PreToolUse"], {
      stdin: JSON.stringify({
        toolName: "Write",
        filePath: "packages/context/src/build-context-package.test.ts",
      }),
    });

    expect(owned.code).toBe(0);
    expect(JSON.parse(owned.stdout)).toMatchObject({
      status: "warn",
      decision: "warn",
      ownershipModel: "task-context-owned-proof-paths-v1",
      ownedProofPathHintLimit: 4,
      tracePayloadByteLimit: 1024,
      ownedProofPathHints: ["packages/config"],
      findings: [
        expect.objectContaining({
          code: "proof-path-exception",
          path: "packages/config/src/load-config.test.ts",
          ownershipHint: "packages/config",
        }),
      ],
      remediationCodes: ["review-owned-proof-path"],
    });
    expect(crossPackage.code).toBe(0);
    expect(JSON.parse(crossPackage.stdout)).toMatchObject({
      status: "blocked",
      decision: "block",
      findings: [
        expect.objectContaining({
          code: "out-of-scope-edit",
          path: "packages/context/src/build-context-package.test.ts",
        }),
      ],
    });
    await expect(readTraceEvents(cwd)).resolves.toMatchObject([
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "warn",
          decision: "warn",
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: ["packages/config"],
          findingCodes: ["proof-path-exception"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["review-owned-proof-path"],
          tracePayloadMode: "full",
        },
      },
      {
        name: "hook.received",
        data: {
          event: "PreToolUse",
          status: "blocked",
          decision: "block",
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: [],
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "full",
        },
      },
    ]);
  });
});
