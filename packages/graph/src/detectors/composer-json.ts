import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GraphDetector, GraphEdge, GraphNode } from "../graph-types.js";
import { toGraphPath, walkFiles } from "../path-utils.js";

interface ComposerJsonShape {
  name?: string;
  type?: string;
  scripts?: Record<string, string | string[]>;
}

export const composerJsonDetector: GraphDetector = {
  name: "composer-json",
  async detect(cwd) {
    const composerPaths = (await walkFiles(cwd)).filter(
      (file) => path.basename(file) === "composer.json",
    );
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const composerPath of composerPaths) {
      const graphPath = toGraphPath(cwd, composerPath);
      const composer = JSON.parse(await readFile(composerPath, "utf8")) as ComposerJsonShape;
      const composerId = `composer-json:${graphPath}`;

      nodes.push({
        id: composerId,
        kind: "composer-json",
        label: composer.name ?? graphPath,
        evidencePath: graphPath,
      });

      if (composer.type) {
        const typeId = `composer-type:${composer.type}`;
        nodes.push({
          id: typeId,
          kind: "composer-type",
          label: composer.type,
          evidencePath: graphPath,
        });
        edges.push({
          from: composerId,
          to: typeId,
          kind: "has-composer-type",
          evidencePath: graphPath,
        });
      }

      for (const [scriptName, command] of Object.entries(composer.scripts ?? {}).sort(
        ([left], [right]) => left.localeCompare(right),
      )) {
        const scriptId = `composer-script:${graphPath}#${scriptName}`;
        nodes.push({
          id: scriptId,
          kind: "composer-script",
          label: scriptName,
          evidencePath: graphPath,
        });
        edges.push({
          from: composerId,
          to: scriptId,
          kind: "declares-script",
          evidencePath: graphPath,
        });
        edges.push({
          from: scriptId,
          to: `command:${Array.isArray(command) ? command.join(" && ") : command}`,
          kind: "runs-command",
          evidencePath: graphPath,
        });
      }
    }

    return { nodes, edges };
  },
};
