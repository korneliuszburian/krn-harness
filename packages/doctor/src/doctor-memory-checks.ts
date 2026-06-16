import path from "node:path";
import { hasExplicitMemoryOptOut, isTaskRelevantMemoryMatch } from "../../context/src/index.js";
import { type MemoryStatus, memoryStatuses } from "../../memory/src/index.js";
import { isRecord, parseJsonFile, readJson } from "./doctor-json.js";
import type { DoctorCheck } from "./doctor-types.js";

function isMemoryRecordForStatus(value: unknown, status: MemoryStatus): boolean {
  if (!isRecord(value)) {
    return false;
  }

  if (
    value.schemaVersion !== 1 ||
    value.status !== status ||
    value.source !== "manual" ||
    typeof value.id !== "string" ||
    typeof value.summary !== "string" ||
    typeof value.createdAt !== "string" ||
    typeof value.updatedAt !== "string"
  ) {
    return false;
  }

  if (status === "pending" && typeof value.approvedAt === "string") {
    return false;
  }

  if (status === "approved" && typeof value.approvedAt !== "string") {
    return false;
  }

  if (status === "deprecated" && typeof value.deprecatedAt !== "string") {
    return false;
  }

  return true;
}

function isMemoryStore(value: unknown, status: MemoryStatus): value is { records: unknown[] } {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    value.status === status &&
    Array.isArray(value.records) &&
    value.records.every((record) => isMemoryRecordForStatus(record, status))
  );
}

async function readMemoryRecordsForStatus(cwd: string, status: MemoryStatus): Promise<unknown[]> {
  const parsed = await parseJsonFile(path.join(cwd, ".krn", "memory", `${status}.json`));

  if (parsed.status !== "parsed" || !isMemoryStore(parsed.value, status)) {
    return [];
  }

  return parsed.value.records;
}

function recordsById(records: unknown[]): Map<string, Record<string, unknown>> {
  const byId = new Map<string, Record<string, unknown>>();

  for (const record of records) {
    if (isRecord(record) && typeof record.id === "string") {
      byId.set(record.id, record);
    }
  }

  return byId;
}

export async function memoryStoresCheck(cwd: string): Promise<DoctorCheck> {
  const counts: Record<MemoryStatus, number> = {
    pending: 0,
    approved: 0,
    deprecated: 0,
  };
  const missing: string[] = [];

  for (const status of memoryStatuses) {
    const relativePath = `.krn/memory/${status}.json`;
    const parsed = await parseJsonFile(path.join(cwd, relativePath));

    if (parsed.status === "missing") {
      missing.push(relativePath);
      continue;
    }

    if (parsed.status === "malformed") {
      return {
        name: "memory-stores",
        status: "fail",
        detail: `${relativePath} is malformed`,
      };
    }

    if (!isMemoryStore(parsed.value, status)) {
      return {
        name: "memory-stores",
        status: "fail",
        detail: `${relativePath} is incomplete or contains records with the wrong status`,
      };
    }

    counts[status] = parsed.value.records.length;
  }

  if (missing.length === memoryStatuses.length) {
    return {
      name: "memory-stores",
      status: "warn",
      detail: ".krn/memory stores are missing; governed memory has not been used",
    };
  }

  if (missing.length > 0) {
    return {
      name: "memory-stores",
      status: "warn",
      detail: `Missing memory store(s): ${missing.join(", ")}`,
    };
  }

  return {
    name: "memory-stores",
    status: "pass",
    detail: `Memory stores: pending ${counts.pending}, approved ${counts.approved}, deprecated ${counts.deprecated}`,
  };
}

function contextItemsFrom(value: unknown): Record<string, unknown>[] {
  if (!isRecord(value)) {
    return [];
  }

  const items = Array.isArray(value.items) ? value.items : [];
  const buckets = isRecord(value.buckets)
    ? Object.values(value.buckets).flatMap((bucket) => (Array.isArray(bucket) ? bucket : []))
    : [];

  return [...items, ...buckets].filter(isRecord);
}

