import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertRawJsonlSafeForEvidence,
  detectKrnAdherence,
  extractCommandEvents,
  extractFileEvents,
  extractUsage,
  parseCodexExecJsonl,
  redactText,
  requiredCodexExecEvidenceFiles,
  summarizeCodexExecRun,
  validateCodexExecEvidencePackDirectory,
  validateCodexExecMetrics,
  writeCodexExecEvidencePack,
} from "./codex-exec-evidence.js";

function jsonl(records: Array<Record<string, unknown>>): string {
  return records
    .map((record) => JSON.stringify(record))
    .join("\n")
    .concat("\n");
}

function commandStarted(id: string, command: string): Record<string, unknown> {
  return {
    type: "item.started",
    item: {
      id,
      type: "command_execution",
      command,
    },
  };
}

function commandCompleted(id: string, command: string, exitCode = 0): Record<string, unknown> {
  return {
    type: "item.completed",
    item: {
      id,
      type: "command_execution",
      command,
      exit_code: exitCode,
      stdout: "full stdout omitted by summarizer",
    },
  };
}

function fixtureRawJsonl(): string {
  return jsonl([
    { type: "thread.started", timestamp: "2026-06-17T00:00:00.000Z" },
    { type: "turn.started", timestamp: "2026-06-17T00:00:01.000Z" },
    {
      type: "item.completed",
      item: {
        id: "read-skill",
        type: "file_read",
        path: ".agents/skills/krn-harness/SKILL.md",
      },
    },
    {
      type: "item.completed",
      item: {
        id: "read-workflow",
        type: "file_read",
        path: ".agents/skills/krn-harness/references/workflow.md",
      },
    },
    commandStarted("cmd-1", "./.krn/bin/krn status"),
    commandCompleted("cmd-1", "./.krn/bin/krn status"),
    commandStarted(
      "cmd-2",
      './.krn/bin/krn start "Implement a small downstream runtime skill evidence task"',
    ),
    commandCompleted(
      "cmd-2",
      './.krn/bin/krn start "Implement a small downstream runtime skill evidence task"',
    ),
    commandCompleted("cmd-3", "./.krn/bin/krn graph"),
    commandCompleted("cmd-4", "./.krn/bin/krn context"),
    commandCompleted("cmd-5", "cat .krn/current/task-contract.md"),
    commandCompleted("cmd-6", "cat .krn/current/context-package.md"),
    commandCompleted("cmd-7", "./.krn/bin/krn verify --execute"),
    commandCompleted("cmd-8", "./.krn/bin/krn handoff"),
    {
      type: "turn.completed",
      duration_seconds: 12,
      usage: {
        input_tokens: 100,
        input_token_details: { cached_tokens: 25 },
        output_tokens: 50,
        output_token_details: { reasoning_tokens: 10 },
      },
    },
  ]);
}

describe("codex exec evidence parser", () => {
  it("parses known Codex JSONL event types and skips blank lines", () => {
    const events = parseCodexExecJsonl(
      `${jsonl([
        { type: "thread.started" },
        { type: "turn.started" },
        { type: "item.started" },
        { type: "item.completed" },
        { type: "turn.completed" },
        { type: "turn.failed" },
        { type: "error" },
      ])}\n  \n`,
    );

    expect(events.map((event) => event.type)).toEqual([
      "thread.started",
      "turn.started",
      "item.started",
      "item.completed",
      "turn.completed",
      "turn.failed",
      "error",
    ]);
  });

  it("fails malformed non-empty JSONL lines", () => {
    expect(() => parseCodexExecJsonl('{"type":"thread.started"}\n{not-json}\n')).toThrow(
      "Malformed Codex JSONL line 2",
    );
  });
});

