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
  taskText: "Edit scoped file",
  writablePaths: ["src/in-scope.ts"],
  doNotUsePaths: ["docs/stale.md"],
  missingContextPaths: [],
  verifyStatus: "not-runnable",
};

describe("Codex hook entry lifecycle guardrails", () => {
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

  it("warns before compaction when run and report evidence are missing", () => {
    const result = handleCodexHook("PreCompact", {
      state: {
        ...readyState,
        runResultPresent: false,
        reportPresent: false,
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
      remediationCodes: ["run-krn-run", "run-krn-report"],
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "pre-compact-run-result-missing",
      "pre-compact-report-missing",
    ]);
  });

  it("allows pre-compact when current run and report evidence exist", () => {
    const result = handleCodexHook("PreCompact", {
      state: {
        ...readyState,
        runResultPresent: true,
        reportPresent: true,
      },
    });

    expect(result).toMatchObject({
      status: "ok",
      decision: "allow",
      findings: [],
    });
  });

  it("warns after compaction when context should be refreshed", () => {
    const result = handleCodexHook("PostCompact", {
      state: {
        ...readyState,
        contextStop: true,
        contextStopReason: "Required context is missing: docs/required-context.md",
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "context-stop-active",
      "post-compact-context-refresh-needed",
    ]);
    expect(result.remediationCodes).toEqual(["resolve-context-stop", "run-krn-context"]);
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
