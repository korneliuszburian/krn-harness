import type { MemoryRecord } from "./schema.js";

export function compactMemory(records: MemoryRecord[]): MemoryRecord[] {
  return records.filter((record) => record.status === "approved");
}
