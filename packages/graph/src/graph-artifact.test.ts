import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGraph } from "./build-graph.js";
import { buildGraphArtifact, renderGraphArtifactMarkdown } from "./graph-artifact.js";
import type { GraphLite } from "./graph-types.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function withoutGeneratedAt<T extends { generatedAt: string }>(
  artifact: T,
): Omit<T, "generatedAt"> {
  const { generatedAt: _generatedAt, ...rest } = artifact;

  return rest;
}

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
        unknown: 1,
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
    expect(markdown).toContain("## Node Kinds");
    expect(markdown).toContain("## Relation Kinds");
    expect(markdown).toContain("## Deprecated Docs");
    expect(markdown).toContain("## Evidence Examples");
    expect(markdown).toContain("Graph-lite is shallow P0 evidence");
  });

  it("keeps summary keys sorted alphabetically", () => {
    const artifact = buildGraphArtifact(
      {
        nodes: [
          {
            id: "file:z.php",
            kind: "file",
            label: "z.php",
            evidencePath: "z.php",
          },
          {
            id: "doc:a.md",
            kind: "doc",
            label: "a.md",
            evidencePath: "a.md",
            status: "available",
          },
        ],
        edges: [
          {
            from: "file:z.php",
            to: "doc:a.md",
            kind: "local-doc-link",
            evidencePath: "z.php",
          },
          {
            from: "file:z.php",
            to: "file:z.css",
            kind: "style-related-to",
            evidencePath: "z.php",
          },
        ],
      },
      {
        generatedAt: "2026-06-03T00:00:00.000Z",
        detectors: ["filesystem"],
      },
    );

    expect(Object.keys(artifact.nodeKindCounts)).toEqual(["doc", "file"]);
    expect(Object.keys(artifact.relationKindCounts)).toEqual([
      "local-doc-link",
      "style-related-to",
    ]);
    expect(Object.keys(artifact.statusCounts)).toEqual(["available", "unknown"]);
  });

  it("builds repeatable graph artifacts without absolute paths", async () => {
    const firstGraph = await buildGraph(repoRoot);
    const secondGraph = await buildGraph(repoRoot);
    const first = buildGraphArtifact(firstGraph, {
      generatedAt: "2026-06-03T00:00:00.000Z",
      detectors: ["filesystem"],
    });
    const second = buildGraphArtifact(secondGraph, {
      generatedAt: "2026-06-03T01:00:00.000Z",
      detectors: ["filesystem"],
    });

    expect(withoutGeneratedAt(first)).toEqual(withoutGeneratedAt(second));
    expect(first.nodes.some((node) => path.isAbsolute(node.evidencePath))).toBe(false);
    expect(first.edges.some((edge) => path.isAbsolute(edge.evidencePath))).toBe(false);
  });
});
