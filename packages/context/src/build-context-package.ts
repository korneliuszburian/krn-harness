import type { GraphLite } from "../../graph/src/index.js";
import type { MemoryRecord } from "../../memory/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";
import {
  explicitlyRequestsMemory,
  hasExplicitMemoryOptOut,
  isTaskRelevantMemoryMatch,
} from "./memory-gate.js";
import { rankContext } from "./rank-context.js";
import type {
  ContextBucket,
  ContextBucketSummaries,
  ContextBuckets,
  ContextCompactness,
  ContextCoverage,
  ContextItem,
  ContextMarkdownItemBudgets,
  ContextOverInclusionMetrics,
  ContextPackage,
} from "./schema.js";
import { shouldStop } from "./stop-policy.js";

export interface BuildContextPackageOptions {
  approvedMemory?: MemoryRecord[] | undefined;
}

interface ContextSelectionHints {
  explicitTaskPaths: Set<string>;
  expectedTouchedPaths: Set<string>;
  doNotUsePaths: string[];
  verifyProfileFocused: boolean;
}

const bucketNames = [
  "mustRead",
  "shouldRead",
  "referenceOnly",
  "doNotUse",
  "missingContext",
] as const;

const bucketValueByName: Record<(typeof bucketNames)[number], ContextBucket> = {
  mustRead: "must-read",
  shouldRead: "should-read",
  referenceOnly: "reference-only",
  doNotUse: "do-not-use",
  missingContext: "missing-context",
};

const markdownItemBudgets: ContextMarkdownItemBudgets = {
  mustRead: 8,
  shouldRead: 8,
  referenceOnly: 6,
  doNotUse: 8,
  missingContext: 8,
};

const taskStopWords = new Set([
  "active",
  "avoid",
  "approved",
  "basic",
  "context",
  "docs",
  "implement",
  "memories",
  "memory",
  "missing",
  "only",
  "package",
  "relevant",
  "required",
  "root",
  "section",
  "stop",
  "task",
  "theme",
  "treating",
  "truth",
  "update",
  "using",
  "when",
  "with",
  "work",
  "fixture",
  "fixtures",
  "wordpress",
  "acf",
]);

const broadVerifyProfileDocTerms = new Set([
  "approval",
  "path",
  "prove",
  "read",
  "readme",
  "readonly",
  "repo",
  "source",
  "tools",
  "validation",
  "governance",
  "wiki",
]);

function item(
  bucket: ContextBucket,
  path: string,
  reason: string,
  priority: number,
  status: ContextItem["status"] = "available",
  explainability: Pick<
    ContextItem,
    | "source"
    | "selector"
    | "matchedTerms"
    | "relationKind"
    | "sourceNode"
    | "targetNode"
    | "operatorMessage"
    | "memoryId"
    | "memorySummary"
    | "approvedAt"
    | "evidencePath"
  > = {},
): ContextItem {
  return {
    path,
    reason,
    priority,
    bucket,
    status,
    ...explainability,
  };
}

function baseItems(): ContextItem[] {
  return [
    item("must-read", "AGENTS.md", "Repo-level operating contract", 100, "available", {
      source: "base",
      selector: "repo-agents",
    }),
    item(
      "should-read",
      "docs/architecture/architecture-spec-v0.1.md",
      "P0 architecture canon when present",
      80,
      "available",
      {
        source: "base",
        selector: "architecture-canon",
      },
    ),
    item(
      "reference-only",
      "docs/specs/context-package.schema.md",
      "Context package schema reference",
      40,
      "available",
      {
        source: "base",
        selector: "context-schema",
      },
    ),
  ];
}

function taskTermsFor(task: string): string[] {
  return [
    ...new Set(
      task
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((term) => term.length >= 4 && !taskStopWords.has(term)),
    ),
  ].sort((left, right) => left.localeCompare(right));
}

function matchedTermsForText(text: string, terms: string[]): string[] {
  const normalized = text.toLowerCase();
  return terms.filter((term) => normalized.includes(term));
}

function normalizeContextPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

