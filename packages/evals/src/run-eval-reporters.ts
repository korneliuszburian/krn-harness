import type { EvalResult } from "./run-eval-types.js";

export function renderEvalResultMarkdown(result: EvalResult): string {
  const failures = [
    ...result.fixtures.flatMap((fixture) =>
      fixture.grades
        .filter((grade) => grade.status === "fail")
        .map((grade) => `${fixture.name}/${grade.name}: ${grade.detail}`),
    ),
    ...[
      result.graph,
      result.graphArtifact,
      result.downstream,
      result.codexExecEvidence,
      result.verify,
      result.hooks,
      result.memory,
      result.trace,
    ]
      .filter((grade) => grade.status === "fail")
      .map((grade) => `${grade.name}: ${grade.detail}`),
  ];
  const lines = [
    "# KRN Eval Result",
    "",
    "## Summary",
    "",
    `Status: ${result.status}`,
    `Pass count: ${result.passCount}`,
    `Fail count: ${result.failCount}`,
    `Run trace mode: ${result.runTraceMode}`,
    "",
    "## Graph Coverage",
    "",
    `- ${result.graph.name}: ${result.graph.status} - ${result.graph.detail}`,
    `- ${result.graphArtifact.name}: ${result.graphArtifact.status} - ${result.graphArtifact.detail}`,
    "",
    "## Downstream Acceptance",
    "",
    `- ${result.downstream.name}: ${result.downstream.status} - ${result.downstream.detail}`,
    "",
    "## Verify Profiles",
    "",
    `- ${result.verify.name}: ${result.verify.status} - ${result.verify.detail}`,
    "",
    "## Codex Exec Evidence",
    "",
    `- ${result.codexExecEvidence.name}: ${result.codexExecEvidence.status} - ${result.codexExecEvidence.detail}`,
    "",
    "## Hook Guardrails",
    "",
    `- ${result.hooks.name}: ${result.hooks.status} - ${result.hooks.detail}`,
    "",
    "## Memory Governance",
    "",
    `- ${result.memory.name}: ${result.memory.status} - ${result.memory.detail}`,
    "",
    "## Fixture Results",
    "",
  ];

  for (const fixture of result.fixtures) {
    lines.push(`### ${fixture.name}`, "", `Status: ${fixture.status}`, `Task: ${fixture.task}`, "");
    for (const grade of fixture.grades) {
      lines.push(`- ${grade.name}: ${grade.status} - ${grade.detail}`);
    }
    lines.push("");
  }

  lines.push(
    "## Trace Coverage",
    "",
    `- ${result.trace.name}: ${result.trace.status} - ${result.trace.detail}`,
    "",
    "## Failures",
    "",
    ...(failures.length > 0 ? failures.map((failure) => `- ${failure}`) : ["- none"]),
    "",
    "## P0 Limits",
    "",
    "- Eval uses harness-only fixtures and local traces.",
    "- Eval does not invoke Codex, external services, or project commands.",
    "",
  );
  return lines.join("\n");
}
