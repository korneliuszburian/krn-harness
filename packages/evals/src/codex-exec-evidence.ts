import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const metricsSchema = "krn-codex-exec-metrics-v1" as const;

export const codexExecEvidenceKinds = [
  "real_codex_exec",
  "fixture_codex_exec",
  "manual_import",
] as const;

export type CodexExecEvidenceKind = (typeof codexExecEvidenceKinds)[number];

export const codexExecEvidenceStatuses = ["completed", "failed", "blocked", "unknown"] as const;
export type CodexExecEvidenceStatus = (typeof codexExecEvidenceStatuses)[number];

export const codexExecSandboxModes = [
  "read-only",
  "workspace-write",
  "danger-full-access",
  "unknown",
] as const;
export type CodexExecSandboxMode = (typeof codexExecSandboxModes)[number];

export const codexExecAdherenceKeys = [
  "used_runtime_skill",
  "read_workflow_reference",
  "used_pinned_krn",
  "ran_krn_status",
  "ran_krn_start_full_intent",
  "ran_krn_graph",
  "ran_krn_context",
  "read_task_contract",
  "read_context_package",
  "respected_stop",
  "ran_verify",
  "ran_handoff",
] as const;

export type CodexExecAdherenceKey = (typeof codexExecAdherenceKeys)[number];
export type CodexExecAdherence = Record<CodexExecAdherenceKey, boolean | null>;

export const requiredCodexExecEvidenceFiles = [
  "README.md",
  "prompt.redacted.md",
  "command.redacted.txt",
  "final-message.md",
  "metrics.json",
  "events.redacted.jsonl",
  "command-events.json",
  "file-events.json",
  "krn-adherence.json",
  "krn-artifacts.md",
  "diffstat.txt",
  "verdict.md",
] as const;

export interface CodexExecUsage {
  input_tokens: number | null;
  cached_input_tokens: number | null;
  output_tokens: number | null;
  reasoning_output_tokens: number | null;
}

export interface CodexExecCommandSummary {
  total: number;
  krn_commands: number;
  verify_commands: number;
  blocked_or_failed: number;
}

export interface CodexExecMetrics {
  schema: typeof metricsSchema;
  run_id: string;
  kind: CodexExecEvidenceKind;
  target_repo: string;
  target_commit: string | null;
  krn_source_commit: string;
  codex_mode: "exec";
  sandbox: CodexExecSandboxMode;
  status: CodexExecEvidenceStatus;
  started_at: string | null;
  duration_seconds: number | null;
  usage: CodexExecUsage;
  event_counts: Record<string, number>;
  command_summary: CodexExecCommandSummary;
  krn_adherence: CodexExecAdherence;
  proof_boundaries: {
    production_proof: false;
    hook_trust: "unproven" | "proven" | "not_checked";
    raw_jsonl_committed: false;
    sanitized: true;
  };
}

export interface CodexExecEvent {
  line: number;
  type: string;
  raw: Record<string, unknown>;
}

export interface CodexExecCommandEvent {
  id: string | null;
  command: string;
  status: "started" | "completed" | "failed" | "unknown";
  exit_code: number | null;
  event_types: string[];
  is_krn_command: boolean;
  is_verify_command: boolean;
}

export interface CodexExecFileEvent {
  path: string;
  action: "read" | "write" | "unknown";
  event_type: string;
}

export interface CodexExecEvidencePack {
  metrics: CodexExecMetrics;
  events: Array<Record<string, unknown>>;
  commandEvents: CodexExecCommandEvent[];
  fileEvents: CodexExecFileEvent[];
  files: Record<(typeof requiredCodexExecEvidenceFiles)[number], string>;
}

export interface SummarizeCodexExecRunInput {
  rawJsonl: string;
  finalMessage: string;
  runId: string;
  kind: CodexExecEvidenceKind;
  targetRepo: string;
  targetCommit: string;
  krnSourceCommit: string;
  promptText?: string | undefined;
  commandText?: string | undefined;
  sandbox?: CodexExecSandboxMode | undefined;
}

