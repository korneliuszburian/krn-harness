# Onboarding

## New Repo Flow

1. Install KRN Harness.
2. Run `krn install` in the downstream repository.
3. Review generated `AGENTS.md`, `.codex/hooks.json`, and `.agents/skills/krn-harness/SKILL.md`.
4. Keep or adapt generated hooks only if the repo owner trusts the local command.
5. Run `krn status`.
6. Start work with `krn start "<task>"`.
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
