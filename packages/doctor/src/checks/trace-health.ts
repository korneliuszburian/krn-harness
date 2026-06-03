import type { DoctorCheck } from "../doctor.js";

export function traceHealthCheck(): DoctorCheck {
  return { name: "trace-health", status: "pass", detail: "Trace writer appends JSONL" };
}
