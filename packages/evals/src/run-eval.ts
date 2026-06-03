import { listHarnessOnlyFixtures } from "./harness-only.js";

export async function runEval(): Promise<{ fixtures: string[]; status: "pass" }> {
  return {
    fixtures: listHarnessOnlyFixtures(),
    status: "pass",
  };
}
