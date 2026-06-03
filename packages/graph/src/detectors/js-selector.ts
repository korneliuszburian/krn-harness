import type { GraphDetector } from "../graph-types.js";

export const jsSelectorDetector: GraphDetector = {
  name: "js-selector",
  async detect() {
    return { nodes: [], edges: [] };
  },
};
