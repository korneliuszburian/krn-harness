# ADR-0010: Skills Created Through `$skill-creator`

## Status

Accepted.

## Context

Official Codex skill guidance recommends using the built-in creator first for new skills.

## Decision

Initialize required build-time skills with `$skill-creator` and keep them instruction-only unless a future ADR justifies scripts or references.

## Consequences

Skill folders include valid `SKILL.md` files and generated `agents/openai.yaml` metadata. The creation path is documented in `docs/specs/build-time-skills.md`.

## Alternatives Considered

- Manually create skills: rejected because `$skill-creator` was available.
- Add scripts to skills now: rejected because instruction-only is enough for P0.

## Evidence/Source References

- https://developers.openai.com/codex/skills
- `/home/krn/.codex/skills/.system/skill-creator/SKILL.md`

## Revisit When

Revisit if a build-time skill repeatedly needs deterministic helper scripts.
