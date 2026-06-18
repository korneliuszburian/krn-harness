import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { GraphLite } from "../../graph/src/index.js";
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

describe("context package stop and safety policy", () => {
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

  it("downgrades context-poisoning-suspect docs into do-not-use evidence", () => {
    const contract = buildTaskContract("Update alpha context poisoning docs");
    const graph = {
      nodes: [
        {
          id: "package:packages/alpha",
          kind: "package",
          label: "alpha",
          evidencePath: "packages/alpha",
        },
        {
          id: "doc:packages/alpha/docs/poison.md",
          kind: "doc",
          label: "packages/alpha/docs/poison.md",
          evidencePath: "packages/alpha/docs/poison.md",
          status: "context-poisoning-suspect",
        },
        {
          id: "doc:AGENTS.md",
          kind: "doc",
          label: "AGENTS.md",
          evidencePath: "AGENTS.md",
          status: "available",
        },
        {
          id: "doc:docs/adr/ADR-0023-context-poisoning-defense.md",
          kind: "doc",
          label: "docs/adr/ADR-0023-context-poisoning-defense.md",
          evidencePath: "docs/adr/ADR-0023-context-poisoning-defense.md",
          status: "available",
        },
      ],
      edges: [
        {
          from: "package:packages/alpha",
          to: "doc:packages/alpha/docs/poison.md",
          kind: "owns-doc",
          evidencePath: "packages/alpha/docs/poison.md",
        },
      ],
    } satisfies GraphLite;

    const pkg = buildContextPackage(contract, graph);
    const markdown = renderContextPackageMarkdown(pkg);

    expect(pkg.buckets.mustRead).toContainEqual(
      expect.objectContaining({
        path: "AGENTS.md",
        source: "base",
      }),
    );
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).not.toContain(
      "packages/alpha/docs/poison.md",
    );
    expect(pkg.buckets.doNotUse).toContainEqual(
      expect.objectContaining({
        path: "packages/alpha/docs/poison.md",
        status: "context-poisoning-suspect",
        source: "graph",
        selector: "package-owned-context-poisoning-suspect-doc",
        operatorMessage:
          "Do not use this document as active context; it contains instruction-like non-authority text.",
      }),
    );
    expect(pkg.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: "docs/adr/ADR-0023-context-poisoning-defense.md",
        status: "available",
        selector: "doc-match",
      }),
    );
    expect(markdown).toContain("context-poisoning-suspect");
    expect(markdown).toContain("Do not use this document as active context");
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
    expect(referenceOnlyPaths).toEqual(["docs/specs/context-package.schema.md"]);
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
      referenceOnlyItems: 1,
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
});