describe("codex exec metrics extraction", () => {
  it("extracts token usage from turn.completed events", () => {
    const usage = extractUsage(parseCodexExecJsonl(fixtureRawJsonl()));

    expect(usage).toEqual({
      input_tokens: 100,
      cached_input_tokens: 25,
      output_tokens: 50,
      reasoning_output_tokens: 10,
    });
  });

  it("extracts command lifecycle events, exit codes, and failures", () => {
    const raw = jsonl([
      commandStarted("cmd-ok", "./.krn/bin/krn status"),
      commandCompleted("cmd-ok", "./.krn/bin/krn status", 0),
      commandStarted("cmd-fail", "pnpm test"),
      commandCompleted("cmd-fail", "pnpm test", 1),
    ]);
    const commands = extractCommandEvents(parseCodexExecJsonl(raw));

    expect(commands).toEqual([
      expect.objectContaining({
        id: "cmd-ok",
        command: "./.krn/bin/krn status",
        status: "completed",
        exit_code: 0,
      }),
      expect.objectContaining({
        id: "cmd-fail",
        command: "pnpm test",
        status: "failed",
        exit_code: 1,
      }),
    ]);
  });

  it("detects KRN runtime workflow adherence without trusting prompt mentions", () => {
    const events = parseCodexExecJsonl(fixtureRawJsonl());
    const commandEvents = extractCommandEvents(events);
    const fileEvents = extractFileEvents(events);
    const adherence = detectKrnAdherence({
      commandEvents,
      fileEvents,
      finalMessage: "STOP checked and not active. Verify and handoff completed.",
      eventText: fixtureRawJsonl(),
    });

    expect(adherence).toEqual({
      used_runtime_skill: true,
      read_workflow_reference: true,
      used_pinned_krn: true,
      ran_krn_status: true,
      ran_krn_start_full_intent: true,
      ran_krn_graph: true,
      ran_krn_context: true,
      read_task_contract: true,
      read_context_package: true,
      respected_stop: true,
      ran_verify: true,
      ran_handoff: true,
    });
  });

  it("does not treat global krn as pinned KRN evidence", () => {
    const pack = summarizeCodexExecRun({
      rawJsonl: jsonl([commandCompleted("global", "krn status"), { type: "turn.completed" }]),
      finalMessage: "No STOP active.",
      runId: "global-krn",
      kind: "fixture_codex_exec",
      targetRepo: "fixture",
      targetCommit: "unknown",
      krnSourceCommit: "test-sha",
    });

    expect(pack.metrics.krn_adherence.ran_krn_status).toBe(true);
    expect(pack.metrics.krn_adherence.used_pinned_krn).toBe(false);
  });
});

describe("codex exec redaction", () => {
  it("redacts API keys, bearer tokens, home directories, env files, and auth files", () => {
    const redacted = redactText(
      [
        "OPENAI_API_KEY=sk-test1234567890",
        'CODEX_API_KEY="secret-value"',
        "Authorization: Bearer abcdefghijklmnopqrstuvwxyz",
        "/home/krn/private/repo",
        ".env.local",
        "auth.json",
      ].join("\n"),
    );

    expect(redacted).not.toContain("sk-test1234567890");
    expect(redacted).not.toContain("secret-value");
    expect(redacted).not.toContain("abcdefghijklmnopqrstuvwxyz");
    expect(redacted).toContain("<home>/private/repo");
    expect(redacted).toContain("<env-file>");
    expect(redacted).toContain("<auth-file>");
  });

  it("fails closed when raw JSONL contains protected secret surfaces", () => {
    expect(() =>
      assertRawJsonlSafeForEvidence(jsonl([{ type: "item.completed", path: ".env" }])),
    ).toThrow(".env reference");
    expect(() =>
      assertRawJsonlSafeForEvidence(jsonl([{ type: "item.completed", path: "auth.json" }])),
    ).toThrow("auth file reference");
    expect(() =>
      assertRawJsonlSafeForEvidence(
        jsonl([{ type: "item.completed", command: "OPENAI_API_KEY=sk-test1234567890 pnpm test" }]),
      ),
    ).toThrow("secret-like value");
  });
});

describe("codex exec evidence pack", () => {
  it("writes all committed evidence files without copying raw JSONL", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "krn-codex-evidence-"));
    const pack = await writeCodexExecEvidencePack({
      outDir,
      rawJsonl: fixtureRawJsonl(),
      finalMessage: "STOP checked and not active. Verify and handoff completed.",
      runId: "fixture-runtime-skill-smoke-001",
      kind: "fixture_codex_exec",
      targetRepo: "fixture-runtime-skill",
      targetCommit: "unknown",
      krnSourceCommit: "07b245b7b1f173d2590eefef0dc5723e09c79e60",
      promptText: "Use the KRN Harness workflow.",
      commandText: "codex exec --sandbox workspace-write --json <prompt>",
      sandbox: "workspace-write",
    });

    for (const file of requiredCodexExecEvidenceFiles) {
      await expect(readFile(path.join(outDir, file), "utf8")).resolves.toBeTruthy();
    }
    await expect(readFile(path.join(outDir, "events.raw.jsonl"), "utf8")).rejects.toThrow();
    expect(validateCodexExecMetrics(pack.metrics)).toEqual([]);
    expect(pack.metrics.kind).toBe("fixture_codex_exec");

    const events = await readFile(path.join(outDir, "events.redacted.jsonl"), "utf8");
    expect(events).not.toContain("full stdout omitted by summarizer");
  });

  it("validates the committed fixture evidence pack and metrics schema", async () => {
    const schema = JSON.parse(
      await readFile("docs/specs/codex-exec-metrics.schema.json", "utf8"),
    ) as { $id?: string };

    expect(schema.$id).toBe("krn-codex-exec-metrics.schema.json");
    await mkdir(path.join(os.tmpdir(), "krn-schema-smoke"), { recursive: true });
    const issues = await validateCodexExecEvidencePackDirectory(
      "docs/evidence/codex-exec-runs/fixture-runtime-skill-smoke-001",
    );

    expect(issues).toEqual([]);
  });
});
