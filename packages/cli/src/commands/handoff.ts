import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

export async function handoffCommand(runtime: CliRuntime): Promise<number> {
  await writeTraceEvent(
    createTraceEvent("handoff.created", {
      now: runtime.now?.(),
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN handoff: ready
summary: collect changed files, validation, gaps, and next goal
`);

  return 0;
}
