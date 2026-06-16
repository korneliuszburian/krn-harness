import { describe, expect, it } from "vitest";
import type { GraphLite } from "../../graph/src/index.js";
import { approveMemory, createPendingMemory, type MemoryRecord } from "../../memory/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { buildContextPackage } from "./build-context-package.js";
import { renderContextPackageMarkdown } from "./render-md.js";

function approvedMemory(
  summary: string,
  evidencePath = "docs/specs/memory.schema.md",
): MemoryRecord {
  return approveMemory(
    createPendingMemory({
      summary,
      evidencePath,
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    new Date("2026-06-03T00:01:00.000Z"),
  );
}

describe("context package render and budget", () => {
  it("renders bucketed markdown for Codex-readable current state", () => {
    const contract = buildTaskContract("Stop when required context is missing");
    const markdown = renderContextPackageMarkdown(buildContextPackage(contract));

    expect(markdown).toContain("## Must Read");
    expect(markdown).toContain("## Missing Context");
    expect(markdown).toContain("STOP: true");
    expect(markdown).toContain("Coverage: 1/2 required present");
    expect(markdown).toContain("Items: 4 total, 4 shown, 0 hidden from markdown");
    expect(markdown).toContain("Summary: 1 total, showing 1/8, hidden 0");
    expect(markdown).toContain("docs/required-context.md");
    expect(markdown).toContain("source: task-policy, selector: missing-context-policy");
  });

  it("keeps JSON full while markdown applies deterministic item budgets", () => {
    const contract = buildTaskContract("Harden alpha docs");
    const graph = {
      nodes: Array.from({ length: 8 }, (_, index) => {
        const itemNumber = String(index + 1).padStart(2, "0");
        const evidencePath = `docs/alpha-reference-${itemNumber}.md`;

        return {
          id: `doc:${evidencePath}`,
          kind: "doc",
          label: `Alpha reference ${itemNumber}`,
          evidencePath,
          status: "available",
        };
      }),
      edges: [],
    } satisfies GraphLite;
    const pkg = buildContextPackage(contract, graph);
    const markdown = renderContextPackageMarkdown(pkg);

    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toContain(
      "docs/alpha-reference-08.md",
    );
    expect(pkg.bucketSummaries.referenceOnly).toMatchObject({
      totalItems: 9,
      shownInMarkdown: 6,
      hiddenFromMarkdown: 3,
      markdownBudget: 6,
      selectors: ["context-schema", "doc-match"],
    });
    expect(pkg.compactness).toMatchObject({
      totalItems: 11,
      markdownVisibleItems: 8,
      markdownHiddenItems: 3,
      markdownItemBudgets: {
        mustRead: 8,
        shouldRead: 8,
        referenceOnly: 6,
        doNotUse: 8,
        missingContext: 8,
      },
    });
    expect(pkg.overInclusion).toEqual({
      activeItems: 2,
      referenceOnlyItems: 9,
      totalItems: 11,
      score: 9,
      risk: "medium",
      reasons: ["reference-only-over-4"],
    });
    expect(pkg.coverage.overInclusionRisk).toBe("medium");
    expect(markdown).toContain(
      "Summary: 9 total, showing 6/6, hidden 3, selectors: context-schema, doc-match",
    );
    expect(markdown).toContain(
      "- +3 more item(s) hidden from markdown; see .krn/current/context-package.json",
    );
    expect(markdown).toContain("docs/alpha-reference-05.md");
    expect(markdown).not.toContain("docs/alpha-reference-08.md");
    expect(Math.max(...markdown.split("\n").map((line) => line.length))).toBeLessThanOrEqual(180);
  });

  it("renders approved memory provenance in markdown", () => {
    const contract = buildTaskContract("Harden graph selector behavior");
    const memory = approvedMemory(
      "Graph selector should remain generic",
      "docs/specs/graph-lite.md",
    );
    const markdown = renderContextPackageMarkdown(
      buildContextPackage(contract, undefined, {
        approvedMemory: [memory],
      }),
    );

    expect(markdown).toContain("## Reference Only");
    expect(markdown).toContain(`.krn/memory/approved.json#${memory.id}`);
    expect(markdown).toContain("source: memory, selector: approved-memory-task-match");
    expect(markdown).toContain(`memory: ${memory.id}`);
    expect(markdown).toContain("approved: 2026-06-03T00:01:00.000Z");
    expect(markdown).toContain("evidence: docs/specs/graph-lite.md");
  });

  it("records context budget and prunes low-priority graph context under a tight cap", () => {
    const contract = buildTaskContract("Harden alpha package with approved memory");
    const memory = approvedMemory(
      "Alpha package memory should survive budget pressure",
      "docs/specs/memory.schema.md",
    );
    const graph = {
      nodes: [
        {
          id: "package:packages/alpha",
          kind: "package",
          label: "alpha",
          evidencePath: "packages/alpha",
        },
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `source-file:packages/alpha/src/file-${index}.ts`,
          kind: "source-file" as const,
          label: `packages/alpha/src/file-${index}.ts`,
          evidencePath: `packages/alpha/src/file-${index}.ts`,
        })),
      ],
      edges: Array.from({ length: 5 }, (_, index) => ({
        from: "package:packages/alpha",
        to: `source-file:packages/alpha/src/file-${index}.ts`,
        kind: "owns-source" as const,
        evidencePath: `packages/alpha/src/file-${index}.ts`,
      })),
    } satisfies GraphLite;
    const pkg = buildContextPackage(contract, graph, {
      approvedMemory: [memory],
      maxTokens: 160,
    });
    const markdown = renderContextPackageMarkdown(pkg);

    expect(pkg.budget.status).toBe("pruned");
    expect(pkg.budget.maxTokens).toBe(160);
    expect(pkg.budget.prunedItems.length).toBeGreaterThan(0);
    expect(pkg.budget.prunedItems.every((item) => item.source === "graph")).toBe(true);
    expect(pkg.buckets.mustRead.map((item) => item.path)).toContain("AGENTS.md");
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toContain(
      `.krn/memory/approved.json#${memory.id}`,
    );
    expect(markdown).toContain("Budget: pruned");
  });
});
