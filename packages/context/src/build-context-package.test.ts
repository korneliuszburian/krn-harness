import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGraph, type GraphLite } from "../../graph/src/index.js";
import {
  approveMemory,
  createPendingMemory,
  deprecateMemory,
  type MemoryRecord,
} from "../../memory/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { buildContextPackage } from "./build-context-package.js";
import { renderContextPackageMarkdown } from "./render-md.js";

interface ContextTaskFixture {
  task: string;
  expected: {
    stop: boolean;
    mustRead?: string[];
    referenceOnly?: string[];
    doNotUse?: string[];
    missingContext?: string[];
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

describe("context package", () => {
  it("ranks frontend-section fixture context into must-read and reference buckets", () => {
    const fixture = readTaskFixture("frontend-section-context");
    const contract = buildTaskContract(fixture.task);
    const graph = {
      nodes: [
        {
          id: "file:fixtures/repos/frontend-section-context/theme/assets/section.css",
          kind: "stylesheet",
          label: "fixtures/repos/frontend-section-context/theme/assets/section.css",
          evidencePath: "fixtures/repos/frontend-section-context/theme/assets/section.css",
        },
        {
          id: "acf-group:group_fixture_section",
          kind: "acf-group",
          label: "Fixture Section",
          evidencePath: "fixtures/repos/frontend-section-context/acf-json/section.json",
        },
        {
          id: "doc:fixtures/repos/frontend-section-context/README.md",
          kind: "doc",
          label: "fixtures/repos/frontend-section-context/README.md",
          evidencePath: "fixtures/repos/frontend-section-context/README.md",
          status: "available",
        },
      ],
      edges: [
        {
          from: "file:fixtures/repos/frontend-section-context/theme/templates/section.php",
          to: "file:fixtures/repos/frontend-section-context/theme/assets/section.css",
          kind: "style-related-to",
          evidencePath: "fixtures/repos/frontend-section-context/theme/templates/section.php",
        },
      ],
    } satisfies GraphLite;
    const pkg = buildContextPackage(contract, graph);

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.taskId).toBe("task-9eddfd5aa2d1");
    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(fixture.expected.mustRead);
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "AGENTS.md",
        source: "base",
      }),
    );
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/frontend-section-context/theme/templates/section.php",
        source: "graph",
        selector: "style-related-to",
        matchedTerms: ["frontend"],
        relationKind: "style-related-to",
        sourceNode: "file:fixtures/repos/frontend-section-context/theme/templates/section.php",
        targetNode: "file:fixtures/repos/frontend-section-context/theme/assets/section.css",
      }),
    );
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/frontend-section-context/theme/assets/section.css",
        source: "graph",
        selector: "style-related-to-target",
        matchedTerms: ["frontend"],
      }),
    );
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/frontend-section-context/acf-json/section.json",
        source: "graph",
        selector: "acf-group",
        matchedTerms: ["frontend"],
        sourceNode: "acf-group:group_fixture_section",
      }),
    );
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual(
      expect.arrayContaining(fixture.expected.referenceOnly ?? []),
    );
    expect(pkg.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/frontend-section-context/README.md",
        source: "graph",
        selector: "doc-match",
        matchedTerms: ["frontend"],
      }),
    );
    expect(pkg.coverage).toEqual({
      required: 4,
      present: 4,
      missing: 0,
      confidence: "high",
      overInclusionRisk: "low",
    });
  });

  it("selects graph-related context from generic non-fixture relation paths", () => {
    const contract = buildTaskContract("Update hero section layout");
    const graph = {
      nodes: [
        {
          id: "file:apps/site/theme/assets/hero-section.css",
          kind: "stylesheet",
          label: "apps/site/theme/assets/hero-section.css",
          evidencePath: "apps/site/theme/assets/hero-section.css",
        },
        {
          id: "acf-group:group_hero_section",
          kind: "acf-group",
          label: "Hero Section",
          evidencePath: "apps/site/acf-json/hero-section.json",
        },
        {
          id: "doc:apps/site/README.md",
          kind: "doc",
          label: "Hero Section README",
          evidencePath: "apps/site/README.md",
          status: "available",
        },
      ],
      edges: [
        {
          from: "file:apps/site/theme/templates/hero-section.php",
          to: "file:apps/site/theme/assets/hero-section.css",
          kind: "style-related-to",
          evidencePath: "apps/site/theme/templates/hero-section.php",
        },
      ],
    } satisfies GraphLite;

    const pkg = buildContextPackage(contract, graph);

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual([
      "AGENTS.md",
      "apps/site/theme/templates/hero-section.php",
      "apps/site/theme/assets/hero-section.css",
      "apps/site/acf-json/hero-section.json",
    ]);
    expect(pkg.buckets.mustRead.map((item) => item.reason)).toEqual([
      "Repo-level operating contract",
      "Graph-lite style relation matched task terms",
      "Graph-lite related stylesheet matched task terms",
      "Graph-lite ACF contract matched task terms",
    ]);
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual([
      "docs/specs/context-package.schema.md",
      "apps/site/README.md",
    ]);
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "apps/site/theme/templates/hero-section.php",
        source: "graph",
        selector: "style-related-to",
        matchedTerms: ["hero"],
      }),
    );
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "apps/site/theme/assets/hero-section.css",
        source: "graph",
        selector: "style-related-to-target",
        matchedTerms: ["hero"],
      }),
    );
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "apps/site/acf-json/hero-section.json",
        source: "graph",
        selector: "acf-group",
        matchedTerms: ["hero"],
      }),
    );
  });

  it("does not over-include unrelated section files for docs tasks", () => {
    const contract = buildTaskContract("Update billing section docs");
    const graph = {
      nodes: [
        {
          id: "file:apps/site/theme/assets/hero-section.css",
          kind: "stylesheet",
          label: "apps/site/theme/assets/hero-section.css",
          evidencePath: "apps/site/theme/assets/hero-section.css",
        },
        {
          id: "acf-group:group_hero_section",
          kind: "acf-group",
          label: "Hero Section",
          evidencePath: "apps/site/acf-json/hero-section.json",
        },
        {
          id: "doc:docs/billing.md",
          kind: "doc",
          label: "Billing docs",
          evidencePath: "docs/billing.md",
          status: "available",
        },
      ],
      edges: [
        {
          from: "file:apps/site/theme/templates/hero-section.php",
          to: "file:apps/site/theme/assets/hero-section.css",
          kind: "style-related-to",
          evidencePath: "apps/site/theme/templates/hero-section.php",
        },
      ],
    } satisfies GraphLite;

    const pkg = buildContextPackage(contract, graph);

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(["AGENTS.md"]);
    expect(pkg.buckets.mustRead.map((item) => item.path)).not.toEqual(
      expect.arrayContaining([
        "apps/site/theme/templates/hero-section.php",
        "apps/site/theme/assets/hero-section.css",
        "apps/site/acf-json/hero-section.json",
      ]),
    );
    expect(pkg.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: "docs/billing.md",
        source: "graph",
        selector: "doc-match",
        matchedTerms: ["billing"],
      }),
    );
  });

  it("does not select frontend section files for support docs tasks", () => {
    const contract = buildTaskContract("Update support docs");
    const graph = {
      nodes: [
        {
          id: "file:fixtures/repos/frontend-section-context/theme/assets/section.css",
          kind: "stylesheet",
          label: "fixtures/repos/frontend-section-context/theme/assets/section.css",
          evidencePath: "fixtures/repos/frontend-section-context/theme/assets/section.css",
        },
        {
          id: "acf-group:group_fixture_section",
          kind: "acf-group",
          label: "Fixture Section",
          evidencePath: "fixtures/repos/frontend-section-context/acf-json/section.json",
        },
        {
          id: "doc:docs/support.md",
          kind: "doc",
          label: "Support docs",
          evidencePath: "docs/support.md",
          status: "available",
        },
      ],
      edges: [
        {
          from: "file:fixtures/repos/frontend-section-context/theme/templates/section.php",
          to: "file:fixtures/repos/frontend-section-context/theme/assets/section.css",
          kind: "style-related-to",
          evidencePath: "fixtures/repos/frontend-section-context/theme/templates/section.php",
        },
      ],
    } satisfies GraphLite;

    const pkg = buildContextPackage(contract, graph);

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(["AGENTS.md"]);
    expect(pkg.buckets.mustRead.map((item) => item.path)).not.toEqual(
      expect.arrayContaining([
        "fixtures/repos/frontend-section-context/theme/templates/section.php",
        "fixtures/repos/frontend-section-context/theme/assets/section.css",
        "fixtures/repos/frontend-section-context/acf-json/section.json",
      ]),
    );
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual([
      "docs/specs/context-package.schema.md",
      "docs/support.md",
    ]);
  });

  it("does not select active frontend files for stale-doc tasks", () => {
    const fixture = readTaskFixture("stale-doc-trap");
    const contract = buildTaskContract(fixture.task);
    const staleDoc = fixture.expected.doNotUse?.[0] ?? "";
    const graph = {
      nodes: [
        {
          id: "file:fixtures/repos/frontend-section-context/theme/assets/section.css",
          kind: "stylesheet",
          label: "fixtures/repos/frontend-section-context/theme/assets/section.css",
          evidencePath: "fixtures/repos/frontend-section-context/theme/assets/section.css",
        },
        {
          id: `doc:${staleDoc}`,
          kind: "doc",
          label: staleDoc,
          evidencePath: staleDoc,
          status: "deprecated",
        },
      ],
      edges: [
        {
          from: "file:fixtures/repos/frontend-section-context/theme/templates/section.php",
          to: "file:fixtures/repos/frontend-section-context/theme/assets/section.css",
          kind: "style-related-to",
          evidencePath: "fixtures/repos/frontend-section-context/theme/templates/section.php",
        },
      ],
    } satisfies GraphLite;

    const pkg = buildContextPackage(contract, graph);

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(["AGENTS.md"]);
    expect(pkg.buckets.doNotUse.map((item) => item.path)).toEqual([staleDoc]);
  });

  it("does not inject frontend fixture files when graph evidence is absent", () => {
    const fixture = readTaskFixture("frontend-section-context");
    const contract = buildTaskContract(fixture.task);
    const pkg = buildContextPackage(contract);

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(["AGENTS.md"]);
    expect(pkg.buckets.mustRead.map((item) => item.path)).not.toContain(
      "fixtures/repos/frontend-section-context/theme/templates/section.php",
    );
  });

  it("can rank frontend fixture context from graph-lite output", async () => {
    const fixture = readTaskFixture("frontend-section-context");
    const contract = buildTaskContract(fixture.task);
    const graph = await buildGraph(repoRoot);
    const pkg = buildContextPackage(contract, graph);

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(fixture.expected.mustRead);
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/frontend-section-context/theme/templates/section.php",
        reason: "Graph-lite style relation matched task terms",
        source: "graph",
        selector: "style-related-to",
      }),
    );
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/frontend-section-context/theme/assets/section.css",
        reason: "Graph-lite related stylesheet matched task terms",
        source: "graph",
        selector: "style-related-to-target",
      }),
    );
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/frontend-section-context/acf-json/section.json",
        reason: "Graph-lite ACF contract matched task terms",
        source: "graph",
        selector: "acf-group",
      }),
    );
  });

  it("keeps deprecated stale docs out of must-read context", () => {
    const fixture = readTaskFixture("stale-doc-trap");
    const contract = buildTaskContract(fixture.task);
    const staleDoc = fixture.expected.doNotUse?.[0] ?? "";
    const graph = {
      nodes: [
        {
          id: `doc:${staleDoc}`,
          kind: "doc",
          label: staleDoc,
          evidencePath: staleDoc,
          status: "deprecated",
        },
      ],
      edges: [],
    } satisfies GraphLite;
    const pkg = buildContextPackage(contract, graph);

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.buckets.mustRead.map((item) => item.path)).not.toContain(staleDoc);
    expect(pkg.buckets.doNotUse).toEqual([
      {
        path: staleDoc,
        reason: "Graph-lite marked this document deprecated",
        priority: 100,
        bucket: "do-not-use",
        status: "deprecated",
        source: "graph",
        selector: "deprecated-doc-status",
        matchedTerms: ["stale"],
        sourceNode: `doc:${staleDoc}`,
      },
    ]);
  });

  it("sets STOP when required context is missing", () => {
    const fixture = readTaskFixture("missing-context-stop");
    const contract = buildTaskContract(fixture.task);
    const pkg = buildContextPackage(contract);
    const missingPath = fixture.expected.missingContext?.[0] ?? "";

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.stopReason).toBe(`Required context is missing: ${missingPath}`);
    expect(pkg.buckets.missingContext).toEqual([
      {
        path: missingPath,
        reason: "Required context is absent",
        priority: 100,
        bucket: "missing-context",
        status: "missing",
        source: "task-policy",
        selector: "missing-context-policy",
      },
    ]);
    expect(pkg.coverage.confidence).toBe("low");
  });

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

  it("renders bucketed markdown for Codex-readable current state", () => {
    const contract = buildTaskContract("Stop when required context is missing");
    const markdown = renderContextPackageMarkdown(buildContextPackage(contract));

    expect(markdown).toContain("## Must Read");
    expect(markdown).toContain("## Missing Context");
    expect(markdown).toContain("STOP: true");
    expect(markdown).toContain("Coverage: 1/2 required present");
    expect(markdown).toContain("docs/required-context.md");
    expect(markdown).toContain("source: task-policy, selector: missing-context-policy");
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
});
