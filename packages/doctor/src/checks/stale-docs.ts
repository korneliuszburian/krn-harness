import type { DoctorCheck } from "../doctor.js";

export function staleDocsCheck(): DoctorCheck {
  return {
    name: "stale-docs",
    status: "warn",
    detail: "Stale-doc detection is not implemented in P0",
  };
}
