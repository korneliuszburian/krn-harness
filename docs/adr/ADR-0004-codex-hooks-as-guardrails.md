# ADR-0004: Codex Hooks as Guardrails

## Status

Accepted.

## Context

Codex hooks can run lifecycle commands and inspect selected events, but they are not complete enforcement boundaries.

## Decision

Use Codex hooks as guardrails and trace entrypoints, not as a sandbox or full policy engine.

## Consequences

P0 ships a hooks template and hook CLI entrypoint. It returns deterministic `allow`, `warn`, or `block` decisions for local guardrail evidence, and it documents limitations instead of overstating enforcement. The hook result includes `enforced: false` because the P0 hook is not a sandbox or full policy engine.

## Alternatives Considered

- Treat hooks as hard sandbox: rejected because hook semantics do not provide complete isolation.
- Skip hooks entirely: rejected because lifecycle trace points are useful.

## Evidence/Source References

- https://developers.openai.com/codex/hooks

## Revisit When

Revisit when P0 trace evidence shows which hook events should gain real policy checks.