function explicitRepoPathsForTask(task: string): string[] {
  const paths = new Set<string>();
  const pathPattern =
    /(?:^|[\s`"'(])((?:[A-Za-z0-9._-]+\/)+[A-Za-z0-9._-]+\.(?:cjs|js|json|md|mjs|py|toml|ts|tsx|yaml|yml)|[A-Za-z0-9._-]+\.(?:cjs|js|json|md|mjs|py|toml|ts|tsx|yaml|yml))(?:$|[\s`"',.;:)])/g;

  for (const match of task.matchAll(pathPattern)) {
    const rawPath = match[1];
    if (!rawPath) {
      continue;
    }

    const normalized = normalizeContextPath(rawPath);
    if (normalized.length > 0 && !normalized.startsWith("-")) {
      paths.add(normalized);
    }
  }

  return [...paths].sort((left, right) => left.localeCompare(right));
}

function isPathWithin(pathValue: string, parentPath: string): boolean {
  const pathName = normalizeContextPath(pathValue);
  const parent = normalizeContextPath(parentPath);

  return pathName === parent || pathName.startsWith(`${parent}/`);
}

function isVerifyProfileFocusedTask(task: string): boolean {
  const normalized = task.toLowerCase();

  return (
    normalized.includes("verify") &&
    (normalized.includes("verify --execute") ||
      normalized.includes("verify profile") ||
      normalized.includes("readonly profile") ||
      normalized.includes("check_all_readonly"))
  );
}

function selectionHintsFor(contract: TaskContract | undefined): ContextSelectionHints {
  const task = contract?.task ?? "";
  const expectedTouchedPaths = new Set(
    (contract?.metadata?.expectedTouchedFiles ?? []).map(normalizeContextPath),
  );
  const doNotUsePaths = (contract?.metadata?.requiredDoNotUsePaths ?? []).map(normalizeContextPath);
  const explicitTaskPaths = new Set(
    explicitRepoPathsForTask(task).filter(
      (explicitPath) =>
        !doNotUsePaths.some((doNotUsePath) => isPathWithin(explicitPath, doNotUsePath)),
    ),
  );

  return {
    explicitTaskPaths,
    expectedTouchedPaths,
    doNotUsePaths,
    verifyProfileFocused: isVerifyProfileFocusedTask(task),
  };
}

function graphNodeText(node: { label: string; evidencePath: string } | undefined): string {
  return node ? `${node.label} ${node.evidencePath}` : "";
}

function graphRelationText(
  edge: { evidencePath: string },
  from?: { label: string; evidencePath: string },
  to?: { label: string; evidencePath: string },
): string {
  return `${edge.evidencePath} ${graphNodeText(from)} ${graphNodeText(to)}`;
}

function packageIdForContextPath(contextPath: string): string | undefined {
  const parts = contextPath.split("/");

  if (parts[0] === "packages" && parts[1]) {
    return `package:${parts[0]}/${parts[1]}`;
  }

  if (parts[0] === "fixtures" && parts[1] === "repos" && parts[2]) {
    return `package:${parts[0]}/${parts[1]}/${parts[2]}`;
  }

  if (
    parts[0] === "src" ||
    parts[0] === "docs" ||
    parts[0] === "test" ||
    parts[0] === "tests" ||
    parts[0] === "__tests__" ||
    contextPath === "README.md" ||
    contextPath === "package.json" ||
    contextPath === "krn.config.json" ||
    contextPath === "composer.json"
  ) {
    return "package:.";
  }

  return undefined;
}

function isOutsideSelectedPackage(
  contextPath: string,
  selectedPackageTerms: Map<string, string[]>,
): boolean {
  const packageId = packageIdForContextPath(contextPath);

  return Boolean(
    packageId && selectedPackageTerms.size > 0 && !selectedPackageTerms.has(packageId),
  );
}

function taskPolicyItems(task: string): ContextItem[] {
  const normalized = task.toLowerCase();

  if (normalized.includes("missing context") || normalized.includes("context is missing")) {
    return [
      item(
        "missing-context",
        "docs/required-context.md",
        "Required context is absent",
        100,
        "missing",
        {
          source: "task-policy",
          selector: "missing-context-policy",
        },
      ),
    ];
  }

  return [];
}

function taskContractMetadataItems(contract?: TaskContract): ContextItem[] {
  const items: ContextItem[] =
    contract?.metadata?.expectedTouchedFiles?.map((path) =>
      item(
        "must-read",
        normalizeContextPath(path),
        "Task contract expects this file may be touched",
        99,
        "available",
        {
          source: "task-contract",
          selector: "expected-touched-file",
        },
      ),
    ) ?? [];

  items.push(
    ...(contract?.metadata?.requiredDoNotUsePaths?.map((path) =>
      item("do-not-use", path, "Task contract marks this path do-not-use", 101, "deprecated", {
        source: "task-contract",
        selector: "required-do-not-use-path",
        operatorMessage: "Do not use this path as active context; it is forbidden by the task.",
      }),
    ) ?? []),
  );

  return items;
}

function explicitTaskPathItems(hints: ContextSelectionHints): ContextItem[] {
  return [...hints.explicitTaskPaths]
    .filter((path) => !hints.expectedTouchedPaths.has(path))
    .map((path) =>
      item("should-read", path, "Task text explicitly references this repo path", 78, "available", {
        source: "task-policy",
        selector: "explicit-task-path",
      }),
    );
}

function shouldSuppressVerifyProfileDocMatch(
  evidencePath: string,
  matchedTerms: string[],
  hints: ContextSelectionHints,
): boolean {
  if (!hints.verifyProfileFocused) {
    return false;
  }

  const normalizedPath = normalizeContextPath(evidencePath);
  if (
    hints.expectedTouchedPaths.has(normalizedPath) ||
    hints.explicitTaskPaths.has(normalizedPath)
  ) {
    return false;
  }

  if (hints.doNotUsePaths.some((doNotUsePath) => isPathWithin(normalizedPath, doNotUsePath))) {
    return true;
  }

  return matchedTerms.every((term) => broadVerifyProfileDocTerms.has(term));
}

function graphItemsForTask(
  task: string,
  graph: GraphLite | undefined,
  hints: ContextSelectionHints,
): ContextItem[] {
  if (!graph) {
    return [];
  }

  const taskTerms = taskTermsFor(task);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const items: ContextItem[] = [];
  const matchedPackageTerms = new Map<string, string[]>();
  const matchedPackageSourceTerms = new Map<string, string[]>();
  const selectedSourcePackageTerms = new Map<string, string[]>();

  for (const node of graph.nodes) {
    if (node.kind !== "package") {
      continue;
    }

    const matchedTerms = matchedTermsForText(graphNodeText(node), taskTerms);
    if (matchedTerms.length > 0) {
      matchedPackageTerms.set(node.id, matchedTerms);
    }
  }

  for (const edge of graph.edges) {
    if (edge.kind !== "style-related-to") {
      continue;
    }

    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const relationText = `${edge.evidencePath} ${graphNodeText(from)}`;

    const matchedTerms = matchedTermsForText(relationText, taskTerms);
    if (matchedTerms.length === 0) {
      continue;
    }

    items.push(
      item(
        "must-read",
        edge.evidencePath,
        "Graph-lite style relation matched task terms",
        98,
        "available",
        {
          source: "graph",
          selector: "style-related-to",
          matchedTerms,
          relationKind: edge.kind,
          sourceNode: edge.from,
          targetNode: edge.to,
        },
      ),
    );
    selectedSourcePackageTerms.set(
      packageIdForContextPath(edge.evidencePath) ?? edge.from,
      matchedTerms,
    );

    if (to?.evidencePath) {
      items.push(
        item(
          "must-read",
          to.evidencePath,
          "Graph-lite related stylesheet matched task terms",
          97,
          "available",
          {
            source: "graph",
            selector: "style-related-to-target",
            matchedTerms,
            relationKind: edge.kind,
            sourceNode: edge.from,
            targetNode: edge.to,
          },
        ),
      );
      selectedSourcePackageTerms.set(
        packageIdForContextPath(to.evidencePath) ?? edge.to,
        matchedTerms,
      );
    }
  }

  for (const edge of graph.edges) {
    if (!["owns-source", "owns-test", "owns-doc", "owns-config"].includes(edge.kind)) {
      continue;
    }

    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const packageMatchedTerms = matchedPackageTerms.get(edge.from) ?? [];

    if (packageMatchedTerms.length === 0) {
      continue;
    }

    const relationMatchedTerms = matchedTermsForText(graphRelationText(edge, from, to), taskTerms);
    const matchedTerms = [...new Set([...packageMatchedTerms, ...relationMatchedTerms])].sort(
      (left, right) => left.localeCompare(right),
    );

    if (matchedTerms.length === 0 || !to?.evidencePath) {
      continue;
    }

    if (edge.kind === "owns-source") {
      matchedPackageSourceTerms.set(edge.to, matchedTerms);
      selectedSourcePackageTerms.set(edge.from, matchedTerms);
      items.push(
        item(
          "must-read",
          to.evidencePath,
          "Package-owned source selected by graph-lite",
          94,
          "available",
          {
            source: "graph",
            selector: "package-owned-source",
            matchedTerms,
            relationKind: edge.kind,
            sourceNode: edge.from,
            targetNode: edge.to,
            operatorMessage: "Read source owned by the matched package.",
          },
        ),
      );
    }

    if (edge.kind === "owns-test") {
      items.push(
        item(
          "should-read",
          to.evidencePath,
          "Package-owned test selected by graph-lite",
          74,
          "available",
          {
            source: "graph",
            selector: "package-owned-test",
            matchedTerms,
            relationKind: edge.kind,
            sourceNode: edge.from,
            targetNode: edge.to,
            operatorMessage: "Use package test as supporting evidence.",
          },
        ),
      );
    }

    if (edge.kind === "owns-config") {
      items.push(
        item(
          "should-read",
          to.evidencePath,
          "Package-owned config selected by graph-lite",
          72,
          "available",
          {
            source: "graph",
            selector: "package-owned-config",
            matchedTerms,
            relationKind: edge.kind,
            sourceNode: edge.from,
            targetNode: edge.to,
            operatorMessage: "Check package config for commands and local settings.",
          },
        ),
      );
    }

    if (edge.kind === "owns-doc" && to.status === "deprecated") {
      items.push(
        item("do-not-use", to.evidencePath, "Package-owned doc is deprecated", 99, "deprecated", {
          source: "graph",
          selector: "package-owned-deprecated-doc",
          matchedTerms,
          relationKind: edge.kind,
          sourceNode: edge.from,
          targetNode: edge.to,
          operatorMessage: "Do not use this package doc as active truth.",
        }),
      );
    } else if (edge.kind === "owns-doc") {
      items.push(
        item(
          "reference-only",
          to.evidencePath,
          "Package-owned doc selected by graph-lite",
          35,
          "available",
          {
            source: "graph",
            selector: "package-owned-doc",
            matchedTerms,
            relationKind: edge.kind,
            sourceNode: edge.from,
            targetNode: edge.to,
            operatorMessage: "Use package docs as reference; code remains source of truth.",
          },
        ),
      );
    }
  }

  for (const edge of graph.edges) {
    if (edge.kind !== "owns-test") {
      continue;
    }

    const sourceMatchedTerms = selectedSourcePackageTerms.get(edge.from);
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);

    if (!sourceMatchedTerms || !to?.evidencePath) {
      continue;
    }

    const relationMatchedTerms = matchedTermsForText(graphRelationText(edge, from, to), taskTerms);
    const matchedTerms = [...new Set([...sourceMatchedTerms, ...relationMatchedTerms])].sort(
      (left, right) => left.localeCompare(right),
    );

    items.push(
      item(
        "should-read",
        to.evidencePath,
        "Package-owned test selected for matched source package",
        75,
        "available",
        {
          source: "graph",
          selector: "package-test-for-owned-source",
          matchedTerms,
          relationKind: edge.kind,
          sourceNode: edge.from,
          targetNode: edge.to,
          operatorMessage: "Review the package test for the selected source.",
        },
      ),
    );
  }

  for (const edge of graph.edges) {
    if (edge.kind !== "owns-doc") {
      continue;
    }

    const sourceMatchedTerms = selectedSourcePackageTerms.get(edge.from);
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);

    if (!sourceMatchedTerms || !to?.evidencePath || to.status !== "deprecated") {
      continue;
    }

    const relationMatchedTerms = matchedTermsForText(graphRelationText(edge, from, to), taskTerms);
    const matchedTerms = [...new Set([...sourceMatchedTerms, ...relationMatchedTerms])].sort(
      (left, right) => left.localeCompare(right),
    );

    items.push(
      item(
        "do-not-use",
        to.evidencePath,
        "Package-owned doc is deprecated for the selected source package",
        99,
        "deprecated",
        {
          source: "graph",
          selector: "package-deprecated-doc-for-owned-source",
          matchedTerms,
          relationKind: edge.kind,
          sourceNode: edge.from,
          targetNode: edge.to,
          operatorMessage: "Do not use this package doc as active truth.",
        },
      ),
    );
  }

  for (const edge of graph.edges) {
    if (edge.kind !== "tests-source") {
      continue;
    }

    const sourceMatchedTerms = matchedPackageSourceTerms.get(edge.to);
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);

    if (!sourceMatchedTerms || !from?.evidencePath) {
      continue;
    }

    const relationMatchedTerms = matchedTermsForText(graphRelationText(edge, from, to), taskTerms);
    const matchedTerms = [...new Set([...sourceMatchedTerms, ...relationMatchedTerms])].sort(
      (left, right) => left.localeCompare(right),
    );

    items.push(
      item(
        "should-read",
        from.evidencePath,
        "Paired test selected for package-owned source",
        76,
        "available",
        {
          source: "graph",
          selector: "tests-source-for-owned-source",
          matchedTerms,
          relationKind: edge.kind,
          sourceNode: edge.from,
          targetNode: edge.to,
          operatorMessage: "Review the paired test for the selected source.",
        },
      ),
    );
  }

  for (const node of graph.nodes) {
    const matchedTerms = matchedTermsForText(graphNodeText(node), taskTerms);

    if (node.kind === "acf-group" && matchedTerms.length > 0 && node.status !== "deprecated") {
      selectedSourcePackageTerms.set(
        packageIdForContextPath(node.evidencePath) ?? node.id,
        matchedTerms,
      );
      items.push(
        item(
          "must-read",
          node.evidencePath,
          "Graph-lite ACF contract matched task terms",
          96,
          "available",
          {
            source: "graph",
            selector: "acf-group",
            matchedTerms,
            sourceNode: node.id,
          },
        ),
      );
    }

    if (node.kind === "acf-group" && matchedTerms.length > 0 && node.status === "deprecated") {
      items.push(
        item(
          "do-not-use",
          node.evidencePath,
          "Graph-lite marked this ACF contract deprecated",
          100,
          "deprecated",
          {
            source: "graph",
            selector: "deprecated-acf-status",
            matchedTerms,
            sourceNode: node.id,
          },
        ),
      );
    }

    if (
      node.kind === "doc" &&
      node.status !== "deprecated" &&
      matchedTerms.length > 0 &&
      !isOutsideSelectedPackage(node.evidencePath, selectedSourcePackageTerms) &&
      !shouldSuppressVerifyProfileDocMatch(node.evidencePath, matchedTerms, hints)
    ) {
      items.push(
        item(
          "reference-only",
          node.evidencePath,
          "Graph-lite doc matched task terms",
          30,
          "available",
          {
            source: "graph",
            selector: "doc-match",
            matchedTerms,
            sourceNode: node.id,
          },
        ),
      );
    }

    if (
      node.kind === "doc" &&
      node.status === "deprecated" &&
      matchedTerms.length > 0 &&
      !isOutsideSelectedPackage(node.evidencePath, selectedSourcePackageTerms) &&
      !shouldSuppressVerifyProfileDocMatch(node.evidencePath, matchedTerms, hints)
    ) {
      items.push(
        item(
          "do-not-use",
          node.evidencePath,
          "Graph-lite marked this document deprecated",
          100,
          "deprecated",
          {
            source: "graph",
            selector: "deprecated-doc-status",
            matchedTerms,
            sourceNode: node.id,
          },
        ),
      );
    }
  }

  return items;
}

