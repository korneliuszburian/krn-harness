import type { GraphDetector } from "../graph-types.js";

export const cssClassDetector: GraphDetector = {
  name: "css-class",
  async detect() {
    return { nodes: [], edges: [] };
  },
};
