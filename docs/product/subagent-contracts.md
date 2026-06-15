# Reviewer Contracts

## Decision

KRN does not implement an autonomous subagent framework in the current product
layer. The only accepted near-term role is a deterministic reviewer that reads
local artifacts and emits JSON/Markdown records.

This means KRN starts reviewer work as contracts, not as an autonomous execution framework.

## Shared Contract

Any future reviewer-like role must name:

- input artifacts;
- output artifact;
- allowed reads and writes;
- stop conditions;
- validation evidence;
- protected-data boundary;
- escalation path.

It must stop when protected data, missing required artifacts, uncontrolled
parallel edits, or unapproved model calls would be required.

Reviewers must not edit files, spawn agents, approve memory, or call models by default.

## Deferred Work

Planner/implementer/safety-checker execution roles require a later ADR,
isolated worktree policy, conflict handling, and explicit operator approval.
