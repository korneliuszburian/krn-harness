# ADR-0001: Codex-First Harness

## Status

Accepted.

## Context

KRN Harness is meant to control Codex engineering work through local contracts, context, hooks, trace, verification, and governed memory.

## Decision

Build KRN Harness as a Codex-first local runtime/control layer, not a dashboard-first product or generic agent framework.

## Consequences

The CLI, docs, AGENTS guidance, skills, and adapter templates are first-class. Dashboard and generic orchestration are deferred.

## Alternatives Considered

- Prompt pack: rejected because it cannot own runtime state or trace.
- Dashboard-first product: deferred because it would hide the core control contracts.

## Evidence/Source References

- https://developers.openai.com/codex/learn/best-practices
- https://developers.openai.com/codex/guides/agents-md

## Revisit When

Revisit after P0 proves the local runtime contract and trace loop.
