import type { DoctorCheck } from "../doctor.js";

export function hooksInstalledCheck(): DoctorCheck {
  return {
    name: "hooks-installed",
    status: "warn",
    detail: "Hooks template exists; install is manual",
  };
}
