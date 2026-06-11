import type { GraphEdge, GraphLite, GraphNode } from "./graph-types.js";

export interface GraphArtifact {
  schemaVersion: 1;
  generatedAt: string;
  nodeCount: number;
  edgeCount: number;
  detectors: string[];
  relationKindCounts: Record<string, number>;
  nodeKindCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface BuildGraphArtifactInput {
  generatedAt: string;
  detectors: string[];
}

const selectedEvidenceLimit = 5;

function countBy(values: string[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return Object.fromEntries(
    [...counts.entries()].sort(([left], [right]) => left.localeCompare(right)),
  );
}

function sortedNodes(nodes: GraphNode[]): GraphNode[] {
  return [...nodes].sort((left, right) => left.id.localeCompare(right.id));
}

function sortedEdges(edges: GraphEdge[]): GraphEdge[] {
  return [...edges].sort(
    (left, right) =>
      left.from.localeCompare(right.from) ||
      left.kind.localeCompare(right.kind) ||
      left.to.localeCompare(right.to) ||
      left.evidencePath.localeCompare(right.evidencePath),
  );
}

export function buildGraphArtifact(
  graph: GraphLite,
  input: BuildGraphArtifactInput,
): GraphArtifact {
  const nodes = sortedNodes(graph.nodes);
  const edges = sortedEdges(graph.edges);

  return {
    schemaVersion: 1,
    generatedAt: input.generatedAt,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    detectors: [...input.detectors].sort((left, right) => left.localeCompare(right)),
    relationKindCounts: countBy(edges.map((edge) => edge.kind)),
    nodeKindCounts: countBy(nodes.map((node) => node.kind)),
    statusCounts: countBy(nodes.map((node) => node.status ?? "unknown")),
    nodes,
    edges,
  };
}

function renderCountList(counts: Record<string, number>): string {
  const entries = Object.entries(counts);

  if (entries.length === 0) {
    return "- none";
  }

  return entries.map(([kind, count]) => `- ${kind}: ${count}`).join("\n");
}

function renderNodeExamples(nodes: GraphNode[]): string {
  if (nodes.length === 0) {
    return "- none";
  }

  return nodes
    .slice(0, selectedEvidenceLimit)
    .map((node) => `- \`${node.id}\` (${node.kind}) at \`${node.evidencePath}\``)
    .join("\n");
}

function renderEdgeExamples(edges: GraphEdge[]): string {
  if (edges.length === 0) {
    return "- none";
  }

  return edges
    .slice(0, selectedEvidenceLimit)
    .map((edge) => `- \`${edge.from}\` -${edge.kind}-> \`${edge.to}\` via \`${edge.evidencePath}\``)
    .join("\n");
}

function renderDeprecatedDocs(nodes: GraphNode[]): string {
  const deprecatedDocs = nodes.filter(
    (node) => node.kind === "doc" && node.status === "deprecated",
  );

  if (deprecatedDocs.length === 0) {
    return "- none";
  }

  return deprecatedDocs
    .slice(0, selectedEvidenceLimit)
    .map((node) => `- \`${node.evidencePath}\` (${node.id})`)
    .join("\n");
}

export function renderGraphArtifactMarkdown(artifact: GraphArtifact): string {
  return `# Graph-Lite Repository Graph

Generated: ${artifact.generatedAt}
Schema version: ${artifact.schemaVersion}
Status: graph-lite-p0

## Summary

- Nodes: ${artifact.nodeCount}
- Edges: ${artifact.edgeCount}
- Deprecated docs: ${artifact.statusCounts.deprecated ?? 0}

## Detectors

${artifact.detectors.length === 0 ? "- none" : artifact.detectors.map((detector) => `- ${detector}`).join("\n")}

## Node Kind Counts

${renderCountList(artifact.nodeKindCounts)}

## Relation Kind Counts

${renderCountList(artifact.relationKindCounts)}

## Status Counts

${renderCountList(artifact.statusCounts)}

## Deprecated Docs

${renderDeprecatedDocs(artifact.nodes)}

## Selected Evidence Examples

### Nodes

${renderNodeExamples(artifact.nodes)}

### Edges

${renderEdgeExamples(artifact.edges)}

## P0 Limits

Graph-lite is shallow P0 evidence. It does not include AST, Tree-sitter, callgraph, dataflow, embeddings, or production WordPress/ACF detection.
`;
}
