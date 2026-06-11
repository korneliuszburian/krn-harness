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
export type HookOwnershipModel = "task-context-owned-proof-paths-v1";
export type HookOperatorMessageVersion = "hook-operator-message-v1";
export type HookRemediationCode =
  | "run-krn-start"
  | "run-krn-context"
  | "scope-path"
  | "review-owned-proof-path"
  | "avoid-do-not-use-path"
  | "resolve-context-stop"
  | "send-valid-hook-json"
  | "run-krn-verify"
  | "run-krn-handoff"
  | "resolve-verify-block";

export interface HookLocalizedText {
  en: string;
  pl: string;
}

export interface HookRemediationHint extends HookLocalizedText {
  code: HookRemediationCode;
}

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
  taskText?: string | undefined;
  contextStopReason?: string | undefined;
  writablePaths?: string[] | undefined;
  doNotUsePaths?: string[] | undefined;
  missingContextPaths?: string[] | undefined;
  ownedProofPaths?: string[] | undefined;
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
    | "proof-path-exception"
    | "final-verify-missing"
    | "final-verify-blocked"
    | "final-handoff-missing";
  severity: HookFindingSeverity;
  detail: string;
  path?: string | undefined;
  ownershipHint?: string | undefined;
}

export interface HookResult {
  provider: "codex";
  event: string;
  supported: boolean;
  status: "ok" | "warn" | "blocked" | "ignored";
  decision: HookDecision;
  enforced: false;
  ownershipModel: HookOwnershipModel;
  ownedProofPathHintLimit: number;
  tracePayloadByteLimit: number;
  ownedProofPathHints: string[];
  payloadSource: HookPayloadSource;
  detail: string;
  operatorMessageVersion: HookOperatorMessageVersion;
  userFacingMessage: HookLocalizedText;
  remediationCodes: HookRemediationCode[];
  remediationHints: HookRemediationHint[];
  findings: HookGuardrailFinding[];
}

export const hookOwnershipModel: HookOwnershipModel = "task-context-owned-proof-paths-v1";
export const hookOperatorMessageVersion: HookOperatorMessageVersion = "hook-operator-message-v1";
export const maxOwnedProofPathHints = 4;
export const maxHookTracePayloadBytes = 1024;
export const maxHookRemediationCodes = 6;

const remediationHintCatalog: Record<HookRemediationCode, HookLocalizedText> = {
  "run-krn-start": {
    en: 'Run `krn start "<task>"` to create current task artifacts.',
    pl: 'Uruchom `krn start "<zadanie>"`, żeby utworzyć aktualny kontrakt zadania.',
  },
  "run-krn-context": {
    en: "Run `krn context` to rebuild current context before editing.",
    pl: "Uruchom `krn context`, żeby odświeżyć aktualny kontekst przed edycją.",
  },
  "scope-path": {
    en: "Add the path to the task scope before editing it.",
    pl: "Dodaj tę ścieżkę do zakresu zadania przed edycją.",
  },
  "review-owned-proof-path": {
    en: "Review the owned proof path before handoff.",
    pl: "Sprawdź owned proof path przed handoffem.",
  },
  "avoid-do-not-use-path": {
    en: "Choose a path outside the current do-not-use bucket.",
    pl: "Wybierz ścieżkę spoza aktualnego bucketu do-not-use.",
  },
  "resolve-context-stop": {
    en: "Resolve the active context STOP before editing.",
    pl: "Rozwiąż aktywny STOP kontekstu przed edycją.",
  },
  "send-valid-hook-json": {
    en: "Send valid hook JSON or omit stdin for placeholder mode.",
    pl: "Przekaż poprawny JSON hooka albo pomiń stdin dla trybu placeholder.",
  },
  "run-krn-verify": {
    en: "Run `krn verify` before final Stop.",
    pl: "Uruchom `krn verify` przed końcowym Stop.",
  },
  "run-krn-handoff": {
    en: "Run `krn handoff` before final Stop.",
    pl: "Uruchom `krn handoff` przed końcowym Stop.",
  },
  "resolve-verify-block": {
    en: "Fix the blocked verify result or preserve an active context STOP.",
    pl: "Napraw zablokowany wynik verify albo zachowaj aktywny STOP kontekstu.",
  },
};

interface ProofPathOwnershipRule {
  anyTerms?: string[] | undefined;
  allTerms?: string[] | undefined;
  hints: string[];
}

