import type { MemoryRecord } from "./schema.js";

export function approveMemory(record: MemoryRecord): MemoryRecord {
  return {
    ...record,
    status: "approved",
  };
}
