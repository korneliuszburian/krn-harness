# Onboarding

## New Repo Flow

1. Install KRN Harness.
2. Run `krn install` in the downstream repository.
3. Review generated `AGENTS.md`, `.codex/hooks.json`, `.agents/skills/krn-harness/SKILL.md`, and the runtime skill reference under `.agents/skills/krn-harness/references/workflow.md`.
4. Keep or adapt generated hooks only if the repo owner trusts the local command.
5. Run `krn status`.
6. Start work with `krn start "<full user intent>"`.
7. Build shallow graph evidence with `krn graph`.
8. Build context with `krn context`.
9. Record P0 verification with `krn verify`.
10. Produce review-ready current state with `krn handoff`.
11. Inspect local health with `krn doctor`.
12. Run harness-only fixture checks with `krn eval`.

## Operator Rule

If KRN reports STOP, do not edit until the missing context or unsafe condition is resolved.

`krn install` preserves existing downstream files. It reports skipped files instead of overwriting project-owned instructions.

Each install run writes an `install.ran` JSONL trace event with deterministic created/skipped counts and action summaries so onboarding can be checked without reading generated file bodies.

## Runtime Layout

`krn install` creates these missing local runtime directories:

- `.krn/current/`
- `.krn/graph/`
- `.krn/traces/`
- `.krn/runs/`
- `.krn/memory/`

They are local runtime state. They are not a hosted service, daemon, sandbox, or plugin distribution channel.

## Runtime Skill Folder

`krn install` creates a thin downstream skill folder:

- `.agents/skills/krn-harness/SKILL.md`
- `.agents/skills/krn-harness/agents/openai.yaml`
- `.agents/skills/krn-harness/references/workflow.md`

These files guide Codex through local CLI artifacts. They do not prove hook
trust, production readiness, or Codex runtime behavior.

## Acceptance

The downstream acceptance contract lives in `docs/specs/downstream-acceptance.md`. The canonical fixture is `fixtures/repos/downstream-basic/`.
