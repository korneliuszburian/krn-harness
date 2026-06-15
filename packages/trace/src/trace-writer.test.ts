import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { TraceEvent } from "./schema.js";
import { taskIdFor } from "./task-id.js";
import { createTraceEvent } from "./trace-events.js";
import { defaultTracePath, readTraceLines, writeTraceEvent } from "./trace-writer.js";

describe("trace determinism", () => {
  it("creates a stable trace event when id, task id, and clock are fixed", () => {
    const event = createTraceEvent("task.started", {
      id: "trace-fixed",
      now: new Date("2026-06-04T00:00:00.000Z"),
      taskId: "task-d4d6e7d224dc",
      data: {
        classification: "implementation",
      },
    });

    expect(event).toEqual({
      id: "trace-fixed",
      timestamp: "2026-06-04T00:00:00.000Z",
      name: "task.started",
      taskId: "task-d4d6e7d224dc",
      data: {
        classification: "implementation",
      },
    } satisfies TraceEvent);
  });

  it("derives predictable task ids from task text", () => {
    expect(taskIdFor("goal 1 smoke task")).toBe("task-d4d6e7d224dc");
    expect(taskIdFor("Implement a slice")).toBe("task-b190ca6e7ce7");
  });

  it("appends valid JSONL trace events in order", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-trace-"));
    const tracePath = defaultTracePath(cwd);
    const first = createTraceEvent("cli.status", {
      id: "trace-one",
      now: new Date("2026-06-04T00:00:00.000Z"),
      data: {
        configSource: "default",
      },
    });
    const second = createTraceEvent("context.built", {
      id: "trace-two",
      now: new Date("2026-06-04T00:01:00.000Z"),
      taskId: "task-d4d6e7d224dc",
      data: {
        stop: false,
      },
    });

    await writeTraceEvent(first, tracePath);
    await writeTraceEvent(second, tracePath);

    const raw = await readFile(tracePath, "utf8");
    expect(raw.endsWith("\n")).toBe(true);
    await expect(readTraceLines(raw)).resolves.toEqual([first, second]);
  });

  it("ignores empty JSONL lines when reading traces", async () => {
    await expect(
      readTraceLines(
        `${JSON.stringify({
          id: "trace-one",
          timestamp: "2026-06-04T00:00:00.000Z",
          name: "cli.status",
        })}\n\n`,
      ),
    ).resolves.toEqual([
      {
        id: "trace-one",
        timestamp: "2026-06-04T00:00:00.000Z",
        name: "cli.status",
      },
    ]);
  });

  it("rejects unknown trace event names", async () => {
    await expect(
      readTraceLines(
        `${JSON.stringify({
          id: "trace-one",
          timestamp: "2026-06-04T00:00:00.000Z",
          name: "unknown.event",
        })}\n`,
      ),
    ).rejects.toThrow("Invalid trace event name: unknown.event");
  });

  it("rejects malformed trace event payloads", async () => {
    await expect(
      readTraceLines(
        `${JSON.stringify({
          id: "trace-one",
          timestamp: "2026-06-04T00:00:00.000Z",
          name: "cli.status",
          data: "not-an-object",
        })}\n`,
      ),
    ).rejects.toThrow("Invalid trace event");
  });
});
