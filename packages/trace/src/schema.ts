export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const traceEventNames = [
  "cli.status",
  "task.started",
  "graph.built",
  "context.built",
  "verify.ran",
  "handoff.created",
  "install.ran",
  "doctor.ran",
  "eval.ran",
  "hook.received",
] as const;

export type TraceEventName = (typeof traceEventNames)[number];

export function isTraceEventName(value: unknown): value is TraceEventName {
  return typeof value === "string" && traceEventNames.includes(value as TraceEventName);
}

export interface TraceEvent {
  id: string;
  timestamp: string;
  name: TraceEventName;
  taskId?: string;
  data?: Record<string, JsonValue>;
}
