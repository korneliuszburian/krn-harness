import type { DoctorCheck } from "../doctor.js";

export function agentsAdapterCheck(): DoctorCheck {
  return { name: "agents-adapter", status: "warn", detail: "Adapter generation is skeletal" };
}
