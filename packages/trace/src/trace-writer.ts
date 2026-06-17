import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { getRuntimeLayout } from "../../core/src/index.js";
import { isTraceEventName, parseTraceEvent, type TraceEvent } from "./schema.js";

export function defaultTracePath(cwd = process.cwd()): string {
  return path.join(cwd, getRuntimeLayout(cwd).tracesDir, "trace.jsonl");
}

export async function writeTraceEvent(event: TraceEvent, tracePath: string): Promise<void> {
  const parsed = parseTraceEvent(event);
  await mkdir(path.dirname(tracePath), { recursive: true });
  await appendFile(tracePath, `${JSON.stringify(parsed)}\n`, "utf8");
}

export async function readTraceLines(raw: string): Promise<TraceEvent[]> {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const event = JSON.parse(line) as unknown;

      if (
        typeof event === "object" &&
        event !== null &&
        !Array.isArray(event) &&
        !isTraceEventName((event as { name?: unknown }).name)
      ) {
        throw new Error(`Invalid trace event name: ${String((event as { name?: unknown }).name)}`);
      }

      return parseTraceEvent(event);
    });
}
