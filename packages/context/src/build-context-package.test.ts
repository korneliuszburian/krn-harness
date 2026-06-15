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
    shouldRead?: string[];
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

  it("selects WordPress ACF hero context without promoting the whole fixture", async () => {
    const contract = buildTaskContract("Update hero field mapping in WordPress ACF theme");
    const graph = await buildGraph(repoRoot);
    const pkg = buildContextPackage(contract, graph);
    const mustRead = pkg.buckets.mustRead.map((item) => item.path);
    const shouldRead = pkg.buckets.shouldRead.map((item) => item.path);
    const doNotUse = pkg.buckets.doNotUse.map((item) => item.path);

    expect(pkg.stop).toBe(false);
    expect(mustRead).toEqual(
      expect.arrayContaining([
        "AGENTS.md",
        "fixtures/repos/wordpress-acf-theme/src/theme/template-parts/hero.php",
        "fixtures/repos/wordpress-acf-theme/src/theme/assets/hero.css",
        "fixtures/repos/wordpress-acf-theme/acf/group_hero.json",
      ]),
    );
    expect(shouldRead).toContain("fixtures/repos/wordpress-acf-theme/tests/theme.test.js");
    expect(doNotUse).toEqual(
      expect.arrayContaining([
        "fixtures/repos/wordpress-acf-theme/acf/legacy_group.json",
        "fixtures/repos/wordpress-acf-theme/docs/stale-acf-notes.md",
      ]),
    );
    expect(mustRead).not.toEqual(
      expect.arrayContaining([
        "fixtures/repos/wordpress-acf-theme/src/theme/functions.php",
        "fixtures/repos/wordpress-acf-theme/src/theme/template-parts/card-grid.php",
      ]),
    );
  });

  it("does not promote WordPress ACF fixture files from broad domain terms alone", async () => {
    const contract = buildTaskContract("Audit WordPress ACF theme context");
    const graph = await buildGraph(repoRoot);
    const pkg = buildContextPackage(contract, graph);
    const selectedPaths = [
      ...pkg.buckets.mustRead,
      ...pkg.buckets.shouldRead,
      ...pkg.buckets.referenceOnly,
    ].map((item) => item.path);

    expect(selectedPaths).not.toEqual(
      expect.arrayContaining([
        "fixtures/repos/wordpress-acf-theme/src/theme/template-parts/hero.php",
        "fixtures/repos/wordpress-acf-theme/src/theme/assets/hero.css",
        "fixtures/repos/wordpress-acf-theme/src/theme/functions.php",
      ]),
    );
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

  it("selects downstream package-owned source, test, docs, and config from graph-lite output", async () => {
    const fixture = readTaskFixture("downstream-basic-package-context");
    const contract = buildTaskContract(fixture.task);
    const graph = await buildGraph(repoRoot);
    const pkg = buildContextPackage(contract, graph);
    const markdown = renderContextPackageMarkdown(pkg);

    expect(pkg.stop).toBe(false);
    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(fixture.expected.mustRead);
    expect(pkg.buckets.shouldRead.map((item) => item.path)).toEqual([
      "docs/architecture/architecture-spec-v0.1.md",
      "fixtures/repos/downstream-basic/src/index.test.ts",
      "fixtures/repos/downstream-basic/krn.config.json",
      "fixtures/repos/downstream-basic/package.json",
    ]);
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual(
      expect.arrayContaining([
        "docs/specs/context-package.schema.md",
        "fixtures/repos/downstream-basic/README.md",
        "fixtures/repos/downstream-basic/docs/overview.md",
      ]),
    );
    expect(pkg.buckets.doNotUse.map((item) => item.path)).toEqual(fixture.expected.doNotUse);
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/downstream-basic/src/index.ts",
        source: "graph",
        selector: "package-owned-source",
        matchedTerms: ["downstream"],
        relationKind: "owns-source",
        sourceNode: "package:fixtures/repos/downstream-basic",
        targetNode: "source-file:fixtures/repos/downstream-basic/src/index.ts",
        operatorMessage: "Read source owned by the matched package.",
      }),
    );
    expect(pkg.buckets.shouldRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/downstream-basic/src/index.test.ts",
        selector: "tests-source-for-owned-source",
        relationKind: "tests-source",
        sourceNode: "test-file:fixtures/repos/downstream-basic/src/index.test.ts",
        targetNode: "source-file:fixtures/repos/downstream-basic/src/index.ts",
        operatorMessage: "Review the paired test for the selected source.",
      }),
    );
    expect(pkg.buckets.shouldRead).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/downstream-basic/krn.config.json",
        selector: "package-owned-config",
        relationKind: "owns-config",
        operatorMessage: "Check package config for commands and local settings.",
      }),
    );
    expect(pkg.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: "fixtures/repos/downstream-basic/docs/overview.md",
        selector: "package-owned-doc",
        operatorMessage: "Use package docs as reference; code remains source of truth.",
      }),
    );
    expect(markdown).toContain("Read source owned by the matched package.");
    expect(markdown).toContain("Review the paired test for the selected source.");
    expect(markdown).toContain("selector: tests-source-for-owned-source");
  });

  it("localizes product-code dogfood context to the expected source and paired test", async () => {
    const fixture = readTaskFixture("product-code-tax-dogfood");
    const contract = buildTaskContract(fixture.task);
    const graph = await buildGraph(repoRoot);
    const pkg = buildContextPackage(contract, graph);
    const activePaths = [...pkg.buckets.mustRead, ...pkg.buckets.shouldRead].map(
      (item) => item.path,
    );

    expect(pkg.stop).toBe(false);
    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(fixture.expected.mustRead);
    expect(pkg.buckets.shouldRead.map((item) => item.path)).toEqual(
      expect.arrayContaining(fixture.expected.shouldRead ?? []),
    );
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toContain(
      "fixtures/repos/product-code-dogfood/docs/current-tax.md",
    );
    expect(pkg.buckets.doNotUse.map((item) => item.path)).toContain(
      "fixtures/repos/product-code-dogfood/docs/stale-tax.md",
    );
    expect(activePaths).toContain("fixtures/repos/product-code-dogfood/src/regional-tax.ts");
    expect(activePaths).toContain("fixtures/repos/product-code-dogfood/src/regional-tax.test.ts");
    expect(activePaths).not.toContain("fixtures/repos/product-code-dogfood/src/index.ts");
    expect(activePaths).not.toContain("fixtures/repos/product-code-dogfood/src/index.test.ts");
    expect(activePaths).not.toContain("fixtures/repos/product-code-dogfood/docs/stale-tax.md");
  });

  it("does not leak source, test, or docs from neighboring packages", () => {
    const contract = buildTaskContract("Harden alpha package context");
    const graph = {
      nodes: [
        {
          id: "package:packages/alpha",
          kind: "package",
          label: "alpha",
          evidencePath: "packages/alpha",
        },
        {
          id: "source-file:packages/alpha/src/index.ts",
          kind: "source-file",
          label: "packages/alpha/src/index.ts",
          evidencePath: "packages/alpha/src/index.ts",
        },
        {
          id: "test-file:packages/alpha/src/index.test.ts",
          kind: "test-file",
          label: "packages/alpha/src/index.test.ts",
          evidencePath: "packages/alpha/src/index.test.ts",
        },
        {
          id: "doc:packages/alpha/docs/overview.md",
          kind: "doc",
          label: "packages/alpha/docs/overview.md",
          evidencePath: "packages/alpha/docs/overview.md",
          status: "available",
        },
        {
          id: "package:packages/beta",
          kind: "package",
          label: "beta",
          evidencePath: "packages/beta",
        },
        {
          id: "source-file:packages/beta/src/index.ts",
          kind: "source-file",
          label: "packages/beta/src/index.ts",
          evidencePath: "packages/beta/src/index.ts",
        },
        {
          id: "test-file:packages/beta/src/index.test.ts",
          kind: "test-file",
          label: "packages/beta/src/index.test.ts",
          evidencePath: "packages/beta/src/index.test.ts",
        },
        {
          id: "doc:packages/beta/docs/overview.md",
          kind: "doc",
          label: "packages/beta/docs/overview.md",
          evidencePath: "packages/beta/docs/overview.md",
          status: "available",
        },
      ],
      edges: [
        {
          from: "package:packages/alpha",
          to: "source-file:packages/alpha/src/index.ts",
          kind: "owns-source",
          evidencePath: "packages/alpha/src/index.ts",
        },
        {
          from: "package:packages/alpha",
          to: "test-file:packages/alpha/src/index.test.ts",
          kind: "owns-test",
          evidencePath: "packages/alpha/src/index.test.ts",
        },
        {
          from: "package:packages/alpha",
          to: "doc:packages/alpha/docs/overview.md",
          kind: "owns-doc",
          evidencePath: "packages/alpha/docs/overview.md",
        },
        {
          from: "package:packages/beta",
          to: "source-file:packages/beta/src/index.ts",
          kind: "owns-source",
          evidencePath: "packages/beta/src/index.ts",
        },
        {
          from: "package:packages/beta",
          to: "test-file:packages/beta/src/index.test.ts",
          kind: "owns-test",
          evidencePath: "packages/beta/src/index.test.ts",
        },
        {
          from: "package:packages/beta",
          to: "doc:packages/beta/docs/overview.md",
          kind: "owns-doc",
          evidencePath: "packages/beta/docs/overview.md",
        },
      ],
    } satisfies GraphLite;
    const pkg = buildContextPackage(contract, graph);
    const selectedPaths = pkg.items.map((contextItem) => contextItem.path);

    expect(selectedPaths).toEqual(
      expect.arrayContaining([
        "packages/alpha/src/index.ts",
        "packages/alpha/src/index.test.ts",
        "packages/alpha/docs/overview.md",
      ]),
    );
    expect(selectedPaths).not.toEqual(
      expect.arrayContaining([
        "packages/beta/src/index.ts",
        "packages/beta/src/index.test.ts",
        "packages/beta/docs/overview.md",
      ]),
    );
  });

  it("keeps STOP active even when package-owned graph context is available", () => {
    const contract = buildTaskContract(
      "Stop when required context is missing for downstream basic",
    );
    const graph = {
      nodes: [
        {
          id: "package:fixtures/repos/downstream-basic",
          kind: "package",
          label: "downstream-basic",
          evidencePath: "fixtures/repos/downstream-basic",
        },
        {
          id: "source-file:fixtures/repos/downstream-basic/src/index.ts",
          kind: "source-file",
          label: "fixtures/repos/downstream-basic/src/index.ts",
          evidencePath: "fixtures/repos/downstream-basic/src/index.ts",
        },
      ],
      edges: [
        {
          from: "package:fixtures/repos/downstream-basic",
          to: "source-file:fixtures/repos/downstream-basic/src/index.ts",
          kind: "owns-source",
          evidencePath: "fixtures/repos/downstream-basic/src/index.ts",
        },
      ],
    } satisfies GraphLite;
    const pkg = buildContextPackage(contract, graph);

    expect(pkg.stop).toBe(true);
    expect(pkg.stopReason).toBe("Required context is missing: docs/required-context.md");
    expect(pkg.buckets.mustRead.map((item) => item.path)).toContain(
      "fixtures/repos/downstream-basic/src/index.ts",
    );
    expect(pkg.buckets.missingContext.map((item) => item.path)).toEqual([
      "docs/required-context.md",
    ]);
  });

  it("does not promote fallback root package ownership from broad root wording", () => {
    const contract = buildTaskContract("Harden root package context");
    const graph = {
      nodes: [
        {
          id: "package:.",
          kind: "package",
          label: "root",
          evidencePath: ".",
        },
        {
          id: "source-file:src/index.ts",
          kind: "source-file",
          label: "src/index.ts",
          evidencePath: "src/index.ts",
        },
        {
          id: "test-file:src/index.test.ts",
          kind: "test-file",
          label: "src/index.test.ts",
          evidencePath: "src/index.test.ts",
        },
      ],
      edges: [
        {
          from: "package:.",
          to: "source-file:src/index.ts",
          kind: "owns-source",
          evidencePath: "src/index.ts",
        },
        {
          from: "package:.",
          to: "test-file:src/index.test.ts",
          kind: "owns-test",
          evidencePath: "src/index.test.ts",
        },
        {
          from: "test-file:src/index.test.ts",
          to: "source-file:src/index.ts",
          kind: "tests-source",
          evidencePath: "src/index.test.ts",
        },
      ],
    } satisfies GraphLite;
    const pkg = buildContextPackage(contract, graph);

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(["AGENTS.md"]);
    expect(pkg.buckets.shouldRead.map((item) => item.path)).toEqual([
      "docs/architecture/architecture-spec-v0.1.md",
    ]);
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

  it("adds task-contract required do-not-use paths without graph expansion", () => {
    const contract = buildTaskContract(
      "Update active hero ACF field mapping with paired static proof.",
      {
        metadata: {
          requiredDoNotUsePaths: [
            "acf/legacy_group.json",
            "docs/stale-acf-notes.md",
            "docs/do-not-use.md",
          ],
        },
      },
    );
    const pkg = buildContextPackage(contract);

    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(["AGENTS.md"]);
    expect(pkg.buckets.doNotUse).toEqual([
      expect.objectContaining({
        path: "acf/legacy_group.json",
        source: "task-contract",
        selector: "required-do-not-use-path",
      }),
      expect.objectContaining({
        path: "docs/do-not-use.md",
        source: "task-contract",
        selector: "required-do-not-use-path",
      }),
      expect.objectContaining({
        path: "docs/stale-acf-notes.md",
        source: "task-contract",
        selector: "required-do-not-use-path",
      }),
    ]);
  });

  it("reduces verify-profile-only graph doc noise while keeping required context and constraints", () => {
    const contract = buildTaskContract(
      [
        "Docs-only verify profile task for README.md.",
        "Use krn.config.json and prove python3 tools/check_all_readonly.py with krn verify --execute.",
        "Keep raw/ and wiki governance paths do-not-use.",
      ].join(" "),
      {
        metadata: {
          expectedTouchedFiles: ["README.md"],
          requiredDoNotUsePaths: [
            "raw/",
            "wiki/_approvals/",
            "wiki/_proposals/",
            "wiki/_transactions/",
          ],
        },
      },
    );
    const graph = {
      nodes: [
        {
          id: "doc:README.md",
          kind: "doc",
          label: "README.md",
          evidencePath: "README.md",
          status: "available",
        },
        {
          id: "doc:tools/README.md",
          kind: "doc",
          label: "Tools README",
          evidencePath: "tools/README.md",
          status: "available",
        },
        {
          id: "doc:docs/r2c-update-page-post-apply-validation-contract.md",
          kind: "doc",
          label: "Post apply validation contract",
          evidencePath: "docs/r2c-update-page-post-apply-validation-contract.md",
          status: "available",
        },
        {
          id: "doc:raw/README.md",
          kind: "doc",
          label: "Raw README",
          evidencePath: "raw/README.md",
          status: "available",
        },
        {
          id: "doc:wiki/_approvals/README.md",
          kind: "doc",
          label: "Approval README",
          evidencePath: "wiki/_approvals/README.md",
          status: "available",
        },
        {
          id: "doc:docs/stale-readme.md",
          kind: "doc",
          label: "Stale README",
          evidencePath: "docs/stale-readme.md",
          status: "deprecated",
        },
      ],
      edges: [],
    } satisfies GraphLite;

    const pkg = buildContextPackage(contract, graph);
    const activePaths = [...pkg.buckets.mustRead, ...pkg.buckets.shouldRead].map(
      (item) => item.path,
    );
    const referenceOnlyPaths = pkg.buckets.referenceOnly.map((item) => item.path);
    const doNotUsePaths = pkg.buckets.doNotUse.map((item) => item.path);

    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "AGENTS.md",
        source: "base",
      }),
    );
    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "README.md",
        source: "task-contract",
        selector: "expected-touched-file",
      }),
    );
    expect(pkg.buckets.shouldRead).toContainEqual(
      expect.objectContaining({
        path: "krn.config.json",
        source: "task-policy",
        selector: "explicit-task-path",
      }),
    );
    expect(pkg.buckets.shouldRead).toContainEqual(
      expect.objectContaining({
        path: "tools/check_all_readonly.py",
        source: "task-policy",
        selector: "explicit-task-path",
      }),
    );
    expect(referenceOnlyPaths).toEqual(["docs/specs/context-package.schema.md", "README.md"]);
    expect(referenceOnlyPaths).not.toEqual(
      expect.arrayContaining([
        "docs/r2c-update-page-post-apply-validation-contract.md",
        "raw/README.md",
        "tools/README.md",
        "wiki/_approvals/README.md",
      ]),
    );
    expect(activePaths).not.toContain("docs/stale-readme.md");
    expect(referenceOnlyPaths).not.toContain("docs/stale-readme.md");
    expect(doNotUsePaths).not.toContain("docs/stale-readme.md");
    expect(doNotUsePaths).toEqual(
      expect.arrayContaining([
        "raw/",
        "wiki/_approvals/",
        "wiki/_proposals/",
        "wiki/_transactions/",
      ]),
    );
    expect(pkg.overInclusion).toMatchObject({
      activeItems: 5,
      referenceOnlyItems: 2,
      risk: "low",
    });
    expect(pkg.stop).toBe(false);
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
});
