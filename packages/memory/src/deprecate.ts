import type { MemoryRecord } from "./schema.js";

export function deprecateMemory(
  record: MemoryRecord,
  input: { reason?: string | undefined; now?: Date | undefined } = {},
): MemoryRecord {
  const timestamp = (input.now ?? new Date()).toISOString();
  const deprecated: MemoryRecord = {
    ...record,
    status: "deprecated",
    updatedAt: timestamp,
    deprecatedAt: timestamp,
  };

  if (input.reason) {
    deprecated.deprecationReason = input.reason;
  }

  return deprecated;
}