const p0ProofPathOwnershipRules: ProofPathOwnershipRule[] = [
  {
    anyTerms: ["adapter", "onboarding", "install"],
    hints: ["docs/specs/onboarding.md", "docs/specs/runtime-skill-adapter.md"],
  },
  {
    anyTerms: ["config", "configuration"],
    hints: ["docs/specs/krn-config.schema.md"],
  },
  {
    anyTerms: ["context", "ranking"],
    hints: ["docs/specs/context-package.schema.md"],
  },
  {
    anyTerms: ["doctor", "health"],
    hints: ["docs/specs/doctor-result.schema.md"],
  },
  {
    anyTerms: ["eval", "evals", "grader", "graders", "matrix"],
    hints: ["docs/specs/eval-result.schema.md", "fixtures/hooks"],
  },
  {
    anyTerms: ["graph"],
    hints: ["docs/specs/graph-lite.md"],
  },
  {
    anyTerms: ["hook", "hooks", "guardrail", "guardrails", "codex"],
    hints: ["docs/specs/hooks-pack.md", "fixtures/hooks"],
  },
  {
    anyTerms: ["memory"],
    hints: ["docs/specs/memory.schema.md"],
  },
  {
    allTerms: ["task", "contract"],
    hints: ["docs/specs/task-contract.schema.md"],
  },
  {
    anyTerms: ["trace", "traces", "finding", "findings"],
    hints: ["docs/specs/trace.schema.md"],
  },
  {
    anyTerms: ["verify", "verification"],
    hints: ["docs/specs/verify-result.schema.md"],
  },
  {
    anyTerms: ["handoff"],
    hints: ["docs/specs/handoff.md"],
  },
];

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

function uniqueSortedPaths(paths: string[]): string[] {
  return [...new Set(paths.map(normalizeHookPath).filter((item) => item.length > 0))].sort(
    (left, right) => left.localeCompare(right),
  );
}

function isBroadProofPathHint(filePath: string): boolean {
  const normalized = normalizeHookPath(filePath).replace(/\/+$/, "");

  return (
    normalized.length === 0 ||
    normalized === "docs" ||
    normalized === "fixtures" ||
    normalized === "test" ||
    normalized === "tests" ||
    normalized === "packages"
  );
}

function packageProofHintForPath(filePath: string): string | undefined {
  const match = /^packages\/([^/]+)\//.exec(normalizeHookPath(filePath));
  return match?.[1] ? `packages/${match[1]}` : undefined;
}

