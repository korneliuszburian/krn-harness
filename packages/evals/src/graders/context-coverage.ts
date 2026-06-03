import type { ContextPackage } from "../../../context/src/index.js";
import type { EvalFixtureExpected } from "../fixtures.js";
import type { EvalGrade } from "./types.js";

function missingExpected(actual: string[], expected: string[] = []): string[] {
  return expected.filter((path) => !actual.includes(path));
}

export function gradeContextCoverage(
  fixture: string,
  pkg: ContextPackage,
  expected: EvalFixtureExpected,
): EvalGrade {
  const actual = pkg.buckets.mustRead.map((item) => item.path);
  const missing = missingExpected(actual, expected.mustRead);

  return {
    name: "context-coverage",
    fixture,
    status: missing.length === 0 ? "pass" : "fail",
    detail:
      (expected.mustRead ?? []).length === 0
        ? "No must-read expectation for this fixture"
        : missing.length === 0
          ? "Expected must-read context is present"
          : `Missing must-read context: ${missing.join(", ")}`,
  };
}