export async function memoryContextGateCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/current/context-package.json";
  const parsedContext = await parseJsonFile(path.join(cwd, relativePath));
  const taskContract = await readJson<{ task?: string }>(
    path.join(cwd, ".krn", "current", "task-contract.json"),
  );
  const taskOptsOut = hasExplicitMemoryOptOut(taskContract?.task ?? "");

  if (parsedContext.status === "missing") {
    return {
      name: "memory-context-gate",
      status: "pass",
      detail: "No current context package; memory context gate skipped",
    };
  }

  if (parsedContext.status === "malformed") {
    return {
      name: "memory-context-gate",
      status: "fail",
      detail: `${relativePath} is malformed`,
    };
  }

  const approved = recordsById(await readMemoryRecordsForStatus(cwd, "approved"));
  const pending = recordsById(await readMemoryRecordsForStatus(cwd, "pending"));
  const deprecated = recordsById(await readMemoryRecordsForStatus(cwd, "deprecated"));
  const seen = new Map<string, Record<string, unknown>>();

  for (const item of contextItemsFrom(parsedContext.value)) {
    const memoryId = typeof item.memoryId === "string" ? item.memoryId : undefined;
    const pathValue = typeof item.path === "string" ? item.path : "";
    const source = typeof item.source === "string" ? item.source : undefined;
    const isMemoryContext = source === "memory" || pathValue.startsWith(".krn/memory/") || memoryId;

    if (!isMemoryContext) {
      continue;
    }

    const checkKey = memoryId ?? pathValue;
    if (seen.has(checkKey)) {
      continue;
    }
    seen.set(checkKey, item);

    if (taskOptsOut) {
      return {
        name: "memory-context-gate",
        status: "fail",
        detail: `Current task explicitly opts out of memory but ${memoryId ?? pathValue} is surfaced`,
      };
    }

    if (!memoryId) {
      return {
        name: "memory-context-gate",
        status: "fail",
        detail: "Memory context item is missing memoryId provenance",
      };
    }

    if (item.bucket !== "reference-only") {
      return {
        name: "memory-context-gate",
        status: "fail",
        detail: `Memory ${memoryId} is not reference-only`,
      };
    }

    if (pending.has(memoryId)) {
      return {
        name: "memory-context-gate",
        status: "fail",
        detail: `Pending memory ${memoryId} leaked into context`,
      };
    }

    if (deprecated.has(memoryId)) {
      return {
        name: "memory-context-gate",
        status: "fail",
        detail: `Deprecated memory ${memoryId} leaked into context`,
      };
    }

    const approvedRecord = approved.get(memoryId);
    if (!approvedRecord) {
      return {
        name: "memory-context-gate",
        status: "fail",
        detail: `Memory ${memoryId} is not approved in local store`,
      };
    }

    if (
      source !== "memory" ||
      (item.selector !== "approved-memory-explicit" &&
        item.selector !== "approved-memory-task-match") ||
      item.approvedAt !== approvedRecord.approvedAt ||
      item.memorySummary !== approvedRecord.summary
    ) {
      return {
        name: "memory-context-gate",
        status: "fail",
        detail: `Memory ${memoryId} is missing approved provenance`,
      };
    }

    if (item.selector === "approved-memory-task-match") {
      const matchedTerms = Array.isArray(item.matchedTerms)
        ? item.matchedTerms.filter((term) => typeof term === "string")
        : [];

      if (!isTaskRelevantMemoryMatch(matchedTerms)) {
        return {
          name: "memory-context-gate",
          status: "fail",
          detail: `Memory ${memoryId} task match is too broad`,
        };
      }
    }

    if (
      typeof approvedRecord.evidencePath === "string" &&
      item.evidencePath !== approvedRecord.evidencePath
    ) {
      return {
        name: "memory-context-gate",
        status: "fail",
        detail: `Memory ${memoryId} evidence provenance does not match approved store`,
      };
    }
  }

  return {
    name: "memory-context-gate",
    status: "pass",
    detail:
      seen.size === 0
        ? "No approved memory surfaced in current context"
        : `${seen.size} approved memory reference(s) are reference-only with provenance`,
  };
}
