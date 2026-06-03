import { filesystemDetector } from "./detectors/filesystem.js";
import { packageJsonDetector } from "./detectors/package-json.js";
import type { GraphDetector, GraphLite } from "./graph-types.js";

export const defaultDetectors: GraphDetector[] = [filesystemDetector, packageJsonDetector];

export async function buildGraph(
  cwd = process.cwd(),
  detectors = defaultDetectors,
): Promise<GraphLite> {
  const graphs = await Promise.all(detectors.map((detector) => detector.detect(cwd)));

  return {
    nodes: graphs.flatMap((graph) => graph.nodes),
    edges: graphs.flatMap((graph) => graph.edges),
  };
}
