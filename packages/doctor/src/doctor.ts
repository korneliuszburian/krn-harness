export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface DoctorResult {
  checks: DoctorCheck[];
}

export async function runDoctor(): Promise<DoctorResult> {
  return {
    checks: [
      {
        name: "runtime",
        status: "pass",
        detail: "P0 doctor skeleton executed",
      },
    ],
  };
}
