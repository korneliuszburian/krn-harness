export interface AgentsQualityResult {
  status: "pass" | "fail";
  missing: string[];
}

const requiredSections = ["## Roles", "## Non-negotiables", "## KRN Workflow"] as const;
const requiredWorkflowPhrases = [
  "KRN Harness",
  "krn status",
  "krn start",
  "krn graph",
  "krn context",
  "krn verify",
  "krn handoff",
  "STOP",
] as const;

function hasRuntimeSkillReference(content: string): boolean {
  return content.includes(".agents/skills/krn-harness/SKILL.md");
}

export function validateAgentsAdapter(content: string): AgentsQualityResult {
  const missing = [
    ...requiredSections.filter((section) => !content.includes(section)),
    ...requiredWorkflowPhrases.filter((phrase) => !content.includes(phrase)),
    ...(hasRuntimeSkillReference(content) ? [] : ["runtime skill reference"]),
  ];

  return {
    status: missing.length === 0 ? "pass" : "fail",
    missing,
  };
}

export function formatAgentsQualityError(result: AgentsQualityResult): string {
  return result.status === "pass"
    ? "generated AGENTS.md passed quality gate"
    : `generated AGENTS.md failed quality gate: missing ${result.missing.join(", ")}`;
}
