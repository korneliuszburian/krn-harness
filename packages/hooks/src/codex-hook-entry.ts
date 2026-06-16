import { compactOwnedProofPathHints, ownedProofPathHintsForState } from "./hook-ownership.js";
import { editedPaths, hookToolName, isEditTool, isProofPath, pathMatches } from "./hook-payload.js";
import { operatorGuidanceFor } from "./hook-remediation.js";
import {
  type CodexHookEvent,
  type HookCurrentState,
  type HookDecision,
  type HookFindingSeverity,
  type HookGuardrailFinding,
  type HookPayload,
  type HookResult,
  hookOperatorMessageVersion,
  hookOwnershipModel,
  isSupportedCodexHookEvent,
  maxHookTracePayloadBytes,
  maxOwnedProofPathHints,
} from "./hook-types.js";

export * from "./hook-ownership.js";
export * from "./hook-payload.js";
export * from "./hook-remediation.js";
export * from "./hook-trace.js";
export * from "./hook-types.js";

function hookStatus(decision: HookDecision): HookResult["status"] {
  if (decision === "block") {
    return "blocked";
  }

  if (decision === "warn") {
    return "warn";
  }

  return "ok";
}

function findingDecision(findings: HookGuardrailFinding[]): HookDecision {
  if (findings.some((finding) => finding.severity === "block")) {
    return "block";
  }

  if (findings.some((finding) => finding.severity === "warn")) {
    return "warn";
  }

  return "allow";
}

function addCurrentStateFindings(
  event: CodexHookEvent,
  payload: HookPayload,
  state: HookCurrentState,
  findings: HookGuardrailFinding[],
): void {
  const taskRequiredEvents: CodexHookEvent[] = [
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "PreCompact",
    "PostCompact",
    "Stop",
  ];
  const contextRequiredEvents: CodexHookEvent[] = [
    "PreToolUse",
    "PostToolUse",
    "PreCompact",
    "PostCompact",
    "Stop",
  ];
  const editIntent = isEditTool(hookToolName(payload));
  const missingTaskSeverity = (): HookFindingSeverity => {
    if (event === "PreToolUse") {
      return editIntent ? "block" : "warn";
    }

    if (event === "Stop") {
      return "block";
    }

    return "warn";
  };
  const missingContextSeverity = (): HookFindingSeverity => {
    if (event === "PreToolUse") {
      return editIntent ? "block" : "warn";
    }

    if (event === "Stop") {
      return "block";
    }

    return "warn";
  };
  const stopSeverity = (): HookFindingSeverity => {
    if (event === "PreToolUse") {
      return editIntent ? "block" : "warn";
    }

    if (event === "Stop" || event === "UserPromptSubmit") {
      return "warn";
    }

    return "warn";
  };

  if (taskRequiredEvents.includes(event) && !state.taskPresent) {
    findings.push({
      code: "missing-task-contract",
      severity: missingTaskSeverity(),
      detail: 'No current task contract; run `krn start "<task>"` first',
    });
  }

  if (contextRequiredEvents.includes(event) && !state.contextPresent) {
    findings.push({
      code: "missing-context-package",
      severity: missingContextSeverity(),
      detail: "No current context package; run `krn context` before tool use or final stop",
    });
  }

  if (state.contextStop) {
    findings.push({
      code: "context-stop-active",
      severity: stopSeverity(),
      detail: state.contextStopReason ?? "Current context package reports STOP",
    });
  }

  if (event === "PreCompact" && state.taskPresent && state.contextPresent) {
    if (!state.runResultPresent) {
      findings.push({
        code: "pre-compact-run-result-missing",
        severity: "warn",
        detail: "PreCompact saw task/context but no `.krn/current/run-result.json` evidence",
      });
    }

    if (!state.reportPresent) {
      findings.push({
        code: "pre-compact-report-missing",
        severity: "warn",
        detail: "PreCompact saw task/context but no `.krn/current/operator-report.json` evidence",
      });
    }
  }

  if (event === "PostCompact" && (!state.contextPresent || state.contextStop)) {
    findings.push({
      code: "post-compact-context-refresh-needed",
      severity: "warn",
      detail:
        "PostCompact should refresh context before further edits; run `krn context` or `krn run --dry-run`",
    });
  }
}

function ownedProofPathHintFor(editedPath: string, hints: string[]): string | undefined {
  return hints.find((hint) => pathMatches(editedPath, hint));
}

