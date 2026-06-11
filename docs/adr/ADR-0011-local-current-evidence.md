# ADR-0011: Local Current Evidence Artifacts

## Status

Accepted.

## Context

P0 now has a local loop that produces current task, graph, context, verify, handoff, doctor, and eval artifacts. Operators need inspectable evidence without adding a daemon, database, hosted service, or production observability stack.

## Decision

Keep the global trace at `.krn/traces/trace.jsonl` and add run-scoped local evidence at `.krn/runs/<task_id>/trace.jsonl` plus `.krn/runs/<task_id>/run.json`.

Use `.krn/current/run.json` as the current run pointer.

Use `.krn/graph/repo-graph.json` and `.krn/graph/repo-graph.md` as P0 graph-lite evidence artifacts.

## Consequences

The loop is easier to inspect and test because current-state artifacts and run-scoped traces point to the same task. This remains local evidence only; it is not telemetry, monitoring, CI, or a production audit system.

## Alternatives Considered

- Global trace only: rejected because current task evidence becomes harder to isolate.
- Full run database or daemon: rejected as P0 scope creep.
- Graph in context only with no graph artifact: rejected because graph-fed context would be hard to review independently.

## Evidence/Source References

- ADR-0002 runtime layout.
- ADR-0005 graph-lite before AST.
- ADR-0007 trace-based evals.

## Revisit When

Revisit when run lifecycle semantics need retention, pruning, concurrency, or external reporting.
