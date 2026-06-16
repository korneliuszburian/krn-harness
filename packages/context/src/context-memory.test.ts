import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  approveMemory,
  createPendingMemory,
  deprecateMemory,
  type MemoryRecord,
} from "../../memory/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { buildContextPackage } from "./build-context-package.js";

interface ContextTaskFixture {
  task: string;
  expected: {
    stop: boolean;
    referenceOnly?: string[];
  };
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readTaskFixture(name: string): ContextTaskFixture {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "fixtures", "tasks", `${name}.json`), "utf8"),
  ) as ContextTaskFixture;
}

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

describe("context package governed memory", () => {
  it("does not surface approved memory when it is neither requested nor task-relevant", () => {
    const contract = buildTaskContract("Update billing docs");
    const memory = approvedMemory(
      "Graph selector should remain generic",
      "docs/specs/graph-lite.md",
    );
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual([
      "docs/specs/context-package.schema.md",
    ]);
    expect(pkg.items.some((item) => item.source === "memory")).toBe(false);
  });

  it("does not surface approved memory for broad single-term matches", () => {
    const fixture = readTaskFixture("memory-broad-term-negative");
    const contract = buildTaskContract(fixture.task);
    const memory = approvedMemory(
      "Graph selector should remain generic",
      "docs/specs/graph-lite.md",
    );
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual(
      fixture.expected.referenceOnly,
    );
    expect(pkg.items.some((item) => item.source === "memory")).toBe(false);
  });

  it("honors explicit memory opt-out even when approved memory is task-relevant", () => {
    const fixture = readTaskFixture("memory-explicit-opt-out");
    const contract = buildTaskContract(fixture.task);
    const memory = approvedMemory(
      "Graph selector should remain generic",
      "docs/specs/graph-lite.md",
    );
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual(
      fixture.expected.referenceOnly,
    );
    expect(pkg.items.some((item) => item.source === "memory")).toBe(false);
  });

  it("honors Polish memory opt-out even when approved memory is task-relevant", () => {
    const fixture = readTaskFixture("memory-polish-opt-out");
    const contract = buildTaskContract(fixture.task);
    const memory = approvedMemory(
      "Graph selector should remain generic",
      "docs/specs/graph-lite.md",
    );
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual(
      fixture.expected.referenceOnly,
    );
    expect(pkg.items.some((item) => item.source === "memory")).toBe(false);
  });

  it("honors Polish prior-decision opt-out even when approved memory is task-relevant", () => {
    const fixture = readTaskFixture("memory-polish-prior-decisions-opt-out");
    const contract = buildTaskContract(fixture.task);
    const memory = approvedMemory(
      "Graph selector should remain generic",
      "docs/specs/graph-lite.md",
    );
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual(
      fixture.expected.referenceOnly,
    );
    expect(pkg.items.some((item) => item.source === "memory")).toBe(false);
  });

  it("surfaces task-relevant approved memory only as reference-only with provenance", () => {
    const contract = buildTaskContract("Harden graph selector behavior");
    const memory = approvedMemory(
      "Graph selector should remain generic",
      "docs/specs/graph-lite.md",
    );
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(["AGENTS.md"]);
    expect(pkg.buckets.shouldRead.map((item) => item.path)).not.toContain(
      `.krn/memory/approved.json#${memory.id}`,
    );
    expect(pkg.buckets.referenceOnly).toContainEqual({
      path: `.krn/memory/approved.json#${memory.id}`,
      reason: "Approved governed memory reference: Graph selector should remain generic",
      priority: 33,
      bucket: "reference-only",
      status: "available",
      source: "memory",
      selector: "approved-memory-task-match",
      matchedTerms: ["graph", "selector"],
      memoryId: memory.id,
      memorySummary: "Graph selector should remain generic",
      approvedAt: "2026-06-03T00:01:00.000Z",
      evidencePath: "docs/specs/graph-lite.md",
    });
  });

  it("surfaces approved memory on explicit memory request even without term overlap", () => {
    const contract = buildTaskContract("Use approved memory for this task");
    const memory = approvedMemory("Prefer short handoff summaries", "docs/specs/handoff.md");
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: `.krn/memory/approved.json#${memory.id}`,
        bucket: "reference-only",
        source: "memory",
        selector: "approved-memory-explicit",
        memoryId: memory.id,
        approvedAt: "2026-06-03T00:01:00.000Z",
        evidencePath: "docs/specs/handoff.md",
      }),
    );
  });

  it("surfaces approved memory on explicit Polish memory request", () => {
    const fixture = readTaskFixture("memory-polish-explicit-request");
    const contract = buildTaskContract(fixture.task);
    const memory = approvedMemory("Prefer short handoff summaries", "docs/specs/handoff.md");
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: `.krn/memory/approved.json#${memory.id}`,
        bucket: "reference-only",
        source: "memory",
        selector: "approved-memory-explicit",
        memoryId: memory.id,
        approvedAt: "2026-06-03T00:01:00.000Z",
        evidencePath: "docs/specs/handoff.md",
      }),
    );
  });

  it("lets Polish opt-out win over explicit Polish memory request", () => {
    const contract = buildTaskContract("Użyj zatwierdzonej pamięci, ale bez pamięci");
    const memory = approvedMemory("Prefer short handoff summaries", "docs/specs/handoff.md");
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [memory],
    });

    expect(pkg.items.some((item) => item.source === "memory")).toBe(false);
  });

  it("ignores pending and deprecated memory records even if passed to context builder", () => {
    const contract = buildTaskContract("Harden graph selector behavior");
    const pending = createPendingMemory({
      summary: "Graph selector pending poison",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const deprecated = deprecateMemory(approvedMemory("Graph selector deprecated poison"), {
      reason: "Superseded",
      now: new Date("2026-06-03T00:02:00.000Z"),
    });
    const pkg = buildContextPackage(contract, undefined, {
      approvedMemory: [pending, deprecated],
    });

    expect(pkg.items.some((item) => item.memoryId === pending.id)).toBe(false);
    expect(pkg.items.some((item) => item.memoryId === deprecated.id)).toBe(false);
  });
});
