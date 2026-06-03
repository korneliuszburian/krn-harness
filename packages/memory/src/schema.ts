export interface MemoryRecord {
  id: string;
  summary: string;
  status: "pending" | "approved" | "rejected";
  evidencePath?: string;
}
