export type CodexHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PreCompact"
  | "PostCompact"
  | "Stop";

export const supportedCodexHookEvents: CodexHookEvent[] = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "Stop",
];

export type HookPayloadSource = "placeholder" | "stdin-json" | "stdin-invalid-json";
export type HookDecision = "allow" | "warn" | "block";
export type HookFindingSeverity = "info" | "warn" | "block";

export interface HookPayload {
  source: HookPayloadSource;
  parsed?: unknown;
  invalidReason?: string;
}

export interface HookCurrentState {
  taskPresent: boolean;
  contextPresent: boolean;
  contextStop: boolean;
  verifyPresent: boolean;
  handoffPresent: boolean;
  taskId?: string | undefined;
  contextStopReason?: string | undefined;
  writablePaths?: string[] | undefined;
  doNotUsePaths?: string[] | undefined;
  missingContextPaths?: string[] | undefined;
  verifyStatus?: string | undefined;
}

export interface HookGuardrailFinding {
  code:
    | "invalid-hook-payload"
    | "missing-task-contract"
    | "missing-context-package"
    | "context-stop-active"
    | "do-not-use-edit"
    | "out-of-scope-edit"
    | "final-verify-missing"
    | "final-verify-blocked"
    | "final-handoff-missing";
  severity: HookFindingSeverity;
  detail: string;
  path?: string | undefined;
}

export interface HookResult {
  provider: "codex";
  event: string;
  supported: boolean;
  status: "ok" | "warn" | "blocked" | "ignored";
  decision: HookDecision;
  enforced: false;
  payloadSource: HookPayloadSource;
  detail: string;
  findings: HookGuardrailFinding[];
}

export function isSupportedCodexHookEvent(event: string): event is CodexHookEvent {
  return supportedCodexHookEvents.includes(event as CodexHookEvent);
}

export function parseCodexHookPayload(raw: string | undefined): HookPayload {
  if (!raw || raw.trim().length === 0) {
    return { source: "placeholder" };
  }

  try {
    return {
      source: "stdin-json",
      parsed: JSON.parse(raw) as unknown,
    };
  } catch (error) {
    return {
      source: "stdin-invalid-json",
      invalidReason: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeHookPath(filePath: string): string {
  return filePath.trim().replaceAll("\\", "/").replace(/^\.\//, "");
}

function pathMatches(candidate: string, scopedPath: string): boolean {
  const normalizedCandidate = normalizeHookPath(candidate);
  const normalizedScopedPath = normalizeHookPath(scopedPath);

  return (
    normalizedCandidate === normalizedScopedPath ||
    normalizedCandidate.startsWith(`${normalizedScopedPath}/`)
  );
}

function collectPathsFromPatch(text: string): string[] {
  const paths: string[] = [];

  for (const line of text.split("\n")) {
    const fileMatch = /^\*\*\* (?:Add|Update|Delete) File: (.+)$/.exec(line);
    if (fileMatch?.[1]) {
      paths.push(fileMatch[1]);
    }

    const diffMatch = /^(?:--- a|\+\+\+ b)\/(.+)$/.exec(line);
    if (diffMatch?.[1] && diffMatch[1] !== "/dev/null") {
      paths.push(diffMatch[1]);
    }
  }

  return paths;
}

function collectPathValues(value: unknown, parentKey = ""): string[] {
  if (typeof value === "string") {
    const paths = /(^|_|\b)(path|file_path|filepath|relative_path|relativepath)$/i.test(parentKey)
      ? [value]
      : [];

    if (/^(patch|diff)$/i.test(parentKey)) {
      paths.push(...collectPathsFromPatch(value));
    }

    return paths;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPathValues(item, parentKey));
  }

  if (isRecord(value)) {
    return Object.entries(value).flatMap(([key, item]) => collectPathValues(item, key));
  }

  return [];
}

function hookToolName(payload: HookPayload): string | undefined {
  if (!isRecord(payload.parsed)) {
    return undefined;
  }

  for (const key of ["tool", "toolName", "tool_name", "name"]) {
    const value = payload.parsed[key];
    if (typeof value === "string") {
      return value;
    }
  }

  return undefined;
}

function isEditTool(toolName: string | undefined): boolean {
  if (!toolName) {
    return false;
  }

  const normalized = toolName.toLowerCase();
  return (
    normalized === "edit" ||
    normalized === "write" ||
    normalized === "multiedit" ||
    normalized === "apply_patch" ||
    normalized.endsWith(".apply_patch")
  );
}

function editedPaths(payload: HookPayload): string[] {
  if (!isRecord(payload.parsed)) {
    return [];
  }

  return [...new Set(collectPathValues(payload.parsed).map(normalizeHookPath))].sort();
}

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

  if (taskRequiredEvents.includes(event) && !state.taskPresent) {
    findings.push({
      code: "missing-task-contract",
      severity: event === "UserPromptSubmit" ? "warn" : "block",
      detail: 'No current task contract; run `krn start "<task>"` first',
    });
  }

  if (contextRequiredEvents.includes(event) && !state.contextPresent) {
    findings.push({
      code: "missing-context-package",
      severity: "block",
      detail: "No current context package; run `krn context` before tool use or final stop",
    });
  }

  if (state.contextStop) {
    findings.push({
      code: "context-stop-active",
      severity: event === "UserPromptSubmit" || event === "Stop" ? "warn" : "block",
      detail: state.contextStopReason ?? "Current context package reports STOP",
    });
  }
}

function addScopeFindings(payload: HookPayload, state: HookCurrentState): HookGuardrailFinding[] {
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
    return {
      provider: "codex",
      event,
      supported,
      status: "ignored",
      decision: "allow",
      enforced: false,
      payloadSource: payload.source,
      detail: "Unsupported Codex hook event ignored by P0 hook guardrail",
      findings: [],
    };
  }

  const findings: HookGuardrailFinding[] = [];

  if (payload.source === "stdin-invalid-json") {
    findings.push({
      code: "invalid-hook-payload",
      severity: "warn",
      detail: payload.invalidReason ?? "Hook stdin was not valid JSON",
    });
  }

  const hookEvent = event as CodexHookEvent;

  addCurrentStateFindings(hookEvent, state, findings);
  findings.push(...addScopeFindings(payload, state));

  if (hookEvent === "Stop") {
    findings.push(...addFinalFindings(state));
  }

  const decision = findingDecision(findings);
  const detail =
    findings.length === 0
      ? "P0 hook guardrails passed; hooks remain guardrails and trace points, not a sandbox"
      : `P0 hook guardrail ${decision}: ${findings.map((finding) => finding.code).join(", ")}`;

  return {
    provider: "codex",
    event,
    supported,
    status: hookStatus(decision),
    decision,
    enforced: false,
    payloadSource: payload.source,
    detail,
    findings,
  };
}
