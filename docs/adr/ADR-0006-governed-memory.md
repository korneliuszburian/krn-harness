# ADR-0006: Governed Memory

## Status

Accepted.

## Context

Memory can help future sessions, but stale or unapproved memory can become false active truth.

## Decision

Model memory as pending, approved, or deprecated. P0 does not auto-approve memory.

Memory transitions are manual:

- proposed memory starts in the pending local store;
- approved memory becomes active only after an explicit approval command;
- approved memory may be surfaced into context only as reference-only material when explicitly requested or task-relevant, with provenance;
- task relevance uses deterministic string matching with broad-term guards; English and Polish explicit opt-out suppress memory context;
- deprecated memory is excluded from active memory and context.

## Consequences

Memory has a schema, local store files, deterministic trace events, context integration gates, and doctor/eval poisoning coverage, but no autonomous approval path.

## Alternatives Considered

- Auto-approved memory: rejected in P0.
- No memory surface: rejected because governed memory is part of the product principle.

## Evidence/Source References

- https://developers.openai.com/codex/memories
- https://arxiv.org/html/2603.07670v1
- https://arxiv.org/html/2603.11768v1

## Revisit When

Revisit after approval UX and evidence requirements are specified.
