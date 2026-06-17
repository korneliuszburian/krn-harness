# Runtime Skill Adapter

## Purpose

The runtime skill template gives downstream Codex sessions a short KRN workflow.
It is the product-facing skill layer installed into target repositories, not a
build-time skill used to build KRN Harness itself.

## Template Path

`packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl`

Support files:

- `packages/codex-adapter/src/templates/skills/krn-harness/agents/openai.yaml.tmpl`
- `packages/codex-adapter/src/templates/skills/krn-harness/references/workflow.md.tmpl`

## Required Flow

1. `krn status`
2. Add concrete pixel ranges or element sizes when the task is visual/layout-related.
3. `krn start "<full user intent>"`
   - Do not pass only a task id, slug, or title when richer instructions exist.
   - Include expected outcome, constraints, forbidden files, required proof, and task-specific context.
4. `krn graph`
5. `krn context`
6. Read `.krn/current/task-contract.md`
7. Read `.krn/current/context-package.md`
8. Respect STOP
9. `krn verify`
10. `krn handoff`

The runtime skill may point to `references/workflow.md` for decision rules,
output contract, review checklist, STOP handling, and verification ambiguity.
The reference is still guidance, not enforcement.

## Install Metadata

The installed `.agents/skills/krn-harness/SKILL.md` must keep YAML frontmatter
as the first bytes so real Codex skill parsing can load it. The KRN managed
marker may be installed as a YAML comment inside that frontmatter, but not
before the opening `---`.

## Non-Goal

Do not embed full architecture or raw research into the downstream skill. Do
not add scripts unless they have a deterministic KRN/CI invocation path.
