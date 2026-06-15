import type { GraphScanPolicy } from "./scan-policy.js";

export interface GraphNode {
  id: string;
  kind: string;
  label: string;
  evidencePath: string;
  status?: "available" | "deprecated" | "missing" | undefined;
}

export interface GraphEdge {
  from: string;
  to: string;
  kind: string;
  evidencePath: string;
}

export interface GraphLite {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphDetector {
  name: string;
  detect(cwd: string, context?: GraphDetectorContext): Promise<GraphLite>;
}

export interface GraphDetectorContext {
  scanPolicy: GraphScanPolicy;
}

export const emptyGraph: GraphLite = {
  nodes: [],
  edges: [],
};
