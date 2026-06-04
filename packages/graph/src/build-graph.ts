import { acfJsonDetector } from "./detectors/acf-json.js";
import { composerJsonDetector } from "./detectors/composer-json.js";
import { cssClassDetector } from "./detectors/css-class.js";
import { docsLinksDetector } from "./detectors/docs-links.js";
import { filesystemDetector } from "./detectors/filesystem.js";
import { packageJsonDetector } from "./detectors/package-json.js";
import { wordpressBedrockDetector } from "./detectors/wordpress-bedrock.js";
import type { GraphDetector, GraphEdge, GraphLite, GraphNode } from "./graph-types.js";

export const defaultDetectors: GraphDetector[] = [
  filesystemDetector,
  docsLinksDetector,
  packageJsonDetector,
  composerJsonDetector,
  cssClassDetector,
  acfJsonDetector,
  wordpressBedrockDetector,
];

function uniqueNodes(nodes: GraphNode[]): GraphNode[] {
  return [...new Map(nodes.map((node) => [node.id, node])).values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

function uniqueEdges(edges: GraphEdge[]): GraphEdge[] {
  return [
    ...new Map(
      edges.map((edge) => [`${edge.from}\0${edge.kind}\0${edge.to}\0${edge.evidencePath}`, edge]),
    ).values(),
  ].sort(
    (left, right) =>
      left.from.localeCompare(right.from) ||
      left.kind.localeCompare(right.kind) ||
      left.to.localeCompare(right.to) ||
      left.evidencePath.localeCompare(right.evidencePath),
  );
}

export async function buildGraph(
  cwd = process.cwd(),
  detectors = defaultDetectors,
): Promise<GraphLite> {
  const graphs = await Promise.all(detectors.map((detector) => detector.detect(cwd)));

  return {
    nodes: uniqueNodes(graphs.flatMap((graph) => graph.nodes)),
    edges: uniqueEdges(graphs.flatMap((graph) => graph.edges)),
  };
}
