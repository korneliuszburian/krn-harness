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

export interface HookResult {
  provider: "codex";
  event: string;
  supported: boolean;
  status: "ok" | "ignored";
  payloadSource: "placeholder";
  detail: string;
}

export function isSupportedCodexHookEvent(event: string): event is CodexHookEvent {
  return supportedCodexHookEvents.includes(event as CodexHookEvent);
}

export function handleCodexHook(event: string): HookResult {
  const supported = isSupportedCodexHookEvent(event);

  return {
    provider: "codex",
    event,
    supported,
    status: supported ? "ok" : "ignored",
    payloadSource: "placeholder",
    detail: supported
      ? "P0 hook entrypoint received event; no policy enforcement is implemented"
      : "Unsupported Codex hook event ignored by P0 hook skeleton",
  };
}
