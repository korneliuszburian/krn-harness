import type { EvalGrade } from "./graders/types.js";

export interface EvalFixtureResult {
  name: string;
  task: string;
  status: "pass" | "fail";
  grades: EvalGrade[];
}

export interface EvalResult {
  status: "pass" | "fail";
  passCount: number;
  failCount: number;
  fixtures: EvalFixtureResult[];
  graph: EvalGrade;
  graphArtifact: EvalGrade;
  downstream: EvalGrade;
  codexExecEvidence: EvalGrade;
  verify: EvalGrade;
  hooks: EvalGrade;
  memory: EvalGrade;
  trace: EvalGrade;
  runTraceMode: "run-scoped" | "global" | "missing";
}

export interface RunEvalInput {
  cwd?: string;
  fixtureRoot?: string;
  tracePath?: string;
}
