import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runDoctor } from "./doctor.js";

async function tempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "krn-doctor-"));
}

async function writeGlobalTrace(cwd: string, events: unknown[]): Promise<void> {
  await mkdir(path.join(cwd, ".krn", "traces"), { recursive: true });
  await writeFile(
    path.join(cwd, ".krn", "traces", "trace.jsonl"),
    events
      .map((event) => JSON.stringify(event))
      .join("\n")
      .concat("\n"),
    "utf8",
  );
}

describe("doctor result hook trace", () => {
  it("passes hook guardrail trace events with decision and finding codes", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-allow",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "SessionStart",
          supported: true,
          status: "ok",
          decision: "allow",
          enforced: false,
          payloadSource: "placeholder",
          detail: "P0 hook guardrails passed",
          findingCodes: [],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: [],
          tracePayloadMode: "full",
        },
      },
      {
        id: "trace-hook-warn",
        timestamp: "2026-06-03T00:00:01.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: ["docs/specs/hooks-pack.md"],
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["review-owned-proof-path"],
          tracePayloadMode: "full",
        },
      },
      {
        id: "trace-hook-block",
        timestamp: "2026-06-03T00:00:02.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "blocked",
          decision: "block",
          enforced: false,
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail block: out-of-scope-edit",
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "full",
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "pass",
      detail:
        "3 hook guardrail trace event(s) valid: allow 1, warn 1, block 1, owned proof paths 1",
    });
  });

  it("fails current hook proof-path trace events without ownership hints", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-proof-path",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail:
        "hook.received trace-hook-proof-path has proof-path-exception without ownership hints",
    });
  });

  it("passes compacted hook trace payloads inside the byte budget", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-compacted",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "<compacted>",
          supported: true,
          status: "blocked",
          decision: "block",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: [],
          payloadSource: "stdin-json",
          detail: "P0 hook trace payload compacted to fit budget",
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "compacted",
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "pass",
      detail:
        "1 hook guardrail trace event(s) valid: allow 0, warn 0, block 1, owned proof paths 0",
    });
  });

  it("fails current hook trace events with unknown trace payload modes", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-unknown-mode",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "blocked",
          decision: "block",
          enforced: false,
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail block: out-of-scope-edit",
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          tracePayloadMode: "oversized",
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail: "hook.received trace-hook-unknown-mode has an unknown trace payload mode",
    });
  });

  it("fails current hook trace events that include long operator text", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-long-text",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "blocked",
          decision: "block",
          enforced: false,
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail block: out-of-scope-edit",
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
          remediationCodes: ["run-krn-context", "scope-path"],
          userFacingMessage: {
            en: "Blocked: this edit is outside the current context.",
            pl: "Zablokowano: ta zmiana jest poza aktualnym kontekstem.",
          },
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail: "hook.received trace-hook-long-text includes long operator text in trace payload",
    });
  });

  it("fails current hook trace events with operator version but no remediation codes", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-no-remediation",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "blocked",
          decision: "block",
          enforced: false,
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail block: out-of-scope-edit",
          findingCodes: ["out-of-scope-edit"],
          operatorMessageVersion: "hook-operator-message-v1",
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail:
        "hook.received trace-hook-no-remediation has operator message version without remediation codes",
    });
  });

  it("fails current hook proof-path trace events with broad ownership hints", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-broad-proof-path",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHints: ["docs"],
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail:
        "hook.received trace-hook-broad-proof-path has over-broad proof-path ownership hint docs",
    });
  });

  it("fails current hook trace events with unknown ownership models", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-unknown-ownership",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "package-policy-v2",
          ownedProofPathHints: ["packages/config"],
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail:
        "hook.received trace-hook-unknown-ownership has an unknown proof-path ownership model",
    });
  });

  it("fails current hook trace events that exceed ownership hint limits", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-too-many-hints",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: [
            "docs/specs/context-package.schema.md",
            "docs/specs/doctor-result.schema.md",
            "docs/specs/eval-result.schema.md",
            "docs/specs/hooks-pack.md",
            "docs/specs/trace.schema.md",
          ],
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail warn: proof-path-exception",
          findingCodes: ["proof-path-exception"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail: "hook.received trace-hook-too-many-hints exceeds proof-path ownership hint limit",
    });
  });

  it("fails current hook trace events that exceed payload byte limits", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-too-large",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "warn",
          decision: "warn",
          enforced: false,
          ownershipModel: "task-context-owned-proof-paths-v1",
          ownedProofPathHintLimit: 4,
          tracePayloadByteLimit: 1024,
          ownedProofPathHints: ["docs/specs/hooks-pack.md"],
          payloadSource: "stdin-json",
          detail: `P0 hook guardrail warn: ${"x".repeat(1100)}`,
          findingCodes: ["proof-path-exception"],
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail: "hook.received trace-hook-too-large exceeds trace payload byte limit",
    });
  });

  it("fails hook guardrail trace events without finding-code payloads", async () => {
    const cwd = await tempRepo();
    await writeGlobalTrace(cwd, [
      {
        id: "trace-hook-block",
        timestamp: "2026-06-03T00:00:00.000Z",
        name: "hook.received",
        data: {
          provider: "codex",
          event: "PreToolUse",
          supported: true,
          status: "blocked",
          decision: "block",
          enforced: false,
          payloadSource: "stdin-json",
          detail: "P0 hook guardrail block: out-of-scope-edit",
        },
      },
    ]);

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "hook-guardrail-trace",
      status: "fail",
      detail: "hook.received trace-hook-block is missing guardrail decision fields",
    });
  });
});
