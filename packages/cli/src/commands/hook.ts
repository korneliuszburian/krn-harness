import { handleCodexHook } from "../../../hooks/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

export async function hookCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const [provider, event] = args;

  if (provider !== "codex" || !event) {
    runtime.stderr("KRN hook: expected `krn hook codex <event>`\n");
    return 1;
  }

  const result = handleCodexHook(event);
  await writeTraceEvent(
    createTraceEvent("hook.received", {
      now: runtime.now?.(),
      data: {
        provider: result.provider,
        event: result.event,
        supported: result.supported,
        status: result.status,
        payloadSource: result.payloadSource,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);

  return 0;
}
