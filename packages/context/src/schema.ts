export type ContextBucket =
  | "must-read"
  | "should-read"
  | "reference-only"
  | "do-not-use"
  | "missing-context";

export type ContextItemStatus = "available" | "deprecated" | "missing";

export type ContextItemSource = "base" | "graph" | "memory" | "task-contract" | "task-policy";

export interface ContextItem {
  path: string;
  reason: string;
  priority: number;
  bucket: ContextBucket;
  status: ContextItemStatus;
  source?: ContextItemSource | undefined;
  selector?: string | undefined;
  matchedTerms?: string[] | undefined;
  relationKind?: string | undefined;
  sourceNode?: string | undefined;
  targetNode?: string | undefined;
  operatorMessage?: string | undefined;
  memoryId?: string | undefined;
  memorySummary?: string | undefined;
  approvedAt?: string | undefined;
  evidencePath?: string | undefined;
}

export interface ContextBuckets {
  mustRead: ContextItem[];
  shouldRead: ContextItem[];
  referenceOnly: ContextItem[];
  doNotUse: ContextItem[];
  missingContext: ContextItem[];
}

export interface ContextCoverage {
  required: number;
  present: number;
  missing: number;
  confidence: "low" | "medium" | "high";
  overInclusionRisk: "low" | "medium" | "high";
}

export interface ContextMarkdownItemBudgets {
  mustRead: number;
  shouldRead: number;
  referenceOnly: number;
  doNotUse: number;
  missingContext: number;
}

export interface ContextBucketSummary {
  bucket: ContextBucket;
  totalItems: number;
  shownInMarkdown: number;
  hiddenFromMarkdown: number;
  markdownBudget: number;
  availableItems: number;
  deprecatedItems: number;
  missingItems: number;
  selectors: string[];
}

export interface ContextBucketSummaries {
  mustRead: ContextBucketSummary;
  shouldRead: ContextBucketSummary;
  referenceOnly: ContextBucketSummary;
  doNotUse: ContextBucketSummary;
  missingContext: ContextBucketSummary;
}

export interface ContextCompactness {
  markdownItemBudgets: ContextMarkdownItemBudgets;
  totalItems: number;
  markdownVisibleItems: number;
  markdownHiddenItems: number;
}

export interface ContextOverInclusionMetrics {
  activeItems: number;
  referenceOnlyItems: number;
  totalItems: number;
  score: number;
  risk: "low" | "medium" | "high";
  reasons: string[];
}

export type ContextBudgetStatus = "within-budget" | "pruned" | "over-budget";

export interface ContextBudgetPrunedItem {
  path: string;
  bucket: ContextBucket;
  source?: ContextItemSource | undefined;
  selector?: string | undefined;
  estimatedTokens: number;
  reason: "context-budget-pruned";
}

export interface ContextBudget {
  maxTokens: number;
  estimatedTokens: number;
  retainedTokens: number;
  prunedTokens: number;
  status: ContextBudgetStatus;
  estimator: "chars-div-4-v1";
  itemCountBefore: number;
  itemCountAfter: number;
  prunedItems: ContextBudgetPrunedItem[];
  retentionPolicy: "task-contract-and-safety-before-memory-before-graph";
}

export interface ContextPackage {
  taskId?: string | undefined;
  items: ContextItem[];
  buckets: ContextBuckets;
  bucketSummaries: ContextBucketSummaries;
  coverage: ContextCoverage;
  compactness: ContextCompactness;
  overInclusion: ContextOverInclusionMetrics;
  budget: ContextBudget;
  stop: boolean;
  stopReason?: string | undefined;
}
