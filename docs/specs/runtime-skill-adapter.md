# Runtime Skill Adapter

## Purpose

The runtime skill template gives downstream Codex sessions a short KRN workflow.

## Template Path

`packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl`

## Required Flow

1. `krn status`
2. Add concrete pixel ranges or element sizes when the task is visual/layout-related.
3. `krn start "<full user intent>"`
   - Do not pass only a task id, slug, or title when richer instructions exist.
   - Include expected outcome, constraints, forbidden files, required proof, and task-specific context.
4. `krn context`
5. Read `.krn/current/task-contract.md`
6. Read `.krn/current/context-package.md`
7. Respect STOP
8. `krn verify`
9. `krn handoff`

## Non-Goal

Do not embed full architecture or raw research into the downstream skill.
