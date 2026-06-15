import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GraphDetector, GraphEdge, GraphNode } from "../graph-types.js";
import { toGraphPath, walkFiles } from "../path-utils.js";

interface AcfField {
  key?: string;
  name?: string;
  label?: string;
  type?: string;
}

interface AcfGroup {
  key?: string;
  title?: string;
  status?: string;
  fields?: AcfField[];
}

export const acfJsonDetector: GraphDetector = {
  name: "acf-json",
  async detect(cwd, context) {
    const acfPaths = (await walkFiles(cwd, new Set([".json"]), context?.scanPolicy)).filter(
      (file) => /(^|\/)(acf|acf-json)\//.test(toGraphPath(cwd, file)),
    );
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const acfPath of acfPaths) {
      const graphPath = toGraphPath(cwd, acfPath);
      const group = JSON.parse(await readFile(acfPath, "utf8")) as AcfGroup;
      const groupId = `acf-group:${group.key ?? path.basename(acfPath, ".json")}`;

      nodes.push({
        id: groupId,
        kind: "acf-group",
        label: group.title ?? group.key ?? graphPath,
        evidencePath: graphPath,
        status: group.status === "deprecated" ? "deprecated" : "available",
      });

      for (const field of group.fields ?? []) {
        const fieldId = `acf-field:${field.name ?? field.key}`;
        nodes.push({
          id: fieldId,
          kind: "acf-field",
          label: field.name ?? field.label ?? field.key ?? "field",
          evidencePath: graphPath,
        });
        edges.push({
          from: groupId,
          to: fieldId,
          kind: "declares-acf-field",
          evidencePath: graphPath,
        });
      }
    }

    return { nodes, edges };
  },
};
