import { runEval } from "../../../evals/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

export async function evalCommand(runtime: CliRuntime): Promise<number> {
  const result = await runEval();
  await writeTraceEvent(
    createTraceEvent("eval.ran", {
      now: runtime.now?.(),
      data: {
        fixtures: result.fixtures.length,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN eval: ${result.status}
fixtures: ${result.fixtures.length}
`);

  return 0;
}
