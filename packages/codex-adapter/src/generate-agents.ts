export const downstreamAgentsTemplatePath = "packages/codex-adapter/src/templates/AGENTS.md.tmpl";

export function generateAgentsAdapter(): string {
  return [
    "# AGENTS.md",
    "",
    "This repository uses KRN Harness.",
    "",
    "- Run `krn status` before non-trivial work.",
    '- Run `krn start "<task>"` and `krn context` before edits.',
    "- Read `.krn/current/task-contract.md` and `.krn/current/context-package.md`.",
    "- Do not edit if KRN reports STOP.",
    "- After edits, run `krn verify` or record why not runnable.",
    "- Run `krn handoff`.",
    "",
  ].join("\n");
}
