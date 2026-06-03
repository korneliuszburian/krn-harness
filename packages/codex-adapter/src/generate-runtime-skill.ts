export const runtimeSkillTemplatePath =
  "packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl";

export function generateRuntimeSkillTemplate(): string {
  return [
    "---",
    "name: krn-harness",
    "description: Use in downstream repositories that have KRN Harness installed. Route Codex through krn status, start, context, STOP policy, verify, and handoff before and after non-trivial edits.",
    "---",
    "",
    "# KRN Harness",
    "",
    "1. Run `krn status`.",
    '2. Run `krn start "<task>"`.',
    "3. Run `krn context`.",
    "4. Read `.krn/current/task-contract.md` and `.krn/current/context-package.md`.",
    "5. Stop without edits if KRN reports STOP.",
    "6. After edits, run `krn verify` or record why it cannot run.",
    "7. Run `krn handoff`.",
    "",
  ].join("\n");
}
