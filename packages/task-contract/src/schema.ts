export type TaskClassification = "implementation" | "docs" | "research" | "review" | "unknown";
export type TaskMode = "edit" | "read-only" | "review" | "unknown";

export interface StopCondition {
  code: string;
  reason: string;
  active: boolean;
}

export interface TaskContract {
  id: string;
  rawUserIntent: string;
  task: string;
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
