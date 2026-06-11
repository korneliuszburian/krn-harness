export type ContextBucket =
  | "must-read"
  | "should-read"
  | "reference-only"
  | "do-not-use"
  | "missing-context";

export type ContextItemStatus = "available" | "deprecated" | "missing";

export interface ContextItem {
  path: string;
  reason: string;
  priority: number;
  bucket: ContextBucket;
  status: ContextItemStatus;
  source?: "base" | "graph" | "memory" | "task-policy" | undefined;
  selector?: string | undefined;
  matchedTerms?: string[] | undefined;
  relationKind?: string | undefined;
  sourceNode?: string | undefined;
  targetNode?: string | undefined;
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

export interface ContextPackage {
  taskId?: string | undefined;
  items: ContextItem[];
  buckets: ContextBuckets;
  coverage: ContextCoverage;
  stop: boolean;
  stopReason?: string | undefined;
}
