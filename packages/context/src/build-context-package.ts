import type { GraphLite } from "../../graph/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";
import { rankContext } from "./rank-context.js";
import type {
  ContextBucket,
  ContextBuckets,
  ContextCoverage,
  ContextItem,
  ContextPackage,
} from "./schema.js";
import { shouldStop } from "./stop-policy.js";

const taskStopWords = new Set([
  "active",
  "avoid",
  "context",
  "docs",
  "implement",
  "missing",
  "only",
  "relevant",
  "required",
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
): ContextItem {
  return {
    path,
    reason,
    priority,
    bucket,
    status,
  };
}

function baseItems(): ContextItem[] {
  return [
    item("must-read", "AGENTS.md", "Repo-level operating contract", 100),
    item(
      "should-read",
      "docs/architecture/architecture-spec-v0.1.md",
      "P0 architecture canon when present",
      80,
    ),
    item(
      "reference-only",
      "docs/specs/context-package.schema.md",
      "Context package schema reference",
      40,
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

function textMatchesTerms(text: string, terms: string[]): boolean {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
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

    if (!textMatchesTerms(relationText, taskTerms)) {
      continue;
    }

    items.push(
      item("must-read", edge.evidencePath, "Graph-lite style relation matched task terms", 98),
    );

    if (to?.evidencePath) {
      items.push(
        item("must-read", to.evidencePath, "Graph-lite related stylesheet matched task terms", 97),
      );
    }
  }

  for (const node of graph.nodes) {
    if (
      node.kind === "acf-group" &&
      textMatchesTerms(graphNodeText(node), taskTerms) &&
      node.status !== "deprecated"
    ) {
      items.push(
        item("must-read", node.evidencePath, "Graph-lite ACF contract matched task terms", 96),
      );
    }

    if (
      node.kind === "doc" &&
      node.status !== "deprecated" &&
      textMatchesTerms(graphNodeText(node), taskTerms)
    ) {
      items.push(
        item("reference-only", node.evidencePath, "Graph-lite doc matched task terms", 30),
      );
    }

    if (
      node.kind === "doc" &&
      node.status === "deprecated" &&
      textMatchesTerms(graphNodeText(node), taskTerms)
    ) {
      items.push(
        item(
          "do-not-use",
          node.evidencePath,
          "Graph-lite marked this document deprecated",
          100,
          "deprecated",
        ),
      );
    }
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

export function buildContextPackage(contract?: TaskContract, graph?: GraphLite): ContextPackage {
  const task = contract?.task ?? "";
  const items = rankContext(
    dedupeItems([...baseItems(), ...taskPolicyItems(task), ...graphItemsForTask(task, graph)]),
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
