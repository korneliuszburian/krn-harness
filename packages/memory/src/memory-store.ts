import type { MemoryRecord } from "./schema.js";

export interface MemoryStore {
  list(): Promise<MemoryRecord[]>;
  put(record: MemoryRecord): Promise<void>;
}

export class InMemoryStore implements MemoryStore {
  readonly records = new Map<string, MemoryRecord>();

  async list(): Promise<MemoryRecord[]> {
    return [...this.records.values()];
  }

  async put(record: MemoryRecord): Promise<void> {
    this.records.set(record.id, record);
  }
}
