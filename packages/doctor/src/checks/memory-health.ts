import type { DoctorCheck } from "../doctor.js";

export function memoryHealthCheck(): DoctorCheck {
  return { name: "memory-health", status: "warn", detail: "Memory remains governed and manual" };
}
