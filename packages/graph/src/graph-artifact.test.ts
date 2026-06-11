import { describe, expect, it } from "vitest";
import { buildGraphArtifact, renderGraphArtifactMarkdown } from "./graph-artifact.js";
import type { GraphLite } from "./graph-types.js";

describe("graph artifact", () => {
  it("builds a deterministic graph artifact summary", () => {
    const graph: GraphLite = {
      nodes: [
        {
          id: "doc:docs/old-plan.md",
          kind: "doc",
          label: "docs/old-plan.md",
          evidencePath: "docs/old-plan.md",
          status: "deprecated",
        },
        {
          id: "file:theme/section.php",
          kind: "file",
          label: "theme/section.php",
          evidencePath: "theme/section.php",
        },
      ],
      edges: [
        {
          from: "file:theme/section.php",
          to: "file:theme/section.css",
          kind: "style-related-to",
          evidencePath: "theme/section.php",
        },
      ],
    };

    const artifact = buildGraphArtifact(graph, {
      generatedAt: "2026-06-03T00:00:00.000Z",
      detectors: ["filesystem", "docs-links", "css-class"],
    });

    expect(artifact).toEqual({
      schemaVersion: 1,
      generatedAt: "2026-06-03T00:00:00.000Z",
      nodeCount: 2,
      edgeCount: 1,
      detectors: ["css-class", "docs-links", "filesystem"],
      relationKindCounts: {
        "style-related-to": 1,
      },
      nodeKindCounts: {
        doc: 1,
        file: 1,
      },
      statusCounts: {
        deprecated: 1,
        unspecified: 1,
      },
      nodes: [
        {
          id: "doc:docs/old-plan.md",
          kind: "doc",
          label: "docs/old-plan.md",
          evidencePath: "docs/old-plan.md",
          status: "deprecated",
        },
        {
          id: "file:theme/section.php",
          kind: "file",
          label: "theme/section.php",
          evidencePath: "theme/section.php",
        },
      ],
      edges: [
        {
          from: "file:theme/section.php",
          to: "file:theme/section.css",
          kind: "style-related-to",
          evidencePath: "theme/section.php",
        },
      ],
    });
  });

  it("renders markdown sections for graph summaries and limits", () => {
    const artifact = buildGraphArtifact(
      {
        nodes: [],
        edges: [],
      },
      {
        generatedAt: "2026-06-03T00:00:00.000Z",
        detectors: [],
      },
    );

    const markdown = renderGraphArtifactMarkdown(artifact);

    expect(markdown).toContain("# Graph-Lite Repository Graph");
    expect(markdown).toContain("## Summary");
    expect(markdown).toContain("## Detectors");
    expect(markdown).toContain("## Node Kind Counts");
    expect(markdown).toContain("## Relation Kind Counts");
    expect(markdown).toContain("## Selected Evidence Examples");
    expect(markdown).toContain("Graph-lite is shallow P0 evidence");
  });
});
