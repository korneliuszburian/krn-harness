import type { MemoryRecord } from "./schema.js";

export function approveMemory(record: MemoryRecord, now = new Date()): MemoryRecord {
  const timestamp = now.toISOString();
  const {
    deprecatedAt: _deprecatedAt,
    deprecationReason: _deprecationReason,
    ...activeRecord
  } = record;

  return {
    ...activeRecord,
    status: "approved",
    updatedAt: timestamp,
    approvedAt: timestamp,
  };
}
