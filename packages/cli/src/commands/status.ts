import { loadConfig } from "../../../config/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

export async function statusCommand(runtime: CliRuntime): Promise<number> {
  const loaded = await loadConfig(runtime.cwd);
  await writeTraceEvent(
    createTraceEvent("cli.status", {
      now: runtime.now?.(),
      data: {
        configSource: loaded.source,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN status: ready
config: ${loaded.source}
runtime: ${loaded.config.runtime?.dir ?? ".krn"}
`);

  return 0;
}
