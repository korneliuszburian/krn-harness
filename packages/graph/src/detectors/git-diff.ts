import type { GraphDetector } from "../graph-types.js";

export const gitDiffDetector: GraphDetector = {
  name: "git-diff",
  async detect() {
    return { nodes: [], edges: [] };
  },
};
