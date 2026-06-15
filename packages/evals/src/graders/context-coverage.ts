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
  const mustRead = pkg.buckets.mustRead.map((item) => item.path);
  const shouldRead = pkg.buckets.shouldRead.map((item) => item.path);
  const referenceOnly = pkg.buckets.referenceOnly.map((item) => item.path);
  const missingMustRead = missingExpected(mustRead, expected.mustRead);
  const missingShouldRead = missingExpected(shouldRead, expected.shouldRead);
  const missingReferenceOnly = missingExpected(referenceOnly, expected.referenceOnly);
  const failures = [
    missingMustRead.length > 0
      ? `Missing must-read context: ${missingMustRead.join(", ")}`
      : undefined,
    missingShouldRead.length > 0
      ? `Missing should-read context: ${missingShouldRead.join(", ")}`
      : undefined,
    missingReferenceOnly.length > 0
      ? `Missing reference-only context: ${missingReferenceOnly.join(", ")}`
      : undefined,
  ].filter((failure): failure is string => Boolean(failure));
  const expectedCount =
    (expected.mustRead ?? []).length +
    (expected.shouldRead ?? []).length +
    (expected.referenceOnly ?? []).length;

  return {
    name: "context-coverage",
    fixture,
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      expectedCount === 0
        ? "No must-read expectation for this fixture"
        : failures.length === 0
          ? "Expected active context is present"
          : failures.join("; "),
  };
}
