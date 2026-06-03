import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runCli } from "./index.js";

async function runInTemp(args: string[]) {
  const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
  let stdout = "";
  let stderr = "";
  const code = await runCli(args, {
    cwd,
    stdout: (text) => {
      stdout += text;
    },
    stderr: (text) => {
      stderr += text;
    },
    now: () => new Date("2026-06-03T00:00:00.000Z"),
  });

  return { cwd, stdout, stderr, code };
}

async function readTraceNames(cwd: string): Promise<string[]> {
  const raw = await readFile(path.join(cwd, ".krn", "traces", "trace.jsonl"), "utf8");
  return raw
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as { name: string })
    .map((event) => event.name);
}

describe("krn CLI", () => {
  it("prints help", async () => {
    const result = await runInTemp(["--help"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("krn status");
  });

  it("runs status and writes a trace event", async () => {
    const result = await runInTemp(["status"]);

    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN status: ready");
    await expect(readTraceNames(result.cwd)).resolves.toEqual(["cli.status"]);
  });

  it("runs start and context with task trace behavior", async () => {
    const result = await runInTemp(["start", "Implement", "a", "slice"]);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("KRN start: task accepted");

    const context = await runCli(["context"], {
      cwd: result.cwd,
      stdout: (text) => {
        result.stdout += text;
      },
      stderr: (text) => {
        result.stderr += text;
      },
      now: () => new Date("2026-06-03T00:00:00.000Z"),
    });

    expect(context).toBe(0);
    expect(result.stdout).toContain("KRN context: package written");
    await expect(readTraceNames(result.cwd)).resolves.toEqual(["task.started", "context.built"]);
  });
});
