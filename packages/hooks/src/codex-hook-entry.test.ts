import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  type HookCurrentState,
  handleCodexHook,
  parseCodexHookPayload,
} from "./codex-hook-entry.js";
import {
  type HookGuardrailMatrix,
  hookFindingCodes,
  runHookGuardrailFixtureCase,
} from "./guardrail-fixtures.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readHookMatrix(): HookGuardrailMatrix {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "fixtures", "hooks", "guardrail-matrix.json"), "utf8"),
  ) as HookGuardrailMatrix;
}

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

  it("matches the deterministic hook guardrail fixture matrix", () => {
    for (const testCase of readHookMatrix().cases) {
      const result = runHookGuardrailFixtureCase(testCase);

      expect(
        {
          status: result.status,
          decision: result.decision,
          findingCodes: hookFindingCodes(result),
        },
        testCase.name,
      ).toEqual(testCase.expected);
      expect(result.enforced, testCase.name).toBe(false);
    }
  });

  it("blocks edit tool use when task or context artifacts are missing", () => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(
        JSON.stringify({
          tool: "apply_patch",
          arguments: {
            patch: "*** Begin Patch\n*** Update File: src/in-scope.ts\n@@\n+test\n*** End Patch\n",
          },
        }),
      ),
    });

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
      payload: parseCodexHookPayload(
        JSON.stringify({
          tool: "apply_patch",
          arguments: {
            patch: "*** Begin Patch\n*** Update File: src/in-scope.ts\n@@\n+test\n*** End Patch\n",
          },
        }),
      ),
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

  it("warns for read-only tool use before task/context artifacts exist", () => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(JSON.stringify({ tool: "Read", filePath: "src/in-scope.ts" })),
    });

    expect(result).toMatchObject({
      supported: true,
      status: "warn",
      decision: "warn",
      enforced: false,
    });
    expect(result.findings.map((finding) => finding.code)).toEqual([
      "missing-task-contract",
      "missing-context-package",
    ]);
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

  it("warns for test/docs proof paths outside active context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "docs/proof.md",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: readyState,
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
    });
    expect(result.findings).toContainEqual({
      code: "proof-path-exception",
      severity: "warn",
      detail: "Tool payload edits a test/docs/fixture proof path outside active context",
      path: "docs/proof.md",
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