function memoryItemsForTask(task: string, approvedMemory: MemoryRecord[] = []): ContextItem[] {
  if (hasExplicitMemoryOptOut(task)) {
    return [];
  }

  const explicit = explicitlyRequestsMemory(task);
  const taskTerms = taskTermsFor(task);
  const items: ContextItem[] = [];

  for (const record of approvedMemory) {
    if (record.status !== "approved" || !record.approvedAt) {
      continue;
    }

    const memoryText = `${record.summary} ${record.evidencePath ?? ""}`;
    const matchedTerms = matchedTermsForText(memoryText, taskTerms);

    if (!explicit && !isTaskRelevantMemoryMatch(matchedTerms)) {
      continue;
    }

    items.push(
      item(
        "reference-only",
        `.krn/memory/approved.json#${record.id}`,
        `Approved governed memory reference: ${record.summary}`,
        explicit ? 34 : 33,
        "available",
        {
          source: "memory",
          selector: explicit ? "approved-memory-explicit" : "approved-memory-task-match",
          matchedTerms: matchedTerms.length > 0 ? matchedTerms : undefined,
          memoryId: record.id,
          memorySummary: record.summary,
          approvedAt: record.approvedAt,
          evidencePath: record.evidencePath,
        },
      ),
    );
  }

  return items;
}

