import { readdir } from "node:fs/promises";
import path from "node:path";
import type { GraphDetector } from "../graph-types.js";

export const filesystemDetector: GraphDetector = {
  name: "filesystem",
  async detect(cwd) {
    const entries = await readdir(cwd, { withFileTypes: true });

    return {
      nodes: entries
        .filter((entry) => entry.isDirectory() || entry.isFile())
        .map((entry) => ({
          id: `fs:${entry.name}`,
          kind: entry.isDirectory() ? "directory" : "file",
          label: entry.name,
          evidencePath: path.join(cwd, entry.name),
        })),
      edges: [],
    };
  },
};
