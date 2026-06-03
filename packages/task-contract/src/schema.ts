export type TaskClassification = "implementation" | "docs" | "research" | "review" | "unknown";

export interface TaskContract {
  id: string;
  task: string;
  classification: TaskClassification;
  acceptance: string[];
  proof: string[];
  stop: boolean;
  stopReason?: string;
}
