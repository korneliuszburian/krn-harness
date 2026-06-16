import { describe, expect, it } from "vitest";
import {
  type HookCurrentState,
  handleCodexHook,
  maxOwnedProofPathHints,
  ownedProofPathHintsForState,
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

describe("Codex hook entry scope guardrails", () => {
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

  it("blocks unowned test/docs proof paths outside active context", () => {
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
      status: "blocked",
      decision: "block",
      enforced: false,
    });
    expect(result.findings).toContainEqual({
      code: "out-of-scope-edit",
      severity: "block",
      detail: "Tool payload edits a path outside must-read/should-read current context",
      path: "docs/proof.md",
    });
  });

  it("warns for task-owned hook proof paths outside active context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "docs/specs/hooks-pack.md",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: {
        ...readyState,
        taskText: "Harden hook guardrail ownership hints",
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
      ownershipModel: "task-context-owned-proof-paths-v1",
    });
    expect(result.ownedProofPathHints).toEqual(["docs/specs/hooks-pack.md"]);
    expect(result.findings).toContainEqual({
      code: "proof-path-exception",
      severity: "warn",
      detail: "Tool payload edits a task/context-owned proof path outside active context",
      path: "docs/specs/hooks-pack.md",
      ownershipHint: "docs/specs/hooks-pack.md",
    });
  });

  it("warns for context-owned package test proof paths outside active context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "packages/hooks/src/codex-hook-entry.test.ts",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: {
        ...readyState,
        taskText: "Update current package tests",
        writablePaths: ["src/in-scope.ts", "packages/hooks/src/codex-hook-entry.ts"],
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
    });
    expect(result.findings).toContainEqual({
      code: "proof-path-exception",
      severity: "warn",
      detail: "Tool payload edits a task/context-owned proof path outside active context",
      path: "packages/hooks/src/codex-hook-entry.test.ts",
      ownershipHint: "packages/hooks",
    });
  });

  it("warns for non-hook package proof paths owned by current context", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "packages/config/src/load-config.test.ts",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: {
        ...readyState,
        taskText: "Update current package tests",
        writablePaths: ["packages/config/src/load-config.ts"],
      },
    });

    expect(result.ownedProofPathHints).toEqual(["packages/config"]);
    expect(result.findings).toContainEqual({
      code: "proof-path-exception",
      severity: "warn",
      detail: "Tool payload edits a task/context-owned proof path outside active context",
      path: "packages/config/src/load-config.test.ts",
      ownershipHint: "packages/config",
    });
  });

  it("does not accept broad explicit proof path ownership hints", () => {
    const payload = parseCodexHookPayload(
      JSON.stringify({
        toolName: "Write",
        filePath: "docs/proof.md",
      }),
    );
    const result = handleCodexHook("PreToolUse", {
      payload,
      state: {
        ...readyState,
        ownedProofPaths: ["docs"],
      },
    });

    expect(result.ownedProofPathHints).toEqual([]);
    expect(result.findings).toContainEqual({
      code: "out-of-scope-edit",
      severity: "block",
      detail: "Tool payload edits a path outside must-read/should-read current context",
      path: "docs/proof.md",
    });
  });

  it("keeps candidate ownership hints stable, sorted, and de-duplicated", () => {
    expect(
      ownedProofPathHintsForState({
        ...readyState,
        taskText: "Harden config loading",
        writablePaths: ["packages/config/src/load-config.ts", "packages/config/src/load-config.ts"],
        ownedProofPaths: ["docs", "packages/config", "packages/config"],
      }),
    ).toEqual(["docs/specs/krn-config.schema.md", "packages/config"]);
  });

  it.each([
    ["biome lint rules", "biome.json"],
    ["typescript typecheck", "tsconfig.json"],
    ["package scripts", "package.json"],
    ["pnpm workspace", "pnpm-workspace.yaml"],
    ["vitest test runner", "vitest.config.ts"],
    ["ci workflow", ".github/workflows/verify.yml"],
  ])("warns for owned root config proof path: %s", (taskText, filePath) => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(JSON.stringify({ toolName: "Write", filePath })),
      state: {
        ...readyState,
        taskText,
      },
    });

    expect(result).toMatchObject({
      status: "warn",
      decision: "warn",
      enforced: false,
      ownedProofPathHints: [filePath],
    });
    expect(result.findings).toContainEqual({
      code: "proof-path-exception",
      severity: "warn",
      detail: "Tool payload edits a task/context-owned proof path outside active context",
      path: filePath,
      ownershipHint: filePath,
    });
  });

  it("caps compact proof path hints in hook results", () => {
    const result = handleCodexHook("PreToolUse", {
      payload: parseCodexHookPayload(
        JSON.stringify({
          toolName: "Write",
          edits: [
            { filePath: "docs/specs/context-package.schema.md" },
            { filePath: "docs/specs/doctor-result.schema.md" },
            { filePath: "docs/specs/eval-result.schema.md" },
            { filePath: "docs/specs/hooks-pack.md" },
            { filePath: "docs/specs/krn-config.schema.md" },
            { filePath: "docs/specs/memory.schema.md" },
          ],
        }),
      ),
      state: {
        ...readyState,
        taskText: "Harden config context doctor eval hook memory ownership hints",
      },
    });

    expect(
      result.findings.filter((finding) => finding.code === "proof-path-exception"),
    ).toHaveLength(6);
    expect(result.ownedProofPathHints).toEqual([
      "docs/specs/context-package.schema.md",
      "docs/specs/doctor-result.schema.md",
      "docs/specs/eval-result.schema.md",
      "docs/specs/hooks-pack.md",
    ]);
    expect(result.ownedProofPathHints).toHaveLength(maxOwnedProofPathHints);
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
});
