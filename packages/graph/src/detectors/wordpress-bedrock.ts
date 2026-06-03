import type { GraphDetector } from "../graph-types.js";

export const wordpressBedrockDetector: GraphDetector = {
  name: "wordpress-bedrock",
  async detect() {
    return { nodes: [], edges: [] };
  },
};
