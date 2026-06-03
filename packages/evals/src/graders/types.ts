export interface EvalGrade {
  name: string;
  status: "pass" | "fail";
  detail: string;
  fixture?: string;
}
