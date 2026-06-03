# ADR-0009: krn-search Skills as Inspiration

## Status

Accepted.

## Context

The existing `krn-search` `coding-system` skill contains useful operating workflow patterns, but it belongs to another repo.

## Decision

Use `krn-search` only as inspiration. Distill reusable workflow patterns into KRN-specific skills, docs, and ADRs without copying it wholesale.

## Consequences

KRN adopts frame/read/slice/own/prove/handoff patterns while keeping product-specific content separate.

## Alternatives Considered

- Copy the skill wholesale: rejected because repo-specific guidance would pollute KRN Harness.
- Ignore it entirely: rejected because the workflow pattern is useful.

## Evidence/Source References

- `/home/krn/coding/krn/krn-search/.codex/skills/coding-system/SKILL.md`
- https://developers.openai.com/codex/skills

## Revisit When

Revisit if KRN build-time skills fail to guide future implementation cleanly.
