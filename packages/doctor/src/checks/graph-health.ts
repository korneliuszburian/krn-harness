import type { DoctorCheck } from "../doctor.js";

export function graphHealthCheck(): DoctorCheck {
  return {
    name: "graph-health",
    status: "warn",
    detail: "Graph-lite detectors are shallow P0 evidence, not full AST/callgraph intelligence",
  };
}
