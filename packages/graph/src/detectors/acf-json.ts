import type { GraphDetector } from "../graph-types.js";

export const acfJsonDetector: GraphDetector = {
  name: "acf-json",
  async detect() {
    return { nodes: [], edges: [] };
  },
};
