# ADR-0007: Trace-Based Evals

## Status

Accepted.

## Context

KRN needs auditable evidence that a workflow produced task contracts, context packages, hook events, verification, and handoff artifacts.

## Decision

Use JSONL trace events as the first eval and audit substrate.

## Consequences

P0 writes local trace events and includes harness-only eval fixture skeletons.

## Alternatives Considered

- Run real non-interactive Codex evals immediately: rejected as P0 overreach.
- Rely only on test output: rejected because runtime sequence matters.

## Evidence/Source References

- https://developers.openai.com/codex/noninteractive
- https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop

## Revisit When

Revisit when trace fixtures are stable enough to add non-interactive Codex evals.
