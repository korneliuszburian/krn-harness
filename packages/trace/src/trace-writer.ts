import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { isTraceEventName, type TraceEvent } from "./schema.js";

export function defaultTracePath(cwd = process.cwd()): string {
  return path.join(cwd, ".krn", "traces", "trace.jsonl");
}

export async function writeTraceEvent(event: TraceEvent, tracePath: string): Promise<void> {
  await mkdir(path.dirname(tracePath), { recursive: true });
  await appendFile(tracePath, `${JSON.stringify(event)}\n`, "utf8");
}

export async function readTraceLines(raw: string): Promise<TraceEvent[]> {
  return raw
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const event = JSON.parse(line) as TraceEvent;

      if (!isTraceEventName(event.name)) {
        throw new Error(`Invalid trace event name: ${String(event.name)}`);
      }

      return event;
    });
}
