import type { ContextPackage } from "../../../context/src/index.js";
import type { EvalFixtureExpected } from "../fixtures.js";
import type { EvalGrade } from "./types.js";

export function gradeStaleDocLeakage(
  fixture: string,
  pkg: ContextPackage,
  expected: EvalFixtureExpected,
): EvalGrade {
  const expectedDoNotUse = expected.doNotUse ?? [];
  const doNotUse = pkg.buckets.doNotUse.map((item) => item.path);
  const active = [
    ...pkg.buckets.mustRead,
    ...pkg.buckets.shouldRead,
    ...pkg.buckets.referenceOnly,
  ].map((item) => item.path);
  const missing = expectedDoNotUse.filter((path) => !doNotUse.includes(path));
  const leaked = expectedDoNotUse.filter((path) => active.includes(path));

  if (missing.length > 0 || leaked.length > 0) {
    return {
      name: "stale-doc-leakage",
      fixture,
      status: "fail",
      detail: [
        missing.length > 0 ? `Missing do-not-use doc(s): ${missing.join(", ")}` : undefined,
        leaked.length > 0
          ? `Stale doc leaked into active context: ${leaked.join(", ")}`
          : undefined,
      ]
        .filter(Boolean)
        .join("; "),
    };
  }

  return {
    name: "stale-doc-leakage",
    fixture,
    status: "pass",
    detail:
      expectedDoNotUse.length > 0
        ? "Expected stale docs stay in do-not-use"
        : "No stale-doc expectation for this fixture",
  };
}