function dedupeItems(items: ContextItem[]): ContextItem[] {
  const byPathAndBucket = new Map<string, ContextItem>();

  for (const contextItem of items) {
    const key = `${contextItem.bucket}::${contextItem.path}`;
    const existing = byPathAndBucket.get(key);

    if (!existing || contextItem.priority > existing.priority) {
      byPathAndBucket.set(key, contextItem);
    }
  }

  return [...byPathAndBucket.values()];
}

function bucketItems(items: ContextItem[]): ContextBuckets {
  return {
    mustRead: rankContext(items.filter((contextItem) => contextItem.bucket === "must-read")),
    shouldRead: rankContext(items.filter((contextItem) => contextItem.bucket === "should-read")),
    referenceOnly: rankContext(
      items.filter((contextItem) => contextItem.bucket === "reference-only"),
    ),
    doNotUse: rankContext(items.filter((contextItem) => contextItem.bucket === "do-not-use")),
    missingContext: rankContext(
      items.filter((contextItem) => contextItem.bucket === "missing-context"),
    ),
  };
}

function coverageFor(
  buckets: ContextBuckets,
  overInclusion: ContextOverInclusionMetrics,
): ContextCoverage {
  const required = buckets.mustRead.length + buckets.missingContext.length;
  const present = buckets.mustRead.filter(
    (contextItem) => contextItem.status === "available",
  ).length;
  const missing = buckets.missingContext.length;

  return {
    required,
    present,
    missing,
    confidence: missing > 0 ? "low" : required > 1 ? "high" : "medium",
    overInclusionRisk: overInclusion.risk,
  };
}

