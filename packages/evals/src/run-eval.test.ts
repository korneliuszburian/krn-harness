import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runEval } from "./run-eval.js";

async function writeTrace(cwd: string, names: string[]): Promise<string> {
  const tracePath = path.join(cwd, ".krn", "traces", "trace.jsonl");
  await mkdir(path.dirname(tracePath), { recursive: true });
  await writeFile(
    tracePath,
    names
      .map((name, index) =>
        JSON.stringify({
          id: `trace-${index}`,
          timestamp: "2026-06-03T00:00:00.000Z",
          name,
        }),
      )
      .join("\n")
      .concat("\n"),
    "utf8",
  );
  return tracePath;
}

describe("harness-only eval", () => {
  it("passes deterministic P0 fixture graders when trace is complete", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-eval-"));
    const tracePath = await writeTrace(cwd, [
      "task.started",
      "context.built",
      "verify.ran",
      "handoff.created",
    ]);

    const result = await runEval({ cwd, tracePath });

    expect(result).toMatchObject({
      status: "pass",
      passCount: 10,
      failCount: 0,
      trace: {
        name: "trace-completeness",
        status: "pass",
      },
    });
    expect(result.fixtures.map((fixture) => fixture.name)).toEqual([
      "frontend-section-context",
      "stale-doc-trap",
      "missing-context-stop",
    ]);
    expect(result.fixtures.every((fixture) => fixture.status === "pass")).toBe(true);
  });

  it("reports missing trace events deterministically", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-eval-"));
    const tracePath = await writeTrace(cwd, ["task.started"]);

    const result = await runEval({ cwd, tracePath });

    expect(result.status).toBe("fail");
    expect(result.trace).toEqual({
      name: "trace-completeness",
      status: "fail",
      detail: "Missing trace event(s): context.built, verify.ran, handoff.created",
    });
  });
});
