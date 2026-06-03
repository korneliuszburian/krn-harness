import type { GraphDetector } from "../graph-types.js";

export const phpTemplatePartDetector: GraphDetector = {
  name: "php-template-part",
  async detect() {
    return { nodes: [], edges: [] };
  },
};
