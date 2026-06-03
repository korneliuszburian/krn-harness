export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type TraceEventName =
  | "cli.status"
  | "task.started"
  | "context.built"
  | "verify.ran"
  | "handoff.created"
  | "install.ran"
  | "doctor.ran"
  | "eval.ran"
  | "hook.received";

export interface TraceEvent {
  id: string;
  timestamp: string;
  name: TraceEventName;
  taskId?: string;
  data?: Record<string, JsonValue>;
}
