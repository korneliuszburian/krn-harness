import { getRuntimeLayout, runtimePath } from "../../../core/src/index.js";
import {
  buildEvalBaselineArtifact,
  readEvalBaseline,
  renderEvalResultMarkdown,
  runEval,
  writeEvalBaseline,
} from "../../../evals/src/index.js";
import { defaultTracePath } from "../../../trace/src/index.js";
import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

export async function evalCommand(runtime: CliRuntime): Promise<number> {
  const layout = getRuntimeLayout(runtime.cwd);
  const result = await runEval({
    cwd: runtime.cwd,
    tracePath: runtime.tracePath ?? defaultTracePath(runtime.cwd),
  });

  await writeCurrentJson(runtime.cwd, "eval-result.json", result);
  await writeCurrentMarkdown(runtime.cwd, "eval-result.md", renderEvalResultMarkdown(result));
  const baseline = buildEvalBaselineArtifact({
    cwd: runtime.cwd,
    result,
    previous: await readEvalBaseline(runtime.cwd),
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
  });
  await writeEvalBaseline(runtime.cwd, baseline);
  await writeCurrentJson(runtime.cwd, "eval-baseline.json", baseline);

  await emitCliTrace(runtime, "eval.ran", {
    runScoped: true,
    data: {
      status: result.status,
      fixtures: result.fixtures.length,
      passCount: result.passCount,
      failCount: result.failCount,
      graphStatus: result.graph.status,
      graphArtifactStatus: result.graphArtifact.status,
      downstreamStatus: result.downstream.status,
      verifyStatus: result.verify.status,
      hookStatus: result.hooks.status,
      memoryStatus: result.memory.status,
      runTraceMode: result.runTraceMode,
      baselineStatus: baseline.comparison.status,
      baselinePath: runtimePath(layout.evalsDir, "baseline.json"),
    },
  });

  runtime.stdout(`KRN eval: ${result.status}
fixtures: ${result.fixtures.length}
result: ${runtimePath(layout.currentDir, "eval-result.md")}
baseline: ${runtimePath(layout.evalsDir, "baseline.json")}
`);

  return 0;
}
