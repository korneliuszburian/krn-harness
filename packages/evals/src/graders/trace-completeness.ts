import type { TraceEventName } from "../../../trace/src/index.js";
import type { EvalGrade } from "./types.js";

export const defaultTraceCompletenessEvents: TraceEventName[] = [
  "task.started",
  "context.built",
  "verify.ran",
  "handoff.created",
];

export function gradeTraceCompleteness(
  traceEventNames: string[],
  required: readonly string[] = defaultTraceCompletenessEvents,
): EvalGrade {
  const missing = required.filter((name) => !traceEventNames.includes(name));

  return {
    name: "trace-completeness",
    status: missing.length === 0 ? "pass" : "fail",
    detail:
      missing.length === 0
        ? "Required P0 trace events are present"
        : `Missing trace event(s): ${missing.join(", ")}`,
  };
}
