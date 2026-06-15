export type TaskClassification = "implementation" | "docs" | "research" | "review" | "unknown";
export type TaskIntentQuality = "low" | "medium" | "high";
export type TaskMode = "edit" | "read-only" | "review" | "unknown";
export type AcceptanceCriterionKind =
  | "scope"
  | "context"
  | "validation"
  | "safety"
  | "documentation"
  | "unknown";
export type ProofRequirementKind =
  | "verify"
  | "handoff"
  | "artifact"
  | "review"
  | "command"
  | "unknown";

export interface NormalizedAcceptanceCriterion {
  id: string;
  text: string;
  kind: AcceptanceCriterionKind;
  required: true;
}

export interface NormalizedProofRequirement {
  id: string;
  text: string;
  kind: ProofRequirementKind;
  required: true;
}

export interface StopCondition {
  code: string;
  reason: string;
  active: boolean;
}

export interface TaskContract {
  id: string;
  rawUserIntent: string;
  task: string;
  intentQuality: TaskIntentQuality;
  intentWarnings: string[];
  metadata?: {
    taskSpecPath?: string;
    expectedTouchedFiles?: string[];
    forbiddenTouchedFiles?: string[];
    requiredDoNotUsePaths?: string[];
  };
  interpretation: string;
  classification: TaskClassification;
  mode: TaskMode;
  nonTrivial: boolean;
  acceptance: string[];
  proof: string[];
  evidenceRequirements: string[];
  stopConditions: StopCondition[];
  stop: boolean;
  stopReason?: string;
}
