import { describe, expect, it } from "vitest";
import {
  type HookCurrentState,
  handleCodexHook,
  parseCodexHookPayload,
} from "./codex-hook-entry.js";

const readyState: HookCurrentState = {
  taskPresent: true,
  contextPresent: true,
  contextStop: false,
  verifyPresent: true,
  handoffPresent: true,
  taskId: "task-hook",
  writablePaths: ["src/in-scope.ts"],
  doNotUsePaths: ["docs/stale.md"],
  missingContextPaths: [],
  verifyStatus: "not-runnable",
};

describe("Codex hook entry guardrails", () => {
  it("ignores unsupported events without crashing", () => {
    expect(handleCodexHook("PermissionRequest", { state: readyState })).toMatchObject({
      provider: "codex",
      event: "PermissionRequest",
      supported: false,
      status: "ignored",
      decision: "allow",
      enforced: false,
      findings: [],
    });
  });

  it("blocks tool use when task or context artifacts are missing", () => {
    const result = handleCodexHook("PreToolUse");

    expect(result).toMatchObject({
      supported: true,
      status: "blocked",
      decision: "block",
      enforced: false,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "missing-task-contract",
      "missing-context-package",
    ]);
  });

  it("blocks tool use while context STOP is active", () => {
    const result = handleCodexHook("PreToolUse", {
      state: {
        ...readyState,
        contextStop: true,
        contextStopReason: "Required context is missing: docs/required-context.md",
        verifyStatus: "blocked",
      },
    });

    expect(result.decision).toBe("block");
    expect(result.findings).toContainEqual({
      code: "context-stop-active",
      severity: "block",
      detail: "Required context is missing: docs/required-context.md",
    });
  });

  it("blocks edit payloads outside the current writable context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        tool: "apply_patch",
        arguments: {
          patch:
            "*** Begin Patch\n*** Update File: src/out-of-scope.ts\n@@\n+test\n*** End Patch\n",
        },
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: readyState,
    });

    expect(result).toMatchObject({
      status: "blocked",
      decision: "block",
      payloadSource: "stdin-json",
    });
    expect(result.findings).toContainEqual({
      code: "out-of-scope-edit",
      severity: "block",
      detail: "Tool payload edits a path outside must-read/should-read current context",
      path: "src/out-of-scope.ts",
    });
  });

  it("blocks edit payloads for do-not-use paths", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "docs/stale.md",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: readyState,
    });

    expect(result.decision).toBe("block");
    expect(result.findings).toContainEqual({
      code: "do-not-use-edit",
      severity: "block",
      detail: "Tool payload edits a path marked do-not-use by the current context package",
      path: "docs/stale.md",
    });
  });

  it("blocks final Stop until verify and handoff artifacts exist", () => {
    const result = handleCodexHook("Stop", {
      state: {
        ...readyState,
        verifyPresent: false,
        handoffPresent: false,
      },
    });

    expect(result.decision).toBe("block");
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "final-verify-missing",
      "final-handoff-missing",
    ]);
  });

  it("allows final Stop when verify and handoff artifacts exist", () => {
    const result = handleCodexHook("Stop", {
      state: readyState,
    });

    expect(result).toMatchObject({
      status: "ok",
      decision: "allow",
      findings: [],
    });
  });

  it("warns but does not sandbox-block final Stop when STOP was already handed off", () => {
    const result = handleCodexHook("Stop", {
      state: {
        ...readyState,
        contextStop: true,
        contextStopReason: "Required context is missing: docs/required-context.md",
        verifyStatus: "blocked",
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual(["context-stop-active"]);
  });

  it("warns deterministically on invalid JSON stdin", () => {
    const result = handleCodexHook("SessionStart", {
      payload: parseCodexHookPayload("{not json"),
      state: readyState,
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      payloadSource: "stdin-invalid-json",
    });
    expect(result.findings).toContainEqual(
      expect.objectContaining({
        code: "invalid-hook-payload",
        severity: "warn",
      }),
    );
  });
});
