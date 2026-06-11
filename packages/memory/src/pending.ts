import { createHash } from "node:crypto";
import type { MemoryRecord } from "./schema.js";

export interface CreatePendingMemoryInput {
  id?: string | undefined;
  summary: string;
  evidencePath?: string | undefined;
  now?: Date | undefined;
}

export function memoryIdFor(summary: string, evidencePath?: string): string {
  const digest = createHash("sha256")
    .update(`${summary}\0${evidencePath ?? ""}`)
    .digest("hex")
    .slice(0, 12);

  return `memory-${digest}`;
}

export function createPendingMemory(input: CreatePendingMemoryInput): MemoryRecord {
  const timestamp = (input.now ?? new Date()).toISOString();
  const record: MemoryRecord = {
    schemaVersion: 1,
    id: input.id ?? memoryIdFor(input.summary, input.evidencePath),
    summary: input.summary,
    status: "pending",
    createdAt: timestamp,
    updatedAt: timestamp,
    source: "manual",
  };

  if (input.evidencePath) {
    record.evidencePath = input.evidencePath;
  }

  return record;
}
