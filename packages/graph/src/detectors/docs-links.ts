import { readFile } from "node:fs/promises";
import type { GraphDetector, GraphEdge, GraphNode } from "../graph-types.js";
import { toGraphPath, walkFiles } from "../path-utils.js";

const markdownLinkPattern = /\[[^\]]+\]\(([^)]+)\)/g;
const deprecatedPattern = /\b(deprecated|outdated|stale|old plan)\b/i;

export const docsLinksDetector: GraphDetector = {
  name: "docs-links",
  async detect(cwd, context) {
    const markdownPaths = await walkFiles(cwd, new Set([".md"]), context?.scanPolicy);
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const markdownPath of markdownPaths) {
      const graphPath = toGraphPath(cwd, markdownPath);
      const content = await readFile(markdownPath, "utf8");
      const status = deprecatedPattern.test(content) ? "deprecated" : "available";
      const docId = `doc:${graphPath}`;

      nodes.push({
        id: docId,
        kind: "doc",
        label: graphPath,
        evidencePath: graphPath,
        status,
      });

      for (const match of content.matchAll(markdownLinkPattern)) {
        const target = match[1];
        if (
          !target ||
          target.startsWith("http://") ||
          target.startsWith("https://") ||
          target.startsWith("#")
        ) {
          continue;
        }

        edges.push({
          from: docId,
          to: `doc-link:${target}`,
          kind: "links-to",
          evidencePath: graphPath,
        });
      }
    }

    return { nodes, edges };
  },
};
