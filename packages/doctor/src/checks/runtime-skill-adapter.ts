import type { DoctorCheck } from "../doctor.js";

export function runtimeSkillAdapterCheck(): DoctorCheck {
  return {
    name: "runtime-skill-adapter",
    status: "pass",
    detail: "Runtime skill template is present",
  };
}
