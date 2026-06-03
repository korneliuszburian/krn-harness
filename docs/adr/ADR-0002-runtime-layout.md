# ADR-0002: Runtime Layout

## Status

Accepted.

## Context

Downstream repos need a small stable config surface and local runtime state that can be ignored by git.

## Decision

Use `krn.config.json` for stable config and `.krn/` for local runtime state. Current artifacts live under `.krn/current/`; traces live under `.krn/traces/`.

## Consequences

Runtime artifacts are inspectable and local. Repos can gitignore `.krn/` while still treating it as active state.

## Alternatives Considered

- Store everything in `AGENTS.md`: rejected because runtime state would pollute durable guidance.
- Store everything in global Codex memory: rejected because team truth must be repo-local.

## Evidence/Source References

- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/memories

## Revisit When

Revisit if downstream repos need multiple concurrent active tasks.
