import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { approveMemory } from "./approve.js";
import { deprecateMemory } from "./deprecate.js";
import { type CreatePendingMemoryInput, createPendingMemory } from "./pending.js";
import {
  type MemoryRecord,
  type MemoryStatus,
  type MemoryStoreFile,
  memoryStatuses,
} from "./schema.js";

export interface MemoryCounts {
  pending: number;
  approved: number;
  deprecated: number;
}

export interface MemoryOperationResult {
  status: "created" | "approved" | "deprecated" | "not-found";
  record?: MemoryRecord | undefined;
  counts: MemoryCounts;
}

export function memoryDir(cwd: string): string {
  return path.join(cwd, ".krn", "memory");
}

export function memoryStorePath(cwd: string, status: MemoryStatus): string {
  return path.join(memoryDir(cwd), `${status}.json`);
}

function emptyStore(status: MemoryStatus): MemoryStoreFile {
  return {
    schemaVersion: 1,
    status,
    records: [],
  };
}

function sortRecords(records: MemoryRecord[]): MemoryRecord[] {
  return [...records].sort((left, right) => left.id.localeCompare(right.id));
}

function assertStoreShape(value: MemoryStoreFile, status: MemoryStatus): MemoryStoreFile {
  if (value.schemaVersion !== 1 || value.status !== status || !Array.isArray(value.records)) {
    throw new Error(`Memory store ${status} is invalid`);
  }

  return {
    schemaVersion: 1,
    status,
    records: sortRecords(value.records.filter((record) => record.status === status)),
  };
}

export async function loadMemoryStore(cwd: string, status: MemoryStatus): Promise<MemoryStoreFile> {
  try {
    const parsed = JSON.parse(
      await readFile(memoryStorePath(cwd, status), "utf8"),
    ) as MemoryStoreFile;
    return assertStoreShape(parsed, status);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Memory store")) {
      throw error;
    }

    return emptyStore(status);
  }
}

export async function writeMemoryStore(cwd: string, store: MemoryStoreFile): Promise<void> {
  await mkdir(memoryDir(cwd), { recursive: true });
  await writeFile(
    memoryStorePath(cwd, store.status),
    `${JSON.stringify({ ...store, records: sortRecords(store.records) }, null, 2)}\n`,
    "utf8",
  );
}

export async function listMemoryRecords(cwd: string): Promise<MemoryRecord[]> {
  const stores = await Promise.all(memoryStatuses.map((status) => loadMemoryStore(cwd, status)));
  return sortRecords(stores.flatMap((store) => store.records));
}

export async function memoryCounts(cwd: string): Promise<MemoryCounts> {
  const [pending, approved, deprecated] = await Promise.all([
    loadMemoryStore(cwd, "pending"),
    loadMemoryStore(cwd, "approved"),
    loadMemoryStore(cwd, "deprecated"),
  ]);

  return {
    pending: pending.records.length,
    approved: approved.records.length,
    deprecated: deprecated.records.length,
  };
}

function storeWithRecord(store: MemoryStoreFile, record: MemoryRecord): MemoryStoreFile {
  const records = store.records.filter((existing) => existing.id !== record.id);
  if (store.status === record.status) {
    records.push(record);
  }

  return {
    ...store,
    records: sortRecords(records),
  };
}

function recordsChanged(left: MemoryRecord[], right: MemoryRecord[]): boolean {
  return JSON.stringify(sortRecords(left)) !== JSON.stringify(sortRecords(right));
}

async function putRecord(cwd: string, record: MemoryRecord): Promise<void> {
  const stores = await Promise.all(memoryStatuses.map((status) => loadMemoryStore(cwd, status)));
  const changedStores = stores
    .map((store) => {
      const nextStore = storeWithRecord(store, record);
      return {
        store: nextStore,
        changed: recordsChanged(store.records, nextStore.records),
      };
    })
    .filter((entry) => entry.changed)
    .map((entry) => entry.store);

  await Promise.all(changedStores.map((store) => writeMemoryStore(cwd, store)));
}

async function findRecord(cwd: string, id: string): Promise<MemoryRecord | undefined> {
  return (await listMemoryRecords(cwd)).find((record) => record.id === id);
}

export async function proposeMemory(
  cwd: string,
  input: CreatePendingMemoryInput,
): Promise<MemoryOperationResult> {
  const record = createPendingMemory(input);
  await putRecord(cwd, record);

  return {
    status: "created",
    record,
    counts: await memoryCounts(cwd),
  };
}

export async function approveMemoryById(
  cwd: string,
  id: string,
  now = new Date(),
): Promise<MemoryOperationResult> {
  const record = await findRecord(cwd, id);

  if (!record) {
    return {
      status: "not-found",
      counts: await memoryCounts(cwd),
    };
  }

  const approved = approveMemory(record, now);
  await putRecord(cwd, approved);

  return {
    status: "approved",
    record: approved,
    counts: await memoryCounts(cwd),
  };
}

export async function deprecateMemoryById(
  cwd: string,
  id: string,
  input: { reason?: string | undefined; now?: Date | undefined } = {},
): Promise<MemoryOperationResult> {
  const record = await findRecord(cwd, id);

  if (!record) {
    return {
      status: "not-found",
      counts: await memoryCounts(cwd),
    };
  }

  const deprecated = deprecateMemory(record, input);
  await putRecord(cwd, deprecated);

  return {
    status: "deprecated",
    record: deprecated,
    counts: await memoryCounts(cwd),
  };
}
