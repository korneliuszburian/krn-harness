import type { MemoryRecord } from "./schema.js";

export function snapshotMemory(records: MemoryRecord[]): string {
  return records.map((record) => `${record.status}: ${record.id} ${record.summary}`).join("\n");
}
