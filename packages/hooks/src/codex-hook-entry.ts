export type CodexHookEvent =
  | "SessionStart"
  | "UserPromptSubmit"
  | "PreToolUse"
  | "PostToolUse"
  | "PreCompact"
  | "PostCompact"
  | "Stop";

export interface HookResult {
  event: CodexHookEvent;
  status: "ok";
  detail: string;
}

export function handleCodexHook(event: CodexHookEvent): HookResult {
  return {
    event,
    status: "ok",
    detail: "P0 hook entrypoint received event; no policy enforcement is implemented",
  };
}
