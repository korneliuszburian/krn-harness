import type { MemoryRecord } from "./schema.js";

export function createPendingMemory(
  id: string,
  summary: string,
  evidencePath?: string,
): MemoryRecord {
  const record: MemoryRecord = {
    id,
    summary,
    status: "pending",
  };

  if (evidencePath) {
    record.evidencePath = evidencePath;
  }

  return record;
}