function uniqueSorted(values: Iterable<string | undefined>): string[] {
  return [...new Set([...values].filter((value): value is string => Boolean(value)))].sort(
    (left, right) => left.localeCompare(right),
  );
}

function bucketSummaryFor(bucketName: (typeof bucketNames)[number], items: ContextItem[]) {
  const markdownBudget = markdownItemBudgets[bucketName];

  return {
    bucket: bucketValueByName[bucketName],
    totalItems: items.length,
    shownInMarkdown: Math.min(items.length, markdownBudget),
    hiddenFromMarkdown: Math.max(0, items.length - markdownBudget),
    markdownBudget,
    availableItems: items.filter((contextItem) => contextItem.status === "available").length,
    deprecatedItems: items.filter((contextItem) => contextItem.status === "deprecated").length,
    missingItems: items.filter((contextItem) => contextItem.status === "missing").length,
    selectors: uniqueSorted(items.map((contextItem) => contextItem.selector)),
  };
}

function bucketSummariesFor(buckets: ContextBuckets): ContextBucketSummaries {
  return {
    mustRead: bucketSummaryFor("mustRead", buckets.mustRead),
    shouldRead: bucketSummaryFor("shouldRead", buckets.shouldRead),
    referenceOnly: bucketSummaryFor("referenceOnly", buckets.referenceOnly),
    doNotUse: bucketSummaryFor("doNotUse", buckets.doNotUse),
    missingContext: bucketSummaryFor("missingContext", buckets.missingContext),
  };
}

