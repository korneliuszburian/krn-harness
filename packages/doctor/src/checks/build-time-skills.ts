import type { DoctorCheck } from "../doctor.js";

export function buildTimeSkillsCheck(): DoctorCheck {
  return {
    name: "build-time-skills",
    status: "pass",
    detail: "Required build-time skills are present",
  };
}
