import { readFile } from "node:fs/promises";
import path from "node:path";
import type { GraphDetector } from "../graph-types.js";

export const packageJsonDetector: GraphDetector = {
  name: "package-json",
  async detect(cwd) {
    const packagePath = path.join(cwd, "package.json");

    try {
      const pkg = JSON.parse(await readFile(packagePath, "utf8")) as { name?: string };
      return {
        nodes: [
          {
            id: "package:root",
            kind: "package-json",
            label: pkg.name ?? "package.json",
            evidencePath: packagePath,
          },
        ],
        edges: [],
      };
    } catch {
      return {
        nodes: [],
        edges: [],
      };
    }
  },
};
