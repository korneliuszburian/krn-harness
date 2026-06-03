import { createHash, randomUUID } from "node:crypto";

export function taskIdFor(input: string): string {
  const digest = createHash("sha256").update(input).digest("hex").slice(0, 12);
  return `task-${digest}`;
}

export function traceEventId(): string {
  return `trace-${randomUUID()}`;
}
