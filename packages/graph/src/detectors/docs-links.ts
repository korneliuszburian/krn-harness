import type { GraphDetector } from "../graph-types.js";

export const docsLinksDetector: GraphDetector = {
  name: "docs-links",
  async detect() {
    return { nodes: [], edges: [] };
  },
};