function compactnessFor(summaries: ContextBucketSummaries): ContextCompactness {
  const summaryValues = bucketNames.map((bucketName) => summaries[bucketName]);

  return {
    markdownItemBudgets,
    totalItems: summaryValues.reduce((total, summary) => total + summary.totalItems, 0),
    markdownVisibleItems: summaryValues.reduce(
      (total, summary) => total + summary.shownInMarkdown,
      0,
    ),
    markdownHiddenItems: summaryValues.reduce(
      (total, summary) => total + summary.hiddenFromMarkdown,
      0,
    ),
  };
}

function overInclusionFor(buckets: ContextBuckets): ContextOverInclusionMetrics {
  const activeItems = buckets.mustRead.length + buckets.shouldRead.length;
  const referenceOnlyItems = buckets.referenceOnly.length;
  const totalItems =
    activeItems + referenceOnlyItems + buckets.doNotUse.length + buckets.missingContext.length;
  const score = referenceOnlyItems + Math.max(0, activeItems - 6) + Math.max(0, totalItems - 12);
  const reasons: string[] = [];

  if (activeItems > 10) {
    reasons.push("active-items-over-10");
  } else if (activeItems > 6) {
    reasons.push("active-items-over-6");
  }

  if (referenceOnlyItems > 10) {
    reasons.push("reference-only-over-10");
  } else if (referenceOnlyItems > 4) {
    reasons.push("reference-only-over-4");
  }

  if (totalItems > 20) {
    reasons.push("total-items-over-20");
  } else if (totalItems > 12) {
    reasons.push("total-items-over-12");
  }

  return {
    activeItems,
    referenceOnlyItems,
    totalItems,
    score,
    risk:
      score >= 12 || activeItems > 10 || referenceOnlyItems > 10 || totalItems > 20
        ? "high"
        : score >= 5 || activeItems > 6 || referenceOnlyItems > 4 || totalItems > 12
          ? "medium"
          : "low",
    reasons: reasons.length > 0 ? reasons : ["within-p0-budget"],
  };
}

export function buildContextPackage(
  contract?: TaskContract,
  graph?: GraphLite,
  options: BuildContextPackageOptions = {},
): ContextPackage {
  const task = contract?.task ?? "";
  const selectionHints = selectionHintsFor(contract);
  const items = rankContext(
    dedupeItems([
      ...baseItems(),
      ...taskPolicyItems(task),
      ...taskContractMetadataItems(contract),
      ...explicitTaskPathItems(selectionHints),
      ...graphItemsForTask(task, graph, selectionHints),
      ...memoryItemsForTask(task, options.approvedMemory),
    ]),
  );
  const buckets = bucketItems(items);
  const bucketSummaries = bucketSummariesFor(buckets);
  const overInclusion = overInclusionFor(buckets);
  const stop = shouldStop(contract, buckets);
  const pkg: ContextPackage = {
    taskId: contract?.id,
    items,
    buckets,
    bucketSummaries,
    coverage: coverageFor(buckets, overInclusion),
    compactness: compactnessFor(bucketSummaries),
    overInclusion,
    stop: stop.stop,
  };

  if (stop.reason) {
    pkg.stopReason = stop.reason;
  }

  return pkg;
}
