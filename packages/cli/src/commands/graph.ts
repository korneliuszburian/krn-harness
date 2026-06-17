import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getRuntimeLayout, runtimePath } from "../../../core/src/index.js";
import {
  buildGraph,
  buildGraphArtifact,
  defaultDetectors,
  protectedGraphPathPolicy,
  renderGraphArtifactMarkdown,
} from "../../../graph/src/index.js";
import { readCurrentTaskContract } from "../current-state.js";
import { graphScanOptionsForTaskContract } from "../graph-scan-policy.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

export async function graphCommand(runtime: CliRuntime): Promise<number> {
  const layout = getRuntimeLayout(runtime.cwd);
  const graphJsonPath = runtimePath(layout.graphDir, "repo-graph.json");
  const graphMarkdownPath = runtimePath(layout.graphDir, "repo-graph.md");
  const contract = await readCurrentTaskContract(runtime.cwd);
  const scanOptions = graphScanOptionsForTaskContract(contract);
  const graph = await buildGraph(runtime.cwd, defaultDetectors, scanOptions);
  const artifact = buildGraphArtifact(graph, {
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    detectors: defaultDetectors.map((detector) => detector.name),
  });
  const graphDir = path.join(runtime.cwd, layout.graphDir);

  await mkdir(graphDir, { recursive: true });
  await writeFile(
    path.join(runtime.cwd, graphJsonPath),
    `${JSON.stringify(artifact, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    path.join(runtime.cwd, graphMarkdownPath),
    renderGraphArtifactMarkdown(artifact),
    "utf8",
  );
  await emitCliTrace(runtime, "graph.built", {
    runScoped: true,
    data: {
      nodeCount: artifact.nodeCount,
      edgeCount: artifact.edgeCount,
      detectors: artifact.detectors,
      relationKindCounts: artifact.relationKindCounts,
      nodeKindCounts: artifact.nodeKindCounts,
      graphScanPolicy: protectedGraphPathPolicy,
      taskDoNotUsePathCount: scanOptions.excludePathPatterns?.length ?? 0,
    },
  });

  runtime.stdout(`KRN graph: ready
nodes: ${artifact.nodeCount}
edges: ${artifact.edgeCount}
json: ${graphJsonPath}
markdown: ${graphMarkdownPath}
`);

  return 0;
}
