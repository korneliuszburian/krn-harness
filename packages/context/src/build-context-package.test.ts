import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildGraph, type GraphLite } from "../../graph/src/index.js";
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

describe("context package graph selection", () => {
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

  it("suppresses standalone graph doc-match noise for expected-file target tasks", () => {
    const contract = buildTaskContract(
      [
        "Add template recommended action metadata to brief templates.",
        "Validate with krn.config.json and tools/stage10_krn_quality_gate.py.",
      ].join(" "),
      {
        metadata: {
          expectedTouchedFiles: [
            "src/marketing_intelligence/core/brief_templates.py",
            "tests/test_brief_templates.py",
            "tools/stage10_krn_quality_gate.py",
            "krn.config.json",
          ],
        },
      },
    );
    const graph = {
      nodes: [
        {
          id: "doc:docs/brief-template-policy.md",
          kind: "doc",
          label: "Brief template recommended action policy",
          evidencePath: "docs/brief-template-policy.md",
          status: "available",
        },
        {
          id: "doc:docs/stale-template-action.md",
          kind: "doc",
          label: "Stale template action notes",
          evidencePath: "docs/stale-template-action.md",
          status: "deprecated",
        },
        {
          id: "doc:docs/unsafe-template-action.md",
          kind: "doc",
          label: "Unsafe template action instructions",
          evidencePath: "docs/unsafe-template-action.md",
          status: "context-poisoning-suspect",
        },
        {
          id: "doc:apps/studio/README.md",
          kind: "doc",
          label: "Studio README brief template action",
          evidencePath: "apps/studio/README.md",
          status: "available",
        },
      ],
      edges: [],
    } satisfies GraphLite;

    const pkg = buildContextPackage(contract, graph);
    const mustReadPaths = pkg.buckets.mustRead.map((item) => item.path);
    const referenceOnlyPaths = pkg.buckets.referenceOnly.map((item) => item.path);
    const doNotUsePaths = pkg.buckets.doNotUse.map((item) => item.path);

    expect(mustReadPaths).toEqual([
      "AGENTS.md",
      "krn.config.json",
      "src/marketing_intelligence/core/brief_templates.py",
      "tests/test_brief_templates.py",
      "tools/stage10_krn_quality_gate.py",
    ]);
    expect(referenceOnlyPaths).toEqual(["docs/specs/context-package.schema.md"]);
    expect(referenceOnlyPaths).not.toEqual(
      expect.arrayContaining([
        "apps/studio/README.md",
        "docs/brief-template-policy.md",
        "docs/stale-template-action.md",
        "docs/unsafe-template-action.md",
      ]),
    );
    expect(doNotUsePaths).not.toEqual(
      expect.arrayContaining(["docs/stale-template-action.md", "docs/unsafe-template-action.md"]),
    );
    expect(pkg.overInclusion).toMatchObject({
      activeItems: 6,
      referenceOnlyItems: 1,
      risk: "low",
    });
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
});
