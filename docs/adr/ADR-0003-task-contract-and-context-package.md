# ADR-0003: Task Contract and Context Package

## Status

Accepted.

## Context

Codex works better with clear goals, constraints, context, and done criteria. KRN needs these as files, not only chat state.

## Decision

Create a task contract before work and a context package before edits.

## Consequences

Commands can produce `.krn/current/task-contract.*` and `.krn/current/context-package.*`. STOP policy has an artifact to inspect.

## Alternatives Considered

- Rely only on the user prompt: rejected because state would be hard to verify.
- Build full retrieval first: rejected as P0 overreach.

## Evidence/Source References

- https://developers.openai.com/codex/learn/best-practices
- https://arxiv.org/abs/2307.03172
- https://arxiv.org/abs/2507.13334

## Revisit When

Revisit when context package ranking needs empirical eval evidence.
