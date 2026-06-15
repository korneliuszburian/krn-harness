import type { GraphDetector, GraphEdge, GraphNode } from "../graph-types.js";
import { graphPathJoin, toGraphPath, walkFiles } from "../path-utils.js";

function siteRootFor(graphPath: string): string | undefined {
  const parts = graphPath.split("/");
  const markerIndex = parts.findIndex(
    (part) => part === "acf" || part === "acf-json" || part === "theme",
  );

  if (markerIndex < 0) {
    return undefined;
  }

  const rootEnd =
    parts[markerIndex] === "theme" && parts[markerIndex - 1] === "src"
      ? markerIndex - 1
      : markerIndex;

  return parts.slice(0, rootEnd).join("/") || ".";
}

export const wordpressBedrockDetector: GraphDetector = {
  name: "wordpress-bedrock",
  async detect(cwd, context) {
    const files = await walkFiles(cwd, undefined, context?.scanPolicy);
    const graphPaths = files.map((file) => toGraphPath(cwd, file));
    const siteRoots = new Set(graphPaths.map(siteRootFor).filter((root) => root !== undefined));
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const siteRoot of [...siteRoots].sort((left, right) => left.localeCompare(right))) {
      const siteId = `wordpress-site:${siteRoot}`;
      const composerPath = graphPathJoin(siteRoot === "." ? "" : siteRoot, "composer.json");
      const siteFiles = graphPaths.filter((graphPath) => graphPath.startsWith(`${siteRoot}/`));

      nodes.push({
        id: siteId,
        kind: "wordpress-site",
        label: siteRoot,
        evidencePath: graphPaths.includes(composerPath) ? composerPath : siteRoot,
      });

      if (graphPaths.includes(composerPath)) {
        edges.push({
          from: siteId,
          to: `composer-json:${composerPath}`,
          kind: "uses-composer",
          evidencePath: composerPath,
        });
      }

      for (const graphPath of siteFiles.filter((file) => /\/(acf|acf-json)\//.test(file))) {
        edges.push({
          from: siteId,
          to: `file:${graphPath}`,
          kind: "has-acf-json",
          evidencePath: graphPath,
        });
      }

      for (const graphPath of siteFiles.filter((file) => file.includes("/theme/"))) {
        edges.push({
          from: siteId,
          to: `file:${graphPath}`,
          kind: "has-theme-file",
          evidencePath: graphPath,
        });
      }
    }

    return { nodes, edges };
  },
};
