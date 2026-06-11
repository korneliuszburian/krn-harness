export const memoryStatuses = ["pending", "approved", "deprecated"] as const;

export type MemoryStatus = (typeof memoryStatuses)[number];

export interface MemoryRecord {
  schemaVersion: 1;
  id: string;
  summary: string;
  status: MemoryStatus;
  evidencePath?: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  deprecatedAt?: string;
  deprecationReason?: string;
  source: "manual";
}

export interface MemoryStoreFile {
  schemaVersion: 1;
  status: MemoryStatus;
  records: MemoryRecord[];
}
