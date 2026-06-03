import type { TraceEvent, TraceEventName } from "./schema.js";
import { traceEventId } from "./task-id.js";

export interface TraceEventInput {
  id?: string | undefined;
  taskId?: string | undefined;
  data?: TraceEvent["data"] | undefined;
  now?: Date | undefined;
}

export function createTraceEvent(name: TraceEventName, input: TraceEventInput = {}): TraceEvent {
  const event: TraceEvent = {
    id: input.id ?? traceEventId(),
    timestamp: (input.now ?? new Date()).toISOString(),
    name,
  };

  if (input.taskId) {
    event.taskId = input.taskId;
  }

  if (input.data) {
    event.data = input.data;
  }

  return event;
}
