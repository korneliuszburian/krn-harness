import type { ContextPackage } from "../../../context/src/index.js";
import type { EvalFixtureExpected } from "../fixtures.js";
import type { EvalGrade } from "./types.js";

export function gradeStopPrecision(
  fixture: string,
  pkg: ContextPackage,
  expected: EvalFixtureExpected,
): EvalGrade {
  const expectedStop = expected.stop ?? false;
  const missingContext = pkg.buckets.missingContext.map((item) => item.path);
  const missingExpectedContext = (expected.missingContext ?? []).filter(
    (path) => !missingContext.includes(path),
  );

  if (pkg.stop !== expectedStop || missingExpectedContext.length > 0) {
    return {
      name: "stop-precision",
      fixture,
      status: "fail",
      detail:
        pkg.stop !== expectedStop
          ? `Expected STOP ${expectedStop} but got ${pkg.stop}`
          : `Missing expected missing-context item(s): ${missingExpectedContext.join(", ")}`,
    };
  }

  return {
    name: "stop-precision",
    fixture,
    status: "pass",
    detail: `STOP state matches expected ${expectedStop}`,
  };
}
