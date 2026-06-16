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
export type HookTracePayloadMode = "full" | "compacted";
export type HookRemediationCode =
  | "run-krn-start"
  | "run-krn-context"
  | "scope-path"
  | "review-owned-proof-path"
  | "avoid-do-not-use-path"
  | "resolve-context-stop"
  | "send-valid-hook-json"
  | "run-krn-run"
  | "run-krn-report"
  | "run-krn-verify"
  | "run-krn-handoff"
  | "resolve-verify-block";
export type HookGuardrailFindingCode =
  | "invalid-hook-payload"
  | "missing-task-contract"
  | "missing-context-package"
  | "context-stop-active"
  | "do-not-use-edit"
  | "out-of-scope-edit"
  | "proof-path-exception"
  | "pre-compact-run-result-missing"
  | "pre-compact-report-missing"
  | "post-compact-context-refresh-needed"
  | "final-verify-missing"
  | "final-verify-blocked"
  | "final-handoff-missing";

export interface HookLocalizedText {
  en: string;
  pl: string;
}

export interface HookRemediationHint extends HookLocalizedText {
  code: HookRemediationCode;
}

export type HookTraceJsonValue =
  | string
  | number
  | boolean
  | null
  | HookTraceJsonValue[]
  | { [key: string]: HookTraceJsonValue };

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
  runResultPresent?: boolean | undefined;
  reportPresent?: boolean | undefined;
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
  code: HookGuardrailFindingCode;
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

export interface HookTracePayload extends Record<string, HookTraceJsonValue> {
  provider: "codex";
  event: string;
  supported: boolean;
  status: HookResult["status"];
  decision: HookDecision;
  enforced: false;
  ownershipModel: HookOwnershipModel;
  ownedProofPathHintLimit: number;
  tracePayloadByteLimit: number;
  ownedProofPathHints: string[];
  payloadSource: HookPayloadSource;
  detail: string;
  findingCodes: HookGuardrailFindingCode[];
  operatorMessageVersion: HookOperatorMessageVersion;
  remediationCodes: HookRemediationCode[];
  tracePayloadMode: HookTracePayloadMode;
}

export const hookOwnershipModel: HookOwnershipModel = "task-context-owned-proof-paths-v1";
export const hookOperatorMessageVersion: HookOperatorMessageVersion = "hook-operator-message-v1";
export const maxOwnedProofPathHints = 4;
export const maxHookTracePayloadBytes = 1024;
export const maxHookRemediationCodes = 6;
export const hookTraceCompactedDetail = "P0 hook trace payload compacted to fit budget";

export const hookRemediationCodeTaxonomy: HookRemediationCode[] = [
  "run-krn-start",
  "run-krn-context",
  "scope-path",
  "review-owned-proof-path",
  "avoid-do-not-use-path",
  "resolve-context-stop",
  "send-valid-hook-json",
  "run-krn-run",
  "run-krn-report",
  "run-krn-verify",
  "run-krn-handoff",
  "resolve-verify-block",
];

export const hookRemediationHintCatalog: Record<HookRemediationCode, HookLocalizedText> = {
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
  "run-krn-run": {
    en: "Run `krn run --task-spec ... --bundle` or `krn run --task ... --bundle` before compacting.",
    pl: "Uruchom `krn run --task-spec ... --bundle` albo `krn run --task ... --bundle` przed kompakcją.",
  },
  "run-krn-report": {
    en: "Run `krn report --write` or `krn report --bundle` before compacting.",
    pl: "Uruchom `krn report --write` albo `krn report --bundle` przed kompakcją.",
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

export function isSupportedCodexHookEvent(event: string): event is CodexHookEvent {
  return supportedCodexHookEvents.includes(event as CodexHookEvent);
}
