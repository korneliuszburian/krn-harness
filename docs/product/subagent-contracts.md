# Subagent And Reviewer Contracts

## Decision

KRN starts subagent work as contracts around reviewers, not as an autonomous execution framework.

## Future Roles

- planner
- implementer
- reviewer
- release checker
- safety checker

Only reviewer-like roles are safe to start in P1 because they can read artifacts and emit records without editing.

## Shared Artifact Contract

Every role handoff must name:

- input artifacts;
- output artifact;
- allowed reads;
- allowed writes;
- stop conditions;
- validation evidence;
- protected-data boundary;
- escalation path.

## Stop Conditions

Stop before execution when:

- the target is the KRN source checkout but the task expects downstream work;
- protected data, secrets, dumps, uploads, or production config are in scope;
- required local artifacts are missing and cannot be recreated safely;
- the role would need uncontrolled parallel edits;
- a model call would be required without explicit approval.

## Reviewer As First Safe Role

Reviewers are the first subagent-like layer because they can:

- inspect local artifacts;
- produce deterministic JSON/Markdown;
- report `pass`, `warn`, `fail`, or `blocked`;
- leave the operator in control.

They must not edit files, spawn agents, approve memory, or call models by default.

## Deferred Work

No planner/implementer swarm exists in P1 entry. Any future execution role requires an ADR, isolated worktree policy, conflict handling, and operator approval gates.
