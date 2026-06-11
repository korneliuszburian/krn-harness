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
  ContextBuckets,
  ContextCoverage,
  ContextItem,
  ContextPackage,
} from "./schema.js";
import { shouldStop } from "./stop-policy.js";

export interface BuildContextPackageOptions {
  approvedMemory?: MemoryRecord[] | undefined;
}

const taskStopWords = new Set([
  "active",
  "avoid",
  "approved",
  "context",
  "docs",
  "implement",
  "memories",
  "memory",
  "missing",
  "only",
  "relevant",
  "required",
  "section",
  "stop",
  "task",
  "treating",
  "truth",
  "update",
  "using",
  "when",
  "with",
  "work",
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

function graphNodeText(node: { label: string; evidencePath: string } | undefined): string {
  return node ? `${node.label} ${node.evidencePath}` : "";
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

function graphItemsForTask(task: string, graph?: GraphLite): ContextItem[] {
  if (!graph) {
    return [];
  }

  const taskTerms = taskTermsFor(task);
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const items: ContextItem[] = [];

  for (const edge of graph.edges) {
    if (edge.kind !== "style-related-to") {
      continue;
    }

    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    const relationText = `${edge.evidencePath} ${graphNodeText(from)} ${graphNodeText(to)}`;

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
    }
  }

  for (const node of graph.nodes) {
    const matchedTerms = matchedTermsForText(graphNodeText(node), taskTerms);

    if (node.kind === "acf-group" && matchedTerms.length > 0 && node.status !== "deprecated") {
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

    if (node.kind === "doc" && node.status !== "deprecated" && matchedTerms.length > 0) {
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

    if (node.kind === "doc" && node.status === "deprecated" && matchedTerms.length > 0) {
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

function coverageFor(buckets: ContextBuckets): ContextCoverage {
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
    overInclusionRisk: buckets.referenceOnly.length > 4 ? "medium" : "low",
  };
}

export function buildContextPackage(
  contract?: TaskContract,
  graph?: GraphLite,
  options: BuildContextPackageOptions = {},
): ContextPackage {
  const task = contract?.task ?? "";
  const items = rankContext(
    dedupeItems([
      ...baseItems(),
      ...taskPolicyItems(task),
      ...graphItemsForTask(task, graph),
      ...memoryItemsForTask(task, options.approvedMemory),
    ]),
  );
  const buckets = bucketItems(items);
  const stop = shouldStop(contract, buckets);
  const pkg: ContextPackage = {
    taskId: contract?.id,
    items,
    buckets,
    coverage: coverageFor(buckets),
    stop: stop.stop,
  };

  if (stop.reason) {
    pkg.stopReason = stop.reason;
  }

  return pkg;
}
