import type { GraphLite } from "../../graph/src/index.js";
import type { MemoryRecord } from "../../memory/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";
import { applyContextBudget } from "./budget-manager.js";
import {
  baseItems,
  contextItem,
  explicitTaskPathItems,
  graphItemsForTask,
  matchedTermsForText,
  selectionHintsFor,
  taskContractMetadataItems,
  taskPolicyItems,
  taskTermsFor,
} from "./context-selection.js";
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
  maxTokens?: number | undefined;
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
      contextItem(
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
  const itemsBeforeBudget = rankContext(
    dedupeItems([
      ...baseItems(),
      ...taskPolicyItems(task),
      ...taskContractMetadataItems(contract),
      ...explicitTaskPathItems(selectionHints),
      ...graphItemsForTask(task, graph, selectionHints),
      ...memoryItemsForTask(task, options.approvedMemory),
    ]),
  );
  const budgeted = applyContextBudget({
    items: itemsBeforeBudget,
    maxTokens: options.maxTokens,
  });
  const items = rankContext(budgeted.items);
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
    budget: budgeted.budget,
    stop: stop.stop,
  };

  if (stop.reason) {
    pkg.stopReason = stop.reason;
  }

  return pkg;
}
