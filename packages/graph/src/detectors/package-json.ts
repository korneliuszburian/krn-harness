import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GraphDetector, GraphEdge, GraphNode } from "../graph-types.js";
import { toGraphPath, walkFiles } from "../path-utils.js";

interface PackageJsonShape {
  name?: string;
  scripts?: Record<string, string>;
}

export const packageJsonDetector: GraphDetector = {
  name: "package-json",
  async detect(cwd, context) {
    const packagePaths = await walkFiles(cwd, undefined, context?.scanPolicy).then((files) =>
      files.filter((file) => path.basename(file) === "package.json"),
    );
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    for (const packagePath of packagePaths) {
      const graphPath = toGraphPath(cwd, packagePath);
      const pkg = JSON.parse(await readFile(packagePath, "utf8")) as PackageJsonShape;
      const packageId = `package-json:${graphPath}`;

      nodes.push({
        id: packageId,
        kind: "package-json",
        label: pkg.name ?? graphPath,
        evidencePath: graphPath,
      });

      for (const [scriptName, command] of Object.entries(pkg.scripts ?? {}).sort(
        ([left], [right]) => left.localeCompare(right),
      )) {
        const scriptId = `package-script:${graphPath}#${scriptName}`;
        nodes.push({
          id: scriptId,
          kind: "package-script",
          label: scriptName,
          evidencePath: graphPath,
        });
        edges.push({
          from: packageId,
          to: scriptId,
          kind: "declares-script",
          evidencePath: graphPath,
        });
        edges.push({
          from: scriptId,
          to: `command:${command}`,
          kind: "runs-command",
          evidencePath: graphPath,
        });
      }
    }

    return { nodes, edges };
  },
};
