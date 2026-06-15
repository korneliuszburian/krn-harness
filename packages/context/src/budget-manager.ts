import type {
  ContextBudget,
  ContextBudgetPrunedItem,
  ContextItem,
  ContextItemSource,
} from "./schema.js";

export const defaultContextMaxTokens = 8_000;
export const contextTokenEstimator = "chars-div-4-v1";

interface ContextBudgetInput {
  items: ContextItem[];
  maxTokens?: number | undefined;
}

interface BudgetedContext {
  items: ContextItem[];
  budget: ContextBudget;
}

const sourceRetentionRank: Record<ContextItemSource, number> = {
  base: 1_000,
  "task-contract": 950,
  "task-policy": 900,
  memory: 800,
  graph: 700,
};

function itemText(item: ContextItem): string {
  return [
    item.path,
    item.reason,
    item.bucket,
    item.status,
    item.source,
    item.selector,
    item.operatorMessage,
    item.memorySummary,
    item.evidencePath,
    item.matchedTerms?.join(" "),
  ]
    .filter(Boolean)
    .join(" ");
}

export function estimateContextItemTokens(item: ContextItem): number {
  return Math.max(1, Math.ceil(itemText(item).length / 4));
}

function isProtectedItem(item: ContextItem): boolean {
  return (
    item.bucket === "do-not-use" ||
    item.bucket === "missing-context" ||
    item.source === "base" ||
    item.source === "task-contract" ||
    item.source === "task-policy"
  );
}

function retentionRank(item: ContextItem): number {
  const sourceRank = item.source ? sourceRetentionRank[item.source] : 600;
  const bucketRank =
    item.bucket === "must-read"
      ? 100
      : item.bucket === "should-read"
        ? 50
        : item.bucket === "reference-only"
          ? 25
          : 0;

  return sourceRank + bucketRank + item.priority / 1_000;
}

function prunedItem(item: ContextItem): ContextBudgetPrunedItem {
  return {
    path: item.path,
    bucket: item.bucket,
    source: item.source,
    selector: item.selector,
    estimatedTokens: estimateContextItemTokens(item),
    reason: "context-budget-pruned",
  };
}

export function applyContextBudget(input: ContextBudgetInput): BudgetedContext {
  const maxTokens = input.maxTokens ?? defaultContextMaxTokens;
  const estimatedTokens = input.items.reduce(
    (total, item) => total + estimateContextItemTokens(item),
    0,
  );

  if (estimatedTokens <= maxTokens) {
    return {
      items: input.items,
      budget: {
        maxTokens,
        estimatedTokens,
        retainedTokens: estimatedTokens,
        prunedTokens: 0,
        status: "within-budget",
        estimator: contextTokenEstimator,
        itemCountBefore: input.items.length,
        itemCountAfter: input.items.length,
        prunedItems: [],
        retentionPolicy: "task-contract-and-safety-before-memory-before-graph",
      },
    };
  }

  const retained = [...input.items];
  const candidates = retained
    .filter((item) => !isProtectedItem(item))
    .sort(
      (left, right) =>
        retentionRank(left) - retentionRank(right) ||
        left.priority - right.priority ||
        right.path.localeCompare(left.path),
    );
  const pruned: ContextBudgetPrunedItem[] = [];
  let retainedTokens = estimatedTokens;

  for (const candidate of candidates) {
    if (retainedTokens <= maxTokens) {
      break;
    }

    const index = retained.findIndex(
      (item) => item.bucket === candidate.bucket && item.path === candidate.path,
    );

    if (index === -1) {
      continue;
    }

    retained.splice(index, 1);
    const removed = prunedItem(candidate);
    pruned.push(removed);
    retainedTokens -= removed.estimatedTokens;
  }

  return {
    items: retained,
    budget: {
      maxTokens,
      estimatedTokens,
      retainedTokens,
      prunedTokens: estimatedTokens - retainedTokens,
      status: retainedTokens <= maxTokens ? "pruned" : "over-budget",
      estimator: contextTokenEstimator,
      itemCountBefore: input.items.length,
      itemCountAfter: retained.length,
      prunedItems: pruned.sort((left, right) => left.path.localeCompare(right.path)),
      retentionPolicy: "task-contract-and-safety-before-memory-before-graph",
    },
  };
}
