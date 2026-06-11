import {
  type HookCurrentState,
  type HookDecision,
  type HookResult,
  handleCodexHook,
  parseCodexHookPayload,
} from "./codex-hook-entry.js";

export type HookGuardrailFixtureStateName =
  | "empty"
  | "task-only"
  | "ready"
  | "config-task-owned"
  | "context-task-owned"
  | "codex-adapter-task-owned"
  | "hook-task-owned"
  | "hook-context-owned"
  | "memory-context-owned"
  | "verify-task-owned"
  | "stop-active"
  | "final-missing";

export interface HookGuardrailMatrixCase {
  name: string;
  event: string;
  state: HookGuardrailFixtureStateName;
  payload?: unknown;
  expected: {
    status: HookResult["status"];
    decision: HookDecision;
    findingCodes: string[];
    ownedProofPathHints?: string[] | undefined;
  };
}

export interface HookGuardrailMatrix {
  schemaVersion: 1;
  cases: HookGuardrailMatrixCase[];
}

const readyState: HookCurrentState = {
  taskPresent: true,
  contextPresent: true,
  contextStop: false,
  verifyPresent: true,
  handoffPresent: true,
  taskId: "task-hook-fixture",
  taskText: "Edit scoped file",
  writablePaths: ["src/in-scope.ts"],
  doNotUsePaths: ["docs/stale.md"],
  missingContextPaths: [],
  verifyStatus: "not-runnable",
};

export function hookGuardrailFixtureState(name: HookGuardrailFixtureStateName): HookCurrentState {
  if (name === "empty") {
    return {
      taskPresent: false,
      contextPresent: false,
      contextStop: false,
      verifyPresent: false,
      handoffPresent: false,
    };
  }

  if (name === "task-only") {
    return {
      taskPresent: true,
      contextPresent: false,
      contextStop: false,
      verifyPresent: false,
      handoffPresent: false,
      taskId: "task-hook-fixture",
      taskText: "Edit scoped file",
    };
  }

  if (name === "hook-task-owned") {
    return {
      ...readyState,
      taskText: "Harden hook guardrail ownership hints with eval doctor trace regressions",
    };
  }

  if (name === "config-task-owned") {
    return {
      ...readyState,
      taskText: "Harden config loading and validation fixtures",
    };
  }

  if (name === "context-task-owned") {
    return {
      ...readyState,
      taskText: "Harden context package ranking and STOP behavior",
    };
  }

  if (name === "codex-adapter-task-owned") {
    return {
      ...readyState,
      taskText: "Harden downstream codex adapter onboarding templates",
    };
  }

  if (name === "hook-context-owned") {
    return {
      ...readyState,
      taskText: "Update current package proof tests",
      writablePaths: ["src/in-scope.ts", "packages/hooks/src/codex-hook-entry.ts"],
    };
  }

  if (name === "memory-context-owned") {
    return {
      ...readyState,
      taskText: "Update current package proof tests",
      writablePaths: ["src/in-scope.ts", "packages/memory/src/memory-store.ts"],
    };
  }

  if (name === "verify-task-owned") {
    return {
      ...readyState,
      taskText: "Harden verify result skeleton behavior",
    };
  }

  if (name === "stop-active") {
    return {
      ...readyState,
      contextStop: true,
      contextStopReason: "Required context is missing: docs/required-context.md",
      verifyStatus: "blocked",
    };
  }

  if (name === "final-missing") {
    return {
      ...readyState,
      verifyPresent: false,
      handoffPresent: false,
    };
  }

  return readyState;
}

export function hookFindingCodes(result: HookResult): string[] {
  return result.findings.map((finding) => finding.code);
}

export function hookProofPathOwnershipHints(result: HookResult): string[] {
  return result.findings
    .map((finding) => finding.ownershipHint)
    .filter((hint): hint is string => typeof hint === "string");
}

export function runHookGuardrailFixtureCase(testCase: HookGuardrailMatrixCase): HookResult {
  return handleCodexHook(testCase.event, {
    payload:
      testCase.payload === undefined
        ? { source: "placeholder" }
        : parseCodexHookPayload(JSON.stringify(testCase.payload)),
    state: hookGuardrailFixtureState(testCase.state),
  });
}