function addScopeFindings(
  payload: HookPayload,
  state: HookCurrentState,
  ownedProofPathHints: string[],
): HookGuardrailFinding[] {
  if (!isEditTool(hookToolName(payload)) || !state.contextPresent) {
    return [];
  }

  const writablePaths = state.writablePaths ?? [];
  const doNotUsePaths = state.doNotUsePaths ?? [];
  const findings: HookGuardrailFinding[] = [];

  for (const editedPath of editedPaths(payload)) {
    if (doNotUsePaths.some((scopedPath) => pathMatches(editedPath, scopedPath))) {
      findings.push({
        code: "do-not-use-edit",
        severity: "block",
        detail: "Tool payload edits a path marked do-not-use by the current context package",
        path: editedPath,
      });
      continue;
    }

    if (!writablePaths.some((scopedPath) => pathMatches(editedPath, scopedPath))) {
      const ownershipHint = ownedProofPathHintFor(editedPath, ownedProofPathHints);

      if (state.taskPresent && state.contextPresent && isProofPath(editedPath) && ownershipHint) {
        findings.push({
          code: "proof-path-exception",
          severity: "warn",
          detail: "Tool payload edits a task/context-owned proof path outside active context",
          path: editedPath,
          ownershipHint,
        });
        continue;
      }

      findings.push({
        code: "out-of-scope-edit",
        severity: "block",
        detail: "Tool payload edits a path outside must-read/should-read current context",
        path: editedPath,
      });
    }
  }

  return findings;
}

function addFinalFindings(state: HookCurrentState): HookGuardrailFinding[] {
  const findings: HookGuardrailFinding[] = [];

  if (!state.verifyPresent) {
    findings.push({
      code: "final-verify-missing",
      severity: "block",
      detail: "Final Stop requires `.krn/current/verify-result.json`; run `krn verify`",
    });
  } else if (state.verifyStatus === "blocked" && !state.contextStop) {
    findings.push({
      code: "final-verify-blocked",
      severity: "block",
      detail: "Final Stop requires a non-blocked verify result unless context STOP is active",
    });
  }

  if (!state.handoffPresent) {
    findings.push({
      code: "final-handoff-missing",
      severity: "block",
      detail: "Final Stop requires `.krn/current/handoff.md`; run `krn handoff`",
    });
  }

  return findings;
}

export function handleCodexHook(
  event: string,
  input: {
    payload?: HookPayload | undefined;
    state?: HookCurrentState | undefined;
  } = {},
): HookResult {
  const supported = isSupportedCodexHookEvent(event);
  const payload = input.payload ?? { source: "placeholder" };
  const state =
    input.state ??
    ({
      taskPresent: false,
      contextPresent: false,
      contextStop: false,
      verifyPresent: false,
      handoffPresent: false,
    } satisfies HookCurrentState);

  if (!supported) {
    const decision: HookDecision = "allow";
    const findings: HookGuardrailFinding[] = [];
    const guidance = operatorGuidanceFor(decision, supported, findings);

    return {
      provider: "codex",
      event,
      supported,
      status: "ignored",
      decision,
      enforced: false,
      ownershipModel: hookOwnershipModel,
      ownedProofPathHintLimit: maxOwnedProofPathHints,
      tracePayloadByteLimit: maxHookTracePayloadBytes,
      ownedProofPathHints: [],
      payloadSource: payload.source,
      detail: "Unsupported Codex hook event ignored by P0 hook guardrail",
      operatorMessageVersion: hookOperatorMessageVersion,
      ...guidance,
      findings: [],
    };
  }

  const findings: HookGuardrailFinding[] = [];
  const ownedProofPathHints = ownedProofPathHintsForState(state);

  if (payload.source === "stdin-invalid-json") {
    findings.push({
      code: "invalid-hook-payload",
      severity: "warn",
      detail: payload.invalidReason ?? "Hook stdin was not valid JSON",
    });
  }

  const hookEvent = event as CodexHookEvent;

  addCurrentStateFindings(hookEvent, payload, state, findings);
  findings.push(...addScopeFindings(payload, state, ownedProofPathHints));

  if (hookEvent === "Stop") {
    findings.push(...addFinalFindings(state));
  }

  const decision = findingDecision(findings);
  const detail =
    findings.length === 0
      ? "P0 hook guardrails passed; hooks remain guardrails and trace points, not a sandbox"
      : `P0 hook guardrail ${decision}: ${findings.map((finding) => finding.code).join(", ")}`;
  const guidance = operatorGuidanceFor(decision, supported, findings);

  return {
    provider: "codex",
    event,
    supported,
    status: hookStatus(decision),
    decision,
    enforced: false,
    ownershipModel: hookOwnershipModel,
    ownedProofPathHintLimit: maxOwnedProofPathHints,
    tracePayloadByteLimit: maxHookTracePayloadBytes,
    ownedProofPathHints: compactOwnedProofPathHints(findings),
    payloadSource: payload.source,
    detail,
    operatorMessageVersion: hookOperatorMessageVersion,
    ...guidance,
    findings,
  };
}
