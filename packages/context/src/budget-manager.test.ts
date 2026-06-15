import { describe, expect, it } from "vitest";
import { applyContextBudget } from "./budget-manager.js";
import type { ContextItem } from "./schema.js";

function contextItem(input: Partial<ContextItem> & Pick<ContextItem, "path" | "bucket">) {
  return {
    reason: "Long deterministic context reason that makes the estimate non-trivial.",
    priority: 50,
    status: "available",
    ...input,
  } satisfies ContextItem;
}

describe("context budget manager", () => {
  it("keeps task/safety evidence ahead of graph evidence when pruning", () => {
    const result = applyContextBudget({
      maxTokens: 140,
      items: [
        contextItem({
          path: "AGENTS.md",
          bucket: "must-read",
          source: "base",
          priority: 100,
        }),
        contextItem({
          path: "src/expected.ts",
          bucket: "must-read",
          source: "task-contract",
          priority: 99,
        }),
        contextItem({
          path: ".krn/memory/approved.json#mem-1",
          bucket: "reference-only",
          source: "memory",
          priority: 34,
          memorySummary: "Approved memory should survive graph pruning.",
        }),
        contextItem({
          path: "docs/stale.md",
          bucket: "do-not-use",
          source: "task-contract",
          priority: 101,
          status: "deprecated",
        }),
        contextItem({
          path: "packages/example/src/index.ts",
          bucket: "must-read",
          source: "graph",
          selector: "package-owned-source",
          priority: 94,
        }),
        contextItem({
          path: "packages/example/docs/overview.md",
          bucket: "reference-only",
          source: "graph",
          selector: "package-owned-doc",
          priority: 35,
        }),
      ],
    });

    expect(result.budget.status).toBe("pruned");
    expect(result.budget.retentionPolicy).toBe(
      "task-contract-and-safety-before-memory-before-graph",
    );
    expect(result.items.map((item) => item.path)).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        "src/expected.ts",
        ".krn/memory/approved.json#mem-1",
        "docs/stale.md",
      ]),
    );
    expect(result.budget.prunedItems.map((item) => item.path)).toEqual(
      expect.arrayContaining([
        "packages/example/src/index.ts",
        "packages/example/docs/overview.md",
      ]),
    );
  });

  it("reports over-budget rather than pruning protected task and safety items", () => {
    const result = applyContextBudget({
      maxTokens: 46,
      items: [
        contextItem({
          path: "AGENTS.md",
          bucket: "must-read",
          source: "base",
          priority: 100,
        }),
        contextItem({
          path: "src/expected.ts",
          bucket: "must-read",
          source: "task-contract",
          priority: 99,
        }),
        contextItem({
          path: "docs/stale.md",
          bucket: "do-not-use",
          source: "task-contract",
          priority: 101,
          status: "deprecated",
        }),
        contextItem({
          path: "packages/example/src/index.ts",
          bucket: "must-read",
          source: "graph",
          selector: "package-owned-source",
          priority: 94,
        }),
      ],
    });

    expect(result.budget.status).toBe("over-budget");
    expect(result.budget.retainedTokens).toBeGreaterThan(result.budget.maxTokens);
    expect(result.items.map((item) => item.path)).toEqual([
      "AGENTS.md",
      "src/expected.ts",
      "docs/stale.md",
    ]);
    expect(result.budget.prunedItems.map((item) => item.path)).toEqual([
      "packages/example/src/index.ts",
    ]);
  });
});
