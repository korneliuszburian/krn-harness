import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../../config/src/index.js";
import { hasExplicitMemoryOptOut, isTaskRelevantMemoryMatch } from "../../context/src/index.js";
import { type MemoryStatus, memoryStatuses } from "../../memory/src/index.js";

export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export type DoctorStatus = "pass" | "warn" | "fail";

export interface DoctorResult {
  status: DoctorStatus;
  checks: DoctorCheck[];
  nextActions: string[];
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function deriveStatus(checks: DoctorCheck[]): DoctorStatus {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "pass";
}

function nextActionsFor(checks: DoctorCheck[]): string[] {
  const byName = new Map(checks.map((check) => [check.name, check]));
  const actions: string[] = [];

  if (byName.get("graph-json")?.status === "warn") {
    actions.push("Run `krn graph` to generate graph artifacts.");
  }

  if (byName.get("current-context-package")?.status === "warn") {
    actions.push("Run `krn context` to generate the current context package.");
  }

  if (byName.get("current-verify-result")?.status === "warn") {
    actions.push("Run `krn verify` to record P0 verification state.");
  }

  if (byName.get("current-handoff")?.status === "warn") {
    actions.push("Run `krn handoff` to generate the current handoff.");
  }

  return actions;
}

async function isHarnessSource(cwd: string): Promise<boolean> {
  const packageJson = await readJson<{ name?: string }>(path.join(cwd, "package.json"));
  return packageJson?.name === "krn-harness";
}

function artifactCheck(name: string, present: boolean, relativePath: string): DoctorCheck {
  return {
    name,
    status: present ? "pass" : "warn",
    detail: present ? `${relativePath} is present` : `${relativePath} is missing`,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function parseJsonFile(
  filePath: string,
): Promise<{ status: "missing" } | { status: "malformed" } | { status: "parsed"; value: unknown }> {
  if (!(await pathExists(filePath))) {
    return { status: "missing" };
  }

  try {
    return {
      status: "parsed",
      value: JSON.parse(await readFile(filePath, "utf8")) as unknown,
    };
  } catch {
    return { status: "malformed" };
  }
}

function isGraphArtifact(value: unknown): value is {
  nodeCount: number;
  edgeCount: number;
  detectors: unknown[];
  relationKindCounts: Record<string, unknown>;
  nodes: unknown[];
  edges: unknown[];
} {
  return (
    isRecord(value) &&
    typeof value.nodeCount === "number" &&
    typeof value.edgeCount === "number" &&
    Array.isArray(value.detectors) &&
    isRecord(value.relationKindCounts) &&
    Array.isArray(value.nodes) &&
    Array.isArray(value.edges)
  );
}

async function graphJsonShapeCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/graph/repo-graph.json";
  const parsed = await parseJsonFile(path.join(cwd, relativePath));

  if (parsed.status === "missing") {
    return {
      name: "graph-json-shape",
      status: "warn",
      detail: `${relativePath} is missing; graph shape not checked`,
    };
  }

  if (parsed.status === "malformed") {
    return {
      name: "graph-json-shape",
      status: "fail",
      detail: `${relativePath} is malformed`,
    };
  }

  if (!isGraphArtifact(parsed.value)) {
    return {
      name: "graph-json-shape",
      status: "fail",
      detail: `${relativePath} is incomplete`,
    };
  }

  if (parsed.value.nodeCount !== parsed.value.nodes.length) {
    return {
      name: "graph-json-shape",
      status: "fail",
      detail: `${relativePath} nodeCount does not match nodes length`,
    };
  }

  if (parsed.value.edgeCount !== parsed.value.edges.length) {
    return {
      name: "graph-json-shape",
      status: "fail",
      detail: `${relativePath} edgeCount does not match edges length`,
    };
  }

  return {
    name: "graph-json-shape",
    status: "pass",
    detail: `${relativePath} has ${parsed.value.nodeCount} node(s) and ${parsed.value.edgeCount} edge(s)`,
  };
}

async function graphSummaryCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/graph/repo-graph.json";
  const parsed = await parseJsonFile(path.join(cwd, relativePath));

  if (parsed.status === "missing") {
    return {
      name: "graph-summary",
      status: "warn",
      detail: `${relativePath} is missing; graph summary not checked`,
    };
  }

  if (parsed.status === "malformed" || !isGraphArtifact(parsed.value)) {
    return {
      name: "graph-summary",
      status: "fail",
      detail: `${relativePath} summary fields are unavailable`,
    };
  }

  return {
    name: "graph-summary",
    status: parsed.value.detectors.length > 0 ? "pass" : "warn",
    detail:
      parsed.value.detectors.length > 0
        ? `${parsed.value.detectors.length} detector(s), ${Object.keys(parsed.value.relationKindCounts).length} relation kind(s)`
        : "No graph detectors are recorded",
  };
}

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

async function memoryStoresCheck(cwd: string): Promise<DoctorCheck> {
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

async function memoryContextGateCheck(cwd: string): Promise<DoctorCheck> {
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

function isCurrentRunPointer(value: unknown): value is {
  schemaVersion: number;
  taskId: string;
  runDir: string;
  tracePath: string;
  taskContractPath: string;
  contextPackagePath: string;
  graphArtifactPath: string;
  verifyResultPath: string;
  handoffPath: string;
  doctorResultPath: string;
  evalResultPath: string;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const stringKeys = [
    "taskId",
    "runDir",
    "tracePath",
    "taskContractPath",
    "contextPackagePath",
    "graphArtifactPath",
    "verifyResultPath",
    "handoffPath",
    "doctorResultPath",
    "evalResultPath",
  ];

  return (
    candidate.schemaVersion === 1 && stringKeys.every((key) => typeof candidate[key] === "string")
  );
}

function isRunMetadata(value: unknown, taskId: string): boolean {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    value.taskId === taskId &&
    typeof value.startedAt === "string" &&
    typeof value.lastEventAt === "string" &&
    Array.isArray(value.events) &&
    isRecord(value.artifactPaths) &&
    value.current === true
  );
}

async function currentRunCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/current/run.json";
  const filePath = path.join(cwd, relativePath);

  if (!(await pathExists(filePath))) {
    return {
      name: "current-run",
      status: "warn",
      detail: `${relativePath} is missing`,
    };
  }

  let pointer: unknown;
  try {
    pointer = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch {
    return {
      name: "current-run",
      status: "fail",
      detail: `${relativePath} is malformed`,
    };
  }

  if (!isCurrentRunPointer(pointer)) {
    return {
      name: "current-run",
      status: "fail",
      detail: `${relativePath} is incomplete`,
    };
  }

  const taskContract = await readJson<{ id?: string }>(
    path.join(cwd, ".krn", "current", "task-contract.json"),
  );

  if (taskContract?.id && pointer.taskId !== taskContract.id) {
    return {
      name: "current-run",
      status: "fail",
      detail: `${relativePath} taskId does not match current task contract`,
    };
  }

  return {
    name: "current-run",
    status: "pass",
    detail: `${relativePath} points to ${pointer.runDir}`,
  };
}

async function runTraceCheck(cwd: string): Promise<DoctorCheck> {
  const taskContract = await readJson<{ id?: string }>(
    path.join(cwd, ".krn", "current", "task-contract.json"),
  );

  if (!taskContract?.id) {
    return {
      name: "run-trace",
      status: "pass",
      detail: "No current task; run trace check skipped",
    };
  }

  const traceRelativePath = `.krn/runs/${taskContract.id}/trace.jsonl`;
  const metadataRelativePath = `.krn/runs/${taskContract.id}/run.json`;
  const parsedMetadata = await parseJsonFile(path.join(cwd, metadataRelativePath));

  if (parsedMetadata.status === "malformed") {
    return {
      name: "run-trace",
      status: "fail",
      detail: `${metadataRelativePath} is malformed`,
    };
  }

  if (parsedMetadata.status === "parsed" && !isRunMetadata(parsedMetadata.value, taskContract.id)) {
    return {
      name: "run-trace",
      status: "fail",
      detail: `${metadataRelativePath} is incomplete`,
    };
  }

  if (!(await pathExists(path.join(cwd, traceRelativePath)))) {
    return {
      name: "run-trace",
      status: "warn",
      detail: `${traceRelativePath} is missing`,
    };
  }

  if (parsedMetadata.status === "missing") {
    return {
      name: "run-trace",
      status: "warn",
      detail: `${metadataRelativePath} is missing`,
    };
  }

  return {
    name: "run-trace",
    status: "pass",
    detail: `${traceRelativePath} is present`,
  };
}

async function configCheck(cwd: string): Promise<DoctorCheck> {
  try {
    const loaded = await loadConfig(cwd);
    return {
      name: "config",
      status: loaded.source === "file" ? "pass" : "warn",
      detail:
        loaded.source === "file"
          ? `${path.relative(cwd, loaded.path ?? "krn.config.json")} is valid`
          : "krn.config.json is missing; default config is active",
    };
  } catch (error) {
    return {
      name: "config",
      status: "fail",
      detail: error instanceof Error ? error.message : "krn.config.json is invalid",
    };
  }
}

async function sourceTreeCheck(
  cwd: string,
  input: { name: string; paths: string[] },
): Promise<DoctorCheck> {
  const source = await isHarnessSource(cwd);
  const missing = [];

  for (const relativePath of input.paths) {
    if (!(await pathExists(path.join(cwd, relativePath)))) {
      missing.push(relativePath);
    }
  }

  if (missing.length === 0) {
    return {
      name: input.name,
      status: "pass",
      detail: `${input.paths.length} source path(s) are present`,
    };
  }

  return {
    name: input.name,
    status: source ? "fail" : "warn",
    detail: source
      ? `Missing source path(s): ${missing.join(", ")}`
      : "Not running inside the krn-harness source tree; source-only check skipped",
  };
}

export async function runDoctor(cwd = process.cwd()): Promise<DoctorResult> {
  const currentDir = path.join(cwd, ".krn", "current");
  const tracePath = path.join(cwd, ".krn", "traces", "trace.jsonl");
  const contextPackage = await readJson<{ stop?: boolean; stopReason?: string }>(
    path.join(currentDir, "context-package.json"),
  );

  const checks: DoctorCheck[] = [
    await configCheck(cwd),
    artifactCheck(
      "current-task-contract",
      await pathExists(path.join(currentDir, "task-contract.json")),
      ".krn/current/task-contract.json",
    ),
    await currentRunCheck(cwd),
    artifactCheck(
      "current-context-package",
      await pathExists(path.join(currentDir, "context-package.json")),
      ".krn/current/context-package.json",
    ),
    {
      name: "context-stop",
      status: contextPackage === undefined || contextPackage.stop ? "warn" : "pass",
      detail:
        contextPackage === undefined
          ? "No current context package is available"
          : contextPackage.stop
            ? (contextPackage.stopReason ?? "Current context package reports STOP")
            : "Current context package does not report STOP",
    },
    artifactCheck(
      "current-verify-result",
      await pathExists(path.join(currentDir, "verify-result.json")),
      ".krn/current/verify-result.json",
    ),
    artifactCheck(
      "current-handoff",
      await pathExists(path.join(currentDir, "handoff.md")),
      ".krn/current/handoff.md",
    ),
    await memoryStoresCheck(cwd),
    await memoryContextGateCheck(cwd),
    artifactCheck(
      "graph-json",
      await pathExists(path.join(cwd, ".krn", "graph", "repo-graph.json")),
      ".krn/graph/repo-graph.json",
    ),
    artifactCheck(
      "graph-markdown",
      await pathExists(path.join(cwd, ".krn", "graph", "repo-graph.md")),
      ".krn/graph/repo-graph.md",
    ),
    await graphJsonShapeCheck(cwd),
    await graphSummaryCheck(cwd),
    artifactCheck("downstream-agents", await pathExists(path.join(cwd, "AGENTS.md")), "AGENTS.md"),
    artifactCheck(
      "downstream-runtime-skill",
      await pathExists(path.join(cwd, ".agents", "skills", "krn-harness", "SKILL.md")),
      ".agents/skills/krn-harness/SKILL.md",
    ),
    artifactCheck(
      "downstream-hooks-template",
      await pathExists(path.join(cwd, ".codex", "hooks.json")),
      ".codex/hooks.json",
    ),
    await sourceTreeCheck(cwd, {
      name: "adapter-templates",
      paths: [
        "packages/codex-adapter/src/templates/AGENTS.md.tmpl",
        "packages/codex-adapter/src/templates/hooks.json.tmpl",
        "packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl",
      ],
    }),
    await sourceTreeCheck(cwd, {
      name: "build-time-skills",
      paths: [
        ".agents/skills/buduj/SKILL.md",
        ".agents/skills/pilnuj/SKILL.md",
        ".agents/skills/wycinek/SKILL.md",
        ".agents/skills/handoff/SKILL.md",
      ],
    }),
    await runTraceCheck(cwd),
    artifactCheck("global-trace", await pathExists(tracePath), ".krn/traces/trace.jsonl"),
  ];

  return {
    status: deriveStatus(checks),
    checks,
    nextActions: nextActionsFor(checks),
  };
}

export function renderDoctorResultMarkdown(result: DoctorResult): string {
  const lines = ["# KRN Doctor Result", "", `Status: ${result.status}`, "", "## Checks", ""];

  for (const check of result.checks) {
    lines.push(`- ${check.name}: ${check.status} - ${check.detail}`);
  }

  lines.push("", "## Next Actions", "");
  lines.push(
    ...(result.nextActions.length > 0
      ? result.nextActions.map((action) => `- ${action}`)
      : ["- none"]),
  );

  lines.push("");
  return lines.join("\n");
}
