import { buildContextPackage, renderContextPackageMarkdown } from "../../../context/src/index.js";
import { getRuntimeLayout, runtimePath } from "../../../core/src/index.js";
import { buildGraph, protectedGraphPathPolicy } from "../../../graph/src/index.js";
import { loadMemoryStore } from "../../../memory/src/index.js";
import {
  readCurrentTaskContract,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "../current-state.js";
import { graphScanOptionsForTaskContract } from "../graph-scan-policy.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

export async function contextCommand(runtime: CliRuntime): Promise<number> {
  const layout = getRuntimeLayout(runtime.cwd);
  const contract = await readCurrentTaskContract(runtime.cwd);
  const scanOptions = graphScanOptionsForTaskContract(contract);
  const graph = await buildGraph(runtime.cwd, undefined, scanOptions);
  const approvedMemory = await loadMemoryStore(runtime.cwd, "approved");
  const pkg = buildContextPackage(contract, graph, {
    approvedMemory: approvedMemory.records,
  });
  await writeCurrentMarkdown(runtime.cwd, "context-package.md", renderContextPackageMarkdown(pkg));
  await writeCurrentJson(runtime.cwd, "context-package.json", pkg);

  await emitCliTrace(runtime, "context.built", {
    taskId: pkg.taskId,
    runScoped: true,
    data: {
      stop: pkg.stop,
      budgetStatus: pkg.budget.status,
      estimatedTokens: pkg.budget.estimatedTokens,
      retainedTokens: pkg.budget.retainedTokens,
      prunedItems: pkg.budget.prunedItems.length,
      graphScanPolicy: protectedGraphPathPolicy,
      taskDoNotUsePathCount: scanOptions.excludePathPatterns?.length ?? 0,
    },
  });

  runtime.stdout(`KRN context: package written
context: ${runtimePath(layout.currentDir, "context-package.md")}
stop: ${pkg.stop ? "true" : "false"}
`);

  return 0;
}
