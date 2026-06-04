import { readdir } from "node:fs/promises";
import path from "node:path";
import type { GraphDetector } from "../graph-types.js";
import { toGraphPath } from "../path-utils.js";

export const filesystemDetector: GraphDetector = {
  name: "filesystem",
  async detect(cwd) {
    const entries = await readdir(cwd, { withFileTypes: true });

    return {
      nodes: entries
        .filter((entry) => entry.isDirectory() || entry.isFile())
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((entry) => {
          const absolutePath = path.join(cwd, entry.name);
          const graphPath = toGraphPath(cwd, absolutePath);

          return {
            id: `fs:${graphPath}`,
            kind: entry.isDirectory() ? "directory" : "file",
            label: entry.name,
            evidencePath: graphPath,
          };
        }),
      edges: [],
    };
  },
};
