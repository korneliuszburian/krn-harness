import path from "node:path";
import { isRecord, parseJsonFile } from "./doctor-json.js";
import type { DoctorCheck } from "./doctor-types.js";

function isGraphArtifact(value: unknown): value is {
  nodeCount: number;
  edgeCount: number;
  detectors: unknown[];
  relationKindCounts: Record<string, unknown>;
  moduleDependencies: unknown[];
  nodes: unknown[];
  edges: unknown[];
} {
  return (
    isRecord(value) &&
    typeof value.nodeCount === "number" &&
    typeof value.edgeCount === "number" &&
    Array.isArray(value.detectors) &&
    isRecord(value.relationKindCounts) &&
    Array.isArray(value.moduleDependencies) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

export async function graphJsonShapeCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/graph/repo-graph.json";
  const parsed = await parseJsonFile(path.join(cwd, relativePath));

  if (parsed.status === "missing") {
    return {
      name: "graph-json-shape",
      status: "warn",
      detail: `${relativePath} is missing; graph shape not checked`,
    };
  }

  if (parsed.status === "malformed") {
    return {
      name: "graph-json-shape",
      status: "fail",
      detail: `${relativePath} is malformed`,
    };
  }

  if (!isGraphArtifact(parsed.value)) {
    return {
      name: "graph-json-shape",
      status: "fail",
      detail: `${relativePath} is incomplete`,
    };
  }

  if (parsed.value.nodeCount !== parsed.value.nodes.length) {
    return {
      name: "graph-json-shape",
      status: "fail",
      detail: `${relativePath} nodeCount does not match nodes length`,
    };
  }

  if (parsed.value.edgeCount !== parsed.value.edges.length) {
    return {
      name: "graph-json-shape",
      status: "fail",
      detail: `${relativePath} edgeCount does not match edges length`,
    };
  }

  return {
    name: "graph-json-shape",
    status: "pass",
    detail: `${relativePath} has ${parsed.value.nodeCount} node(s) and ${parsed.value.edgeCount} edge(s)`,
  };
}

export async function graphSummaryCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/graph/repo-graph.json";
  const parsed = await parseJsonFile(path.join(cwd, relativePath));

  if (parsed.status === "missing") {
    return {
      name: "graph-summary",
      status: "warn",
      detail: `${relativePath} is missing; graph summary not checked`,
    };
  }

  if (parsed.status === "malformed" || !isGraphArtifact(parsed.value)) {
    return {
      name: "graph-summary",
      status: "fail",
      detail: `${relativePath} summary fields are unavailable`,
    };
  }

  return {
    name: "graph-summary",
    status: parsed.value.detectors.length > 0 ? "pass" : "warn",
    detail:
      parsed.value.detectors.length > 0
        ? `${parsed.value.detectors.length} detector(s), ${Object.keys(parsed.value.relationKindCounts).length} relation kind(s)`
        : "No graph detectors are recorded",
  };
}
