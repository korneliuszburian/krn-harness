import { buildContextPackage, renderContextPackageMarkdown } from "../../../context/src/index.js";
import { buildGraph } from "../../../graph/src/index.js";
import {
  readCurrentTaskContract,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "../current-state.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

export async function contextCommand(runtime: CliRuntime): Promise<number> {
  const contract = await readCurrentTaskContract(runtime.cwd);
  const graph = await buildGraph(runtime.cwd);
  const pkg = buildContextPackage(contract, graph);
  await writeCurrentMarkdown(runtime.cwd, "context-package.md", renderContextPackageMarkdown(pkg));
  await writeCurrentJson(runtime.cwd, "context-package.json", pkg);

  await emitCliTrace(runtime, "context.built", {
    taskId: pkg.taskId,
    runScoped: true,
    data: {
      stop: pkg.stop,
    },
  });

  runtime.stdout(`KRN context: package written
context: .krn/current/context-package.md
stop: ${pkg.stop ? "true" : "false"}
`);

  return 0;
}
