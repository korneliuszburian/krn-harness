# ADR-0008: Build-Time Skills vs Runtime Skills

## Status

Accepted.

## Context

The repo needs skills for Codex building KRN Harness and a separate skill template for downstream repos using KRN Harness.

## Decision

Keep build-time skills in `.agents/skills/*`. Keep runtime/downstream skill templates in `packages/codex-adapter/src/templates/skills/*`.

## Consequences

The two skill layers are explicit and cannot be confused in file layout or docs.

## Alternatives Considered

- One shared skill folder: rejected because build-time and downstream audiences differ.
- Many runtime skills in P0: rejected as a P0 non-goal.

## Evidence/Source References

- https://developers.openai.com/codex/skills

## Revisit When

Revisit if downstream installs require more than one runtime workflow.
