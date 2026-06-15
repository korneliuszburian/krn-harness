import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { EvalGrade } from "./graders/types.js";
import type { EvalFixtureResult, EvalResult } from "./run-eval-types.js";

export type EvalBaselineComparisonStatus =
  | "created"
  | "unchanged"
  | "improved"
  | "regressed"
  | "changed";

export interface EvalBaselineGrade {
  key: string;
  status: EvalGrade["status"];
  detail: string;
}

export interface EvalBaselineArtifact {
  schema: "krn-eval-baseline-v1";
  generatedAt: string;
  baselinePath: ".krn/evals/baseline.json";
  currentResultPath: ".krn/current/eval-result.json";
  current: {
    status: EvalResult["status"];
    passCount: number;
    failCount: number;
    fixtureCount: number;
    gradeCount: number;
    grades: EvalBaselineGrade[];
  };
  previous?: {
    generatedAt: string;
    status: EvalResult["status"];
    passCount: number;
    failCount: number;
    gradeCount: number;
  };
  comparison: {
    status: EvalBaselineComparisonStatus;
    regressions: string[];
    improvements: string[];
    newGrades: string[];
    removedGrades: string[];
  };
  limits: {
    productionProof: false;
    codexExecutionProof: false;
    hookTrustProof: false;
    baselineMode: "rolling-local-last-run";
  };
}

export const evalBaselineRelativePath = ".krn/evals/baseline.json" as const;

function fixtureGrades(fixture: EvalFixtureResult): EvalBaselineGrade[] {
  return fixture.grades.map((grade) => ({
    key: `fixture:${fixture.name}/${grade.name}`,
    status: grade.status,
    detail: grade.detail,
  }));
}

function topLevelGrades(result: EvalResult): EvalBaselineGrade[] {
  const grades: Array<[string, EvalGrade]> = [
    ["graph", result.graph],
    ["graphArtifact", result.graphArtifact],
    ["downstream", result.downstream],
    ["verify", result.verify],
    ["hooks", result.hooks],
    ["memory", result.memory],
    ["trace", result.trace],
  ];

  return grades.map(([prefix, grade]) => ({
    key: `${prefix}:${grade.name}`,
    status: grade.status,
    detail: grade.detail,
  }));
}

export function flattenEvalGrades(result: EvalResult): EvalBaselineGrade[] {
  return [...result.fixtures.flatMap(fixtureGrades), ...topLevelGrades(result)].sort(
    (left, right) => left.key.localeCompare(right.key),
  );
}

function gradeMap(grades: EvalBaselineGrade[]): Map<string, EvalBaselineGrade> {
  return new Map(grades.map((grade) => [grade.key, grade]));
}

function compareGrades(
  current: EvalBaselineGrade[],
  previous: EvalBaselineGrade[] | undefined,
): EvalBaselineArtifact["comparison"] {
  if (!previous) {
    return {
      status: "created",
      regressions: [],
      improvements: [],
      newGrades: [],
      removedGrades: [],
    };
  }

  const currentByKey = gradeMap(current);
  const previousByKey = gradeMap(previous);
  const regressions: string[] = [];
  const improvements: string[] = [];
  const newGrades: string[] = [];
  const removedGrades: string[] = [];

  for (const grade of current) {
    const previousGrade = previousByKey.get(grade.key);

    if (!previousGrade) {
      newGrades.push(grade.key);
      continue;
    }

    if (previousGrade.status === "pass" && grade.status === "fail") {
      regressions.push(grade.key);
    }

    if (previousGrade.status === "fail" && grade.status === "pass") {
      improvements.push(grade.key);
    }
  }

  for (const grade of previous) {
    if (!currentByKey.has(grade.key)) {
      removedGrades.push(grade.key);
    }
  }

  let status: EvalBaselineComparisonStatus = "unchanged";
  if (regressions.length > 0) {
    status = "regressed";
  } else if (improvements.length > 0) {
    status = "improved";
  } else if (newGrades.length > 0 || removedGrades.length > 0) {
    status = "changed";
  }

  return {
    status,
    regressions,
    improvements,
    newGrades,
    removedGrades,
  };
}

function previousSummary(
  previous: EvalBaselineArtifact | undefined,
): EvalBaselineArtifact["previous"] {
  if (!previous) {
    return undefined;
  }

  return {
    generatedAt: previous.generatedAt,
    status: previous.current.status,
    passCount: previous.current.passCount,
    failCount: previous.current.failCount,
    gradeCount: previous.current.gradeCount,
  };
}

export function buildEvalBaselineArtifact(input: {
  result: EvalResult;
  previous?: EvalBaselineArtifact | undefined;
  generatedAt: string;
}): EvalBaselineArtifact {
  const grades = flattenEvalGrades(input.result);
  const previous = previousSummary(input.previous);

  return {
    schema: "krn-eval-baseline-v1",
    generatedAt: input.generatedAt,
    baselinePath: evalBaselineRelativePath,
    currentResultPath: ".krn/current/eval-result.json",
    current: {
      status: input.result.status,
      passCount: input.result.passCount,
      failCount: input.result.failCount,
      fixtureCount: input.result.fixtures.length,
      gradeCount: grades.length,
      grades,
    },
    ...(previous ? { previous } : {}),
    comparison: compareGrades(grades, input.previous?.current.grades),
    limits: {
      productionProof: false,
      codexExecutionProof: false,
      hookTrustProof: false,
      baselineMode: "rolling-local-last-run",
    },
  };
}

export async function readEvalBaseline(cwd: string): Promise<EvalBaselineArtifact | undefined> {
  try {
    return JSON.parse(
      await readFile(path.join(cwd, evalBaselineRelativePath), "utf8"),
    ) as EvalBaselineArtifact;
  } catch {
    return undefined;
  }
}

export async function writeEvalBaseline(
  cwd: string,
  baseline: EvalBaselineArtifact,
): Promise<void> {
  const targetPath = path.join(cwd, evalBaselineRelativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
}
