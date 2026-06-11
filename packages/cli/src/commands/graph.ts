import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  buildGraph,
  buildGraphArtifact,
  defaultDetectors,
  renderGraphArtifactMarkdown,
} from "../../../graph/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

const graphJsonPath = ".krn/graph/repo-graph.json";
const graphMarkdownPath = ".krn/graph/repo-graph.md";

export async function graphCommand(runtime: CliRuntime): Promise<number> {
  const graph = await buildGraph(runtime.cwd);
  const artifact = buildGraphArtifact(graph, {
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    detectors: defaultDetectors.map((detector) => detector.name),
  });
  const graphDir = path.join(runtime.cwd, ".krn", "graph");

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
  await writeTraceEvent(
    createTraceEvent("graph.built", {
      now: runtime.now?.(),
      data: {
        nodeCount: artifact.nodeCount,
        edgeCount: artifact.edgeCount,
        detectors: artifact.detectors,
        relationKindCounts: artifact.relationKindCounts,
        nodeKindCounts: artifact.nodeKindCounts,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`KRN graph: ready
nodes: ${artifact.nodeCount}
edges: ${artifact.edgeCount}
json: ${graphJsonPath}
markdown: ${graphMarkdownPath}
warning: graph-lite is shallow P0 evidence
`);

  return 0;
}
