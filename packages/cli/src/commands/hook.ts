import { type CodexHookEvent, handleCodexHook } from "../../../hooks/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

const codexEvents = new Set<string>([
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "Stop",
]);

export async function hookCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const [provider, event] = args;

  if (provider !== "codex" || !event || !codexEvents.has(event)) {
    runtime.stderr("KRN hook: expected `krn hook codex <event>`\n");
    return 1;
  }

  const result = handleCodexHook(event as CodexHookEvent);
  await writeTraceEvent(
    createTraceEvent("hook.received", {
      now: runtime.now?.(),
      data: {
        event: result.event,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN hook: ok
event: ${result.event}
`);

  return 0;
}