export interface WriteCodexExecEvidencePackInput extends SummarizeCodexExecRunInput {
  outDir: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidKind(value: string): value is CodexExecEvidenceKind {
  return codexExecEvidenceKinds.includes(value as CodexExecEvidenceKind);
}

function isValidStatus(value: unknown): value is CodexExecEvidenceStatus {
  return (
    typeof value === "string" &&
    codexExecEvidenceStatuses.includes(value as CodexExecEvidenceStatus)
  );
}

function isValidSandbox(value: unknown): value is CodexExecSandboxMode {
  return typeof value === "string" && codexExecSandboxModes.includes(value as CodexExecSandboxMode);
}

function readPath(value: Record<string, unknown>, keys: string[]): unknown {
  let current: unknown = value;
  for (const key of keys) {
    if (!isRecord(current)) return undefined;
    current = current[key];
  }
  return current;
}

function firstString(value: Record<string, unknown>, keyPaths: string[][]): string | undefined {
  for (const keyPath of keyPaths) {
    const candidate = readPath(value, keyPath);
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }
  return undefined;
}

function eventType(value: Record<string, unknown>): string {
  return (
    firstString(value, [["type"], ["event"], ["name"], ["msg", "type"], ["message", "type"]]) ??
    "unknown"
  );
}

export function parseCodexExecJsonl(rawJsonl: string): CodexExecEvent[] {
  return rawJsonl.split(/\r?\n/).flatMap((line, index) => {
    const trimmed = line.trim();
    if (trimmed.length === 0) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Malformed Codex JSONL line ${index + 1}: ${message}`);
    }

    if (!isRecord(parsed)) {
      throw new Error(`Malformed Codex JSONL line ${index + 1}: expected JSON object`);
    }

    return [{ line: index + 1, type: eventType(parsed), raw: parsed }];
  });
}

export function redactText(input: string): string {
  return input
    .replace(/\bBearer\s+[A-Za-z0-9._~+/-]{10,}/g, "Bearer <redacted>")
    .replace(/\bsk-[A-Za-z0-9_-]{10,}/g, "<redacted-secret>")
    .replace(
      /\b([A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|AUTH)[A-Z0-9_]*)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s,;]+)/g,
      "$1=<redacted>",
    )
    .replace(
      /"([A-Z][A-Z0-9_]*(?:API_KEY|TOKEN|SECRET|PASSWORD|AUTH)[A-Z0-9_]*)"\s*:\s*"[^"]*"/g,
      '"$1":"<redacted>"',
    )
    .replace(/\/home\/[A-Za-z0-9._-]+(?=\/|\b)/g, "<home>")
    .replace(/\/Users\/[A-Za-z0-9._-]+(?=\/|\b)/g, "<home>")
    .replace(/\/tmp\/[A-Za-z0-9._/-]+/g, "<tmp>")
    .replace(/(^|[\n\r\\/])\.env(?:\.[A-Za-z0-9._-]+)?\b/g, "$1<env-file>")
    .replace(/\bauth\.json\b/g, "<auth-file>")
    .replace(/\bcredentials\.json\b/g, "<credentials-file>");
}

export function assertRawJsonlSafeForEvidence(rawJsonl: string): void {
  const forbidden: string[] = [];

  if (/(^|[^A-Za-z0-9_-])\.env(?:\.[A-Za-z0-9._-]+)?\b/i.test(rawJsonl)) {
    forbidden.push(".env reference");
  }
  if (/\b(auth|credentials)\.json\b/i.test(rawJsonl)) {
    forbidden.push("auth file reference");
  }
  if (
    /\b(?:OPENAI_API_KEY|CODEX_API_KEY|API_KEY|TOKEN|SECRET|PASSWORD)\s*[:=]\s*["']?[^"'\s,;]{6,}/i.test(
      rawJsonl,
    ) ||
    /\bBearer\s+[A-Za-z0-9._~+/-]{10,}/i.test(rawJsonl) ||
    /\bsk-[A-Za-z0-9_-]{10,}/i.test(rawJsonl)
  ) {
    forbidden.push("secret-like value");
  }

  if (forbidden.length > 0) {
    throw new Error(`Raw Codex JSONL is unsafe for committed evidence: ${forbidden.join(", ")}`);
  }
}

function collectStrings(value: unknown, output: string[], depth = 0): void {
  if (depth > 8) return;
  if (typeof value === "string") {
    output.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, output, depth + 1);
    return;
  }
  if (isRecord(value)) {
    for (const item of Object.values(value)) collectStrings(item, output, depth + 1);
  }
}

function allEventText(events: CodexExecEvent[]): string {
  const strings: string[] = [];
  for (const event of events) collectStrings(event.raw, strings);
  return strings.join("\n");
}

function findFirstRecordByKey(
  value: unknown,
  key: string,
  depth = 0,
): Record<string, unknown> | null {
  if (depth > 8) return null;
  if (isRecord(value)) {
    const candidate = value[key];
    if (isRecord(candidate)) return candidate;
    for (const item of Object.values(value)) {
      const found = findFirstRecordByKey(item, key, depth + 1);
      if (found) return found;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstRecordByKey(item, key, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function firstNumber(value: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === "number" && Number.isFinite(candidate)) return candidate;
  }
  return null;
}

export function extractUsage(events: CodexExecEvent[]): CodexExecUsage {
  const usageEvent = [...events].reverse().find((event) => event.type === "turn.completed");
  const usage = usageEvent ? findFirstRecordByKey(usageEvent.raw, "usage") : null;
  const inputDetails =
    usage && (isRecord(usage.input_token_details) || isRecord(usage.inputTokensDetails))
      ? ((usage.input_token_details ?? usage.inputTokensDetails) as Record<string, unknown>)
      : null;
  const outputDetails =
    usage && (isRecord(usage.output_token_details) || isRecord(usage.outputTokensDetails))
      ? ((usage.output_token_details ?? usage.outputTokensDetails) as Record<string, unknown>)
      : null;

  return {
    input_tokens: usage ? firstNumber(usage, ["input_tokens", "inputTokens"]) : null,
    cached_input_tokens:
      usage?.cached_input_tokens && typeof usage.cached_input_tokens === "number"
        ? usage.cached_input_tokens
        : ((inputDetails && firstNumber(inputDetails, ["cached_tokens", "cachedTokens"])) ?? null),
    output_tokens: usage ? firstNumber(usage, ["output_tokens", "outputTokens"]) : null,
    reasoning_output_tokens:
      usage?.reasoning_output_tokens && typeof usage.reasoning_output_tokens === "number"
        ? usage.reasoning_output_tokens
        : ((outputDetails && firstNumber(outputDetails, ["reasoning_tokens", "reasoningTokens"])) ??
          null),
  };
}

function commandId(raw: Record<string, unknown>): string | null {
  return firstString(raw, [["item", "id"], ["id"], ["item_id"], ["call_id"]]) ?? null;
}

function findStringByKey(value: unknown, keys: Set<string>, depth = 0): string | null {
  if (depth > 8) return null;
  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (keys.has(key) && typeof item === "string" && item.trim().length > 0) {
        return item.trim();
      }
      if (keys.has(key) && Array.isArray(item) && item.every((part) => typeof part === "string")) {
        return item.join(" ").trim();
      }
    }
    for (const item of Object.values(value)) {
      const found = findStringByKey(item, keys, depth + 1);
      if (found) return found;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringByKey(item, keys, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function extractCommandText(raw: Record<string, unknown>): string | null {
  const direct = findStringByKey(
    raw,
    new Set(["command", "cmd", "command_text", "commandText", "shell_command"]),
  );
  if (direct) return redactText(direct);

  const textValues: string[] = [];
  collectStrings(raw, textValues);
  const commandLike = textValues.find((value) =>
    /(^|\s)(?:\.\/)?(?:\.krn\/bin\/krn|krn)\s+/.test(value),
  );
  return commandLike ? redactText(commandLike) : null;
}

function findExitCode(value: unknown, depth = 0): number | null {
  if (depth > 8) return null;
  if (isRecord(value)) {
    for (const key of ["exit_code", "exitCode", "status_code", "statusCode"]) {
      const candidate = value[key];
      if (typeof candidate === "number" && Number.isInteger(candidate)) return candidate;
    }
    for (const item of Object.values(value)) {
      const found = findExitCode(item, depth + 1);
      if (found !== null) return found;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findExitCode(item, depth + 1);
      if (found !== null) return found;
    }
  }
  return null;
}

function commandStatus(
  event: CodexExecEvent,
  exitCode: number | null,
): CodexExecCommandEvent["status"] {
  if (exitCode !== null && exitCode !== 0) return "failed";
  if (/failed|error/.test(event.type)) return "failed";
  if (/completed|finished/.test(event.type)) return "completed";
  if (/started|created/.test(event.type)) return "started";
  return "unknown";
}

function invokesKrn(command: string): boolean {
  return (
    /(^|\s)(?:\.\/)?(?:\.krn\/bin\/krn|krn)\b/.test(command) || /\/\.krn\/bin\/krn\b/.test(command)
  );
}

function invokesKrnSubcommand(command: string, subcommand: string): boolean {
  const escaped = subcommand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `(^|[\\s"'])(?:\\.\\/)?(?:\\.krn\\/bin\\/krn|krn|[^\\s]*\\/\\.krn\\/bin\\/krn)\\s+${escaped}(?=$|[\\s"'])`,
  ).test(command);
}

function isPinnedKrnCommand(command: string): boolean {
  return /(^|\s)(?:\.\/)?\.krn\/bin\/krn\b/.test(command) || /\/\.krn\/bin\/krn\b/.test(command);
}

function commandEventKey(id: string | null, command: string, index: number): string {
  return id ?? `${index}:${command}`;
}

export function extractCommandEvents(events: CodexExecEvent[]): CodexExecCommandEvent[] {
  const byKey = new Map<string, CodexExecCommandEvent>();

  events.forEach((event, index) => {
    const command = extractCommandText(event.raw);
    const id = commandId(event.raw);
    const exitCode = findExitCode(event.raw);
    const key = command ? commandEventKey(id, command, index) : id;
    if (!key) return;

    const existing = byKey.get(key);
    if (!command && !existing) return;

    const mergedCommand = command ?? existing?.command ?? "";
    const nextStatus = commandStatus(event, exitCode);
    const eventTypes = new Set(existing?.event_types ?? []);
    eventTypes.add(event.type);

    byKey.set(key, {
      id,
      command: mergedCommand,
      status: nextStatus === "unknown" ? (existing?.status ?? "unknown") : nextStatus,
      exit_code: exitCode ?? existing?.exit_code ?? null,
      event_types: [...eventTypes].sort(),
      is_krn_command: invokesKrn(mergedCommand),
      is_verify_command: /\bverify\b/.test(mergedCommand),
    });
  });

  return [...byKey.values()].filter((event) => event.command.length > 0);
}

function normalizeEvidencePath(value: string): string | null {
  const cleaned = redactText(value)
    .replace(/^\.?\//, "")
    .replace(/[),.;:'"`\]]+$/g, "");

  if (cleaned === ".krn/bin/krn" || cleaned.endsWith("/.krn/bin/krn")) return null;
  return cleaned.length > 0 ? cleaned : null;
}

function extractPathsFromText(value: string): string[] {
  const matches =
    value.match(
      /(?:\.\/)?(?:\.agents|\.krn|docs|packages|scripts|src|fixtures|README\.md)[A-Za-z0-9._/:-]*/g,
    ) ?? [];
  return matches.flatMap((item) => {
    const normalized = normalizeEvidencePath(item);
    return normalized ? [normalized] : [];
  });
}

function eventAction(event: CodexExecEvent, text: string): CodexExecFileEvent["action"] {
  if (/file.*(change|edit|write)|patch|apply_patch|updated|created/.test(event.type))
    return "write";
  if (/(^|[\s"'])(cat|sed|nl|head|tail|rg|grep|less)\s+/.test(text)) return "read";
  if (/\bfile_read\b/.test(text)) return "read";
  if (/read/.test(event.type)) return "read";
  return "unknown";
}

export function extractFileEvents(events: CodexExecEvent[]): CodexExecFileEvent[] {
  const found = new Map<string, CodexExecFileEvent>();

  for (const event of events) {
    const strings: string[] = [];
    collectStrings(event.raw, strings);
    const text = strings.join("\n");
    const action = eventAction(event, text);

    for (const extractedPath of extractPathsFromText(text)) {
      const key = `${extractedPath}:${action}:${event.type}`;
      found.set(key, { path: extractedPath, action, event_type: event.type });
    }
  }

  return [...found.values()].sort((left, right) => left.path.localeCompare(right.path));
}

function eventCounts(events: CodexExecEvent[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const event of events) counts[event.type] = (counts[event.type] ?? 0) + 1;
  return counts;
}

function evidenceBoolean(value: boolean): boolean {
  return value;
}

function commandRan(commandEvents: CodexExecCommandEvent[], subcommand: string): boolean | null {
  return commandEvents.some((event) => invokesKrnSubcommand(event.command, subcommand))
    ? true
    : null;
}

function startIntentIsFull(command: string): boolean {
  const match = command.match(
    /(?:^|\s)(?:\.\/)?(?:\.krn\/bin\/krn|krn|[^\s]*\/\.krn\/bin\/krn)\s+start\s+(.+)$/u,
  );
  const rawIntent = match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? "";
  const words = rawIntent.split(/\s+/).filter(Boolean);
  return rawIntent.length >= 30 && words.length >= 5 && /[A-Za-z].*\s+.*[A-Za-z]/.test(rawIntent);
}

function pathWasRead(fileEvents: CodexExecFileEvent[], suffix: string): boolean | null {
  return fileEvents.some((event) => event.action === "read" && event.path.endsWith(suffix))
    ? true
    : null;
}

export function detectKrnAdherence(input: {
  commandEvents: CodexExecCommandEvent[];
  fileEvents: CodexExecFileEvent[];
  finalMessage: string;
  eventText: string;
}): CodexExecAdherence {
  const krnCommands = input.commandEvents.filter((event) => invokesKrn(event.command));
  const hasGlobalKrnWithoutPinned =
    krnCommands.length > 0 && !krnCommands.some((event) => isPinnedKrnCommand(event.command));
  const stopMentioned = /\bSTOP\b/.test(`${input.eventText}\n${input.finalMessage}`);
  const stopChecked =
    /\bSTOP\b.*\b(checked|not active|none|no active|absent)\b/i.test(input.finalMessage) ||
    /\bSTOP:\s*false\b/i.test(`${input.eventText}\n${input.finalMessage}`);

  return {
    used_runtime_skill: pathWasRead(input.fileEvents, ".agents/skills/krn-harness/SKILL.md"),
    read_workflow_reference: pathWasRead(
      input.fileEvents,
      ".agents/skills/krn-harness/references/workflow.md",
    ),
    used_pinned_krn: krnCommands.some((event) => isPinnedKrnCommand(event.command))
      ? true
      : hasGlobalKrnWithoutPinned
        ? false
        : null,
    ran_krn_status: commandRan(input.commandEvents, "status"),
    ran_krn_start_full_intent: input.commandEvents.some((event) => startIntentIsFull(event.command))
      ? true
      : null,
    ran_krn_graph: commandRan(input.commandEvents, "graph"),
    ran_krn_context: commandRan(input.commandEvents, "context"),
    read_task_contract: pathWasRead(input.fileEvents, ".krn/current/task-contract.md"),
    read_context_package: pathWasRead(input.fileEvents, ".krn/current/context-package.md"),
    respected_stop: stopChecked ? true : stopMentioned ? null : evidenceBoolean(true),
    ran_verify: commandRan(input.commandEvents, "verify"),
    ran_handoff: commandRan(input.commandEvents, "handoff"),
  };
}

function detectStatus(events: CodexExecEvent[]): CodexExecEvidenceStatus {
  if (events.some((event) => event.type === "turn.failed" || event.type === "error")) {
    return "failed";
  }
  if (events.some((event) => event.type === "turn.completed")) return "completed";
  return "unknown";
}

function startedAt(events: CodexExecEvent[]): string | null {
  for (const event of events) {
    const timestamp = firstString(event.raw, [["timestamp"], ["created_at"], ["time"]]);
    if (timestamp) return timestamp;
  }
  return null;
}

function durationSeconds(events: CodexExecEvent[]): number | null {
  const completed = [...events].reverse().find((event) => event.type === "turn.completed");
  if (!completed) return null;
  const seconds = firstNumber(completed.raw, ["duration_seconds", "durationSeconds"]);
  if (seconds !== null) return seconds;
  const millis = firstNumber(completed.raw, ["duration_ms", "durationMs"]);
  return millis === null ? null : millis / 1000;
}

function sanitizedEvent(event: CodexExecEvent): Record<string, unknown> {
  const command = extractCommandText(event.raw);
  const paths = extractPathsFromText(allEventText([event]));
  const usage = event.type === "turn.completed" ? extractUsage([event]) : undefined;
  return {
    line: event.line,
    type: event.type,
    ...(command ? { command } : {}),
    ...(paths.length > 0 ? { paths } : {}),
    ...(usage ? { usage } : {}),
  };
}

function commandSummary(commandEvents: CodexExecCommandEvent[]): CodexExecCommandSummary {
  return {
    total: commandEvents.length,
    krn_commands: commandEvents.filter((event) => event.is_krn_command).length,
    verify_commands: commandEvents.filter((event) => event.is_verify_command).length,
    blocked_or_failed: commandEvents.filter(
      (event) => event.status === "failed" || (event.exit_code !== null && event.exit_code !== 0),
    ).length,
  };
}

function renderReadme(metrics: CodexExecMetrics): string {
  return [
    "# Codex Exec Evidence Pack",
    "",
    `Run id: ${metrics.run_id}`,
    `Kind: ${metrics.kind}`,
    `Target repo: ${metrics.target_repo}`,
    `Status: ${metrics.status}`,
    "",
    "This pack is sanitized evidence derived from Codex exec JSONL.",
    "Raw JSONL, raw diffs, secrets, and protected target data are not part of this committed pack.",
    "",
  ].join("\n");
}

function renderKrnArtifacts(metrics: CodexExecMetrics): string {
  return [
    "# KRN Artifacts",
    "",
    `Task contract read: ${String(metrics.krn_adherence.read_task_contract)}`,
    `Context package read: ${String(metrics.krn_adherence.read_context_package)}`,
    `Verify run: ${String(metrics.krn_adherence.ran_verify)}`,
    `Handoff run: ${String(metrics.krn_adherence.ran_handoff)}`,
    "",
  ].join("\n");
}

function renderVerdict(metrics: CodexExecMetrics): string {
  const proofKind =
    metrics.kind === "fixture_codex_exec"
      ? "Fixture only. This validates parser/adherence/evidence-pack shape."
      : metrics.kind === "real_codex_exec"
        ? "Real local Codex exec evidence. This is still local evidence only."
        : "Manual import. Treat as operator-imported local evidence.";

  return [
    "# Verdict",
    "",
    proofKind,
    "",
    `Status: ${metrics.status}`,
    `Production proof: ${String(metrics.proof_boundaries.production_proof)}`,
    `Hook trust: ${metrics.proof_boundaries.hook_trust}`,
    `Raw JSONL committed: ${String(metrics.proof_boundaries.raw_jsonl_committed)}`,
    "",
  ].join("\n");
}

export function summarizeCodexExecRun(input: SummarizeCodexExecRunInput): CodexExecEvidencePack {
  assertRawJsonlSafeForEvidence(input.rawJsonl);
  const events = parseCodexExecJsonl(input.rawJsonl);
  const commandEvents = extractCommandEvents(events);
  const fileEvents = extractFileEvents(events);
  const eventText = allEventText(events);
  const metrics: CodexExecMetrics = {
    schema: metricsSchema,
    run_id: input.runId,
    kind: input.kind,
    target_repo: input.targetRepo,
    target_commit: input.targetCommit === "unknown" ? null : input.targetCommit,
    krn_source_commit: input.krnSourceCommit,
    codex_mode: "exec",
    sandbox: input.sandbox ?? "unknown",
    status: detectStatus(events),
    started_at: startedAt(events),
    duration_seconds: durationSeconds(events),
    usage: extractUsage(events),
    event_counts: eventCounts(events),
    command_summary: commandSummary(commandEvents),
    krn_adherence: detectKrnAdherence({
      commandEvents,
      fileEvents,
      finalMessage: input.finalMessage,
      eventText,
    }),
    proof_boundaries: {
      production_proof: false,
      hook_trust: "unproven",
      raw_jsonl_committed: false,
      sanitized: true,
    },
  };
  const sanitizedEvents = events.map(sanitizedEvent);
  const diffstat =
    fileEvents
      .filter((event) => event.action === "write")
      .map((event) => event.path)
      .join("\n") || "not captured\n";
  const files: CodexExecEvidencePack["files"] = {
    "README.md": renderReadme(metrics),
    "prompt.redacted.md": `${redactText(input.promptText ?? "not provided")}\n`,
    "command.redacted.txt": `${redactText(input.commandText ?? "not provided")}\n`,
    "final-message.md": `${redactText(input.finalMessage)}\n`,
    "metrics.json": `${JSON.stringify(metrics, null, 2)}\n`,
    "events.redacted.jsonl": sanitizedEvents
      .map((event) => JSON.stringify(event))
      .join("\n")
      .concat("\n"),
    "command-events.json": `${JSON.stringify(commandEvents, null, 2)}\n`,
    "file-events.json": `${JSON.stringify(fileEvents, null, 2)}\n`,
    "krn-adherence.json": `${JSON.stringify(metrics.krn_adherence, null, 2)}\n`,
    "krn-artifacts.md": renderKrnArtifacts(metrics),
    "diffstat.txt": diffstat,
    "verdict.md": renderVerdict(metrics),
  };

  return { metrics, events: sanitizedEvents, commandEvents, fileEvents, files };
}

export async function writeCodexExecEvidencePack(
  input: WriteCodexExecEvidencePackInput,
): Promise<CodexExecEvidencePack> {
  const pack = summarizeCodexExecRun(input);
  await mkdir(input.outDir, { recursive: true });
  for (const file of requiredCodexExecEvidenceFiles) {
    await writeFile(path.join(input.outDir, file), pack.files[file], "utf8");
  }
  return pack;
}

function hasNumberOrNull(value: unknown): boolean {
  return value === null || (typeof value === "number" && Number.isFinite(value));
}

function hasBooleanOrNull(value: unknown): boolean {
  return value === null || typeof value === "boolean";
}

function validateRecord(
  value: unknown,
  pathName: string,
  issues: string[],
): Record<string, unknown> {
  if (!isRecord(value)) {
    issues.push(`${pathName} must be an object`);
    return {};
  }
  return value;
}

export function validateCodexExecMetrics(value: unknown): string[] {
  const issues: string[] = [];
  const metrics = validateRecord(value, "metrics", issues);
  const usage = validateRecord(metrics.usage, "usage", issues);
  const command = validateRecord(metrics.command_summary, "command_summary", issues);
  const adherence = validateRecord(metrics.krn_adherence, "krn_adherence", issues);
  const proof = validateRecord(metrics.proof_boundaries, "proof_boundaries", issues);

  if (metrics.schema !== metricsSchema) issues.push("schema must be krn-codex-exec-metrics-v1");
  if (typeof metrics.run_id !== "string" || metrics.run_id.length === 0) {
    issues.push("run_id must be a non-empty string");
  }
  if (typeof metrics.kind !== "string" || !isValidKind(metrics.kind)) {
    issues.push("kind must be a supported evidence kind");
  }
  if (typeof metrics.target_repo !== "string" || metrics.target_repo.length === 0) {
    issues.push("target_repo must be a non-empty string");
  }
  if (!(typeof metrics.target_commit === "string" || metrics.target_commit === null)) {
    issues.push("target_commit must be string or null");
  }
  if (typeof metrics.krn_source_commit !== "string" || metrics.krn_source_commit.length === 0) {
    issues.push("krn_source_commit must be a non-empty string");
  }
  if (metrics.codex_mode !== "exec") issues.push("codex_mode must be exec");
  if (!isValidSandbox(metrics.sandbox)) issues.push("sandbox must be known enum value");
  if (!isValidStatus(metrics.status)) issues.push("status must be known enum value");
  if (!(typeof metrics.started_at === "string" || metrics.started_at === null)) {
    issues.push("started_at must be string or null");
  }
  if (!hasNumberOrNull(metrics.duration_seconds)) {
    issues.push("duration_seconds must be number or null");
  }

  for (const key of [
    "input_tokens",
    "cached_input_tokens",
    "output_tokens",
    "reasoning_output_tokens",
  ]) {
    if (!hasNumberOrNull(usage[key])) issues.push(`usage.${key} must be number or null`);
  }

  for (const key of ["total", "krn_commands", "verify_commands", "blocked_or_failed"]) {
    if (typeof command[key] !== "number") issues.push(`command_summary.${key} must be number`);
  }

  for (const key of codexExecAdherenceKeys) {
    if (!hasBooleanOrNull(adherence[key]))
      issues.push(`krn_adherence.${key} must be boolean or null`);
  }

  if (proof.production_proof !== false)
    issues.push("proof_boundaries.production_proof must be false");
  if (proof.raw_jsonl_committed !== false) {
    issues.push("proof_boundaries.raw_jsonl_committed must be false");
  }
  if (proof.sanitized !== true) issues.push("proof_boundaries.sanitized must be true");
  if (
    proof.hook_trust !== "unproven" &&
    proof.hook_trust !== "proven" &&
    proof.hook_trust !== "not_checked"
  ) {
    issues.push("proof_boundaries.hook_trust must be known enum value");
  }

  return issues;
}

async function findForbiddenRawFiles(dir: string): Promise<string[]> {
  const forbidden: string[] = [];
  async function walk(current: string): Promise<void> {
    for (const entry of await readdir(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (
        /(^|[.])raw[.]jsonl$/i.test(entry.name) ||
        entry.name === "events.raw.jsonl" ||
        entry.name === "patch.diff"
      ) {
        forbidden.push(path.relative(dir, fullPath));
      }
    }
  }

  await walk(dir);
  return forbidden;
}

export async function validateCodexExecEvidencePackDirectory(dir: string): Promise<string[]> {
  const issues: string[] = [];
  for (const file of requiredCodexExecEvidenceFiles) {
    try {
      await readFile(path.join(dir, file), "utf8");
    } catch {
      issues.push(`missing ${file}`);
    }
  }

  try {
    const metrics = JSON.parse(await readFile(path.join(dir, "metrics.json"), "utf8")) as unknown;
    issues.push(...validateCodexExecMetrics(metrics));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    issues.push(`metrics.json is not valid JSON: ${message}`);
  }

  try {
    const forbiddenRawFiles = await findForbiddenRawFiles(dir);
    for (const file of forbiddenRawFiles) {
      issues.push(`raw/local-only file must not be committed in evidence pack: ${file}`);
    }
  } catch {
    issues.push("evidence pack directory could not be scanned");
  }

  return issues;
}
