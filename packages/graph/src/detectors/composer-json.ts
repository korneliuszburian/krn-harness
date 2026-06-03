import type { GraphDetector } from "../graph-types.js";

export const composerJsonDetector: GraphDetector = {
  name: "composer-json",
  async detect() {
    return { nodes: [], edges: [] };
  },
};
