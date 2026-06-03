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
