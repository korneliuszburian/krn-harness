# Runtime Skill Adapter

## Purpose

The runtime skill template gives downstream Codex sessions a short KRN workflow.

## Template Path

`packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl`

## Required Flow

1. `krn status`
2. `krn start "<task>"`
3. `krn context`
4. Read `.krn/current/task-contract.md`
5. Read `.krn/current/context-package.md`
6. Respect STOP
7. `krn verify`
8. `krn handoff`

## Non-Goal

Do not embed full architecture or raw research into the downstream skill.
