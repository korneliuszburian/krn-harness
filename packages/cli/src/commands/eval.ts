import { renderEvalResultMarkdown, runEval } from "../../../evals/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import type { CliRuntime } from "../runtime.js";

export async function evalCommand(runtime: CliRuntime): Promise<number> {
  const result = await runEval({
    cwd: runtime.cwd,
    tracePath: runtime.tracePath ?? defaultTracePath(runtime.cwd),
  });

  await writeCurrentJson(runtime.cwd, "eval-result.json", result);
  await writeCurrentMarkdown(runtime.cwd, "eval-result.md", renderEvalResultMarkdown(result));

  await writeTraceEvent(
    createTraceEvent("eval.ran", {
      now: runtime.now?.(),
      data: {
        status: result.status,
        fixtures: result.fixtures.length,
        passCount: result.passCount,
        failCount: result.failCount,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN eval: ${result.status}
fixtures: ${result.fixtures.length}
result: .krn/current/eval-result.md
`);

  return 0;
}
