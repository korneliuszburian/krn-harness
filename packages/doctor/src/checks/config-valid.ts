import type { DoctorCheck } from "../doctor.js";

export function configValidCheck(): DoctorCheck {
  return { name: "config-valid", status: "pass", detail: "Config check placeholder" };
}
