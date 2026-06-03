# ADR-0006: Governed Memory

## Status

Accepted.

## Context

Memory can help future sessions, but stale or unapproved memory can become false active truth.

## Decision

Model memory as pending, approved, or rejected. P0 does not auto-approve memory.

## Consequences

Memory has a schema and store skeleton but no autonomous approval path.

## Alternatives Considered

- Auto-approved memory: rejected in P0.
- No memory surface: rejected because governed memory is part of the product principle.

## Evidence/Source References

- https://developers.openai.com/codex/memories
- https://arxiv.org/html/2603.07670v1
- https://arxiv.org/html/2603.11768v1

## Revisit When

Revisit after approval UX and evidence requirements are specified.