function ownershipSignalText(state: HookCurrentState): string {
  return [
    state.taskText,
    ...(state.writablePaths ?? []),
    ...(state.doNotUsePaths ?? []),
    ...(state.missingContextPaths ?? []),
    ...(state.ownedProofPaths ?? []),
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
}

function signalMatches(text: string, terms: string[]): boolean {
  return terms.some((term) => new RegExp(`(^|[^a-z0-9])${term}([^a-z0-9]|$)`, "u").test(text));
}

function ownershipRuleMatches(text: string, rule: ProofPathOwnershipRule): boolean {
  if (rule.allTerms?.every((term) => signalMatches(text, [term]))) {
    return true;
  }

  return rule.anyTerms ? signalMatches(text, rule.anyTerms) : false;
}

export function ownedProofPathHintsForState(state: HookCurrentState): string[] {
  const signalText = ownershipSignalText(state);
  const hints = [
    ...(state.ownedProofPaths ?? []),
    ...(state.writablePaths ?? []).flatMap((item) => packageProofHintForPath(item) ?? []),
  ];

  for (const rule of p0ProofPathOwnershipRules) {
    if (ownershipRuleMatches(signalText, rule)) {
      hints.push(...rule.hints);
    }
  }

  return uniqueSortedPaths(hints).filter((hint) => !isBroadProofPathHint(hint));
}

function compactOwnedProofPathHints(findings: HookGuardrailFinding[]): string[] {
  return uniqueSortedPaths(
    findings
      .filter((finding) => finding.code === "proof-path-exception")
      .map((finding) => finding.ownershipHint)
      .filter((hint): hint is string => typeof hint === "string"),
  ).slice(0, maxOwnedProofPathHints);
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

function isProofPath(filePath: string): boolean {
  const normalized = normalizeHookPath(filePath);

  return (
    normalized === "README.md" ||
    normalized.startsWith("docs/") ||
    normalized.startsWith("fixtures/") ||
    normalized.startsWith("tests/") ||
    normalized.startsWith("test/") ||
    normalized.includes("/__tests__/") ||
    /\.test\.[cm]?[jt]sx?$/.test(normalized) ||
    /\.spec\.[cm]?[jt]sx?$/.test(normalized)
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

function remediationCodesForFinding(code: HookGuardrailFinding["code"]): HookRemediationCode[] {
  if (code === "invalid-hook-payload") {
    return ["send-valid-hook-json"];
  }

  if (code === "missing-task-contract") {
    return ["run-krn-start"];
  }

  if (code === "missing-context-package") {
    return ["run-krn-context"];
  }

  if (code === "context-stop-active") {
    return ["resolve-context-stop"];
  }

  if (code === "do-not-use-edit") {
    return ["avoid-do-not-use-path"];
  }

  if (code === "out-of-scope-edit") {
    return ["run-krn-context", "scope-path"];
  }

  if (code === "proof-path-exception") {
    return ["review-owned-proof-path"];
  }

  if (code === "final-verify-missing") {
    return ["run-krn-verify"];
  }

  if (code === "final-verify-blocked") {
    return ["resolve-verify-block"];
  }

  return ["run-krn-handoff"];
}

function remediationCodesForFindings(findings: HookGuardrailFinding[]): HookRemediationCode[] {
  const codes: HookRemediationCode[] = [];

  for (const finding of findings) {
    for (const code of remediationCodesForFinding(finding.code)) {
      if (!codes.includes(code)) {
        codes.push(code);
      }
    }
  }

  return codes.slice(0, maxHookRemediationCodes);
}

function remediationHintsForCodes(codes: HookRemediationCode[]): HookRemediationHint[] {
  return codes.map((code) => ({
    code,
    ...remediationHintCatalog[code],
  }));
}

function findingCodesSet(findings: HookGuardrailFinding[]): Set<HookGuardrailFinding["code"]> {
  return new Set(findings.map((finding) => finding.code));
}

function operatorMessageFor(
  decision: HookDecision,
  supported: boolean,
  findings: HookGuardrailFinding[],
): HookLocalizedText {
  if (!supported) {
    return {
      en: "Hook event is not supported in P0. Ignored without action.",
      pl: "To zdarzenie hooka nie jest wspierane w P0. Pominięto bez akcji.",
    };
  }

  if (findings.length === 0) {
    return {
      en: "Hook guardrails passed. Continue.",
      pl: "Guardrails hooka przeszły. Możesz kontynuować.",
    };
  }

  const codes = findingCodesSet(findings);

  if (codes.has("final-verify-missing") || codes.has("final-handoff-missing")) {
    return {
      en: "Blocked: final Stop needs verification and handoff. Run `krn verify` and run `krn handoff`.",
      pl: "Zablokowano: końcowy Stop wymaga verify i handoff. Uruchom `krn verify` i uruchom `krn handoff`.",
    };
  }

  if (codes.has("final-verify-blocked")) {
    return {
      en: "Blocked: verify is blocked. Fix verification or keep the context STOP active before final Stop.",
      pl: "Zablokowano: verify jest zablokowane. Napraw weryfikację albo zachowaj aktywny STOP kontekstu przed końcowym Stop.",
    };
  }

  if (codes.has("do-not-use-edit")) {
    return {
      en: "Blocked: this path is marked do-not-use by the current context. Pick another path or rebuild context.",
      pl: "Zablokowano: ta ścieżka jest oznaczona jako do-not-use w aktualnym kontekście. Wybierz inną ścieżkę albo przebuduj kontekst.",
    };
  }

  if (codes.has("out-of-scope-edit")) {
    return {
      en: "Blocked: this edit is outside the current context. Run `krn context` or add this path to the task scope.",
      pl: "Zablokowano: ta zmiana jest poza aktualnym kontekstem. Uruchom `krn context` albo dodaj tę ścieżkę do zakresu zadania.",
    };
  }

  if (codes.has("context-stop-active")) {
    return {
      en: "STOP is active in the current context. Resolve the missing context before editing.",
      pl: "STOP jest aktywny w aktualnym kontekście. Uzupełnij brakujący kontekst przed edycją.",
    };
  }

  if (codes.has("missing-task-contract") && codes.has("missing-context-package")) {
    return {
      en: 'Current task and context are missing. Run `krn start "<task>"`, then run `krn context`.',
      pl: 'Brakuje aktualnego zadania i kontekstu. Uruchom `krn start "<zadanie>"`, potem `krn context`.',
    };
  }

  if (codes.has("missing-task-contract")) {
    return {
      en: 'Current task is missing. Run `krn start "<task>"` first.',
      pl: 'Brakuje aktualnego zadania. Najpierw uruchom `krn start "<zadanie>"`.',
    };
  }

  if (codes.has("missing-context-package")) {
    return {
      en: "Current context is missing. Run `krn context` before editing or stopping.",
      pl: "Brakuje aktualnego kontekstu. Uruchom `krn context` przed edycją albo końcowym Stop.",
    };
  }

  if (codes.has("proof-path-exception")) {
    return {
      en: "Warning: allowed as an owned proof path. Review it before handoff.",
      pl: "Ostrzeżenie: dozwolone jako owned proof path. Sprawdź to przed handoffem.",
    };
  }

  if (codes.has("invalid-hook-payload")) {
    return {
      en: "Warning: hook input was not valid JSON. Send valid JSON or omit stdin.",
      pl: "Ostrzeżenie: wejście hooka nie było poprawnym JSON. Przekaż poprawny JSON albo pomiń stdin.",
    };
  }

  return decision === "block"
    ? {
        en: "Blocked by P0 hook guardrails. Check findings and current KRN artifacts.",
        pl: "Zablokowano przez guardrails P0. Sprawdź findings i aktualne artefakty KRN.",
      }
    : {
        en: "Warning from P0 hook guardrails. Check findings before continuing.",
        pl: "Ostrzeżenie z guardrails P0. Sprawdź findings przed kontynuacją.",
      };
}

function operatorGuidanceFor(
  decision: HookDecision,
  supported: boolean,
  findings: HookGuardrailFinding[],
): Pick<HookResult, "userFacingMessage" | "remediationCodes" | "remediationHints"> {
  const remediationCodes = remediationCodesForFindings(findings);

  return {
    userFacingMessage: operatorMessageFor(decision, supported, findings),
    remediationCodes,
    remediationHints: remediationHintsForCodes(remediationCodes),
  };
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
