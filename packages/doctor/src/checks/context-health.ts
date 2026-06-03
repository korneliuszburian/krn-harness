import type { DoctorCheck } from "../doctor.js";

export function contextHealthCheck(): DoctorCheck {
  return { name: "context-health", status: "warn", detail: "Context package builder is skeletal" };
}
