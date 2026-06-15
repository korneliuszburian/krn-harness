# ADR-0019: Queryable Trace Read Model

## Status

Accepted as a P1 contract. Implementation is deferred.

## Context

KRN currently writes trace events as JSONL at `.krn/traces/trace.jsonl` and, for
task-scoped runs, `.krn/runs/<task_id>/trace.jsonl`. ADR-0007 made JSONL the
first eval and audit substrate. ADR-0011 kept current/run evidence local and
explicitly avoided a full run database or daemon during P0.

GOAL-8H TASK-002 asks for queryable trace evidence, likely with SQLite and
`better-sqlite3`, so operators can answer questions such as which runs had
failed verify events without manually parsing trace files.

This is useful, but it adds a new storage layer, a native dependency if
`better-sqlite3` is used, and a likely new CLI surface. Those are too
consequential to smuggle into the runtime without an ADR.

## Decision

Keep JSONL as the canonical write-ahead trace artifact.

Accept a queryable trace read model as a derived local index under `.krn/trace-index/`.
The index may be rebuilt from JSONL and must not become the source of truth.

The first implementation may use SQLite, but it must pass a dependency gate
before adding `better-sqlite3`:

- frozen install passes on local and CI Linux;
- native build/install behavior is understood and documented;
- no install script approval change is required without explicit operator
  approval;
- no trace query can mutate task, context, verify, report, memory, or target
  repository artifacts.

Do not implement `krn traces query` in the ADR slice. A later implementation
slice may add that CLI surface only after tests and spec coverage exist.

## Drivers

- Observability: operators need structured questions over local trace evidence.
- Auditability: JSONL remains easy to inspect, copy, and include in local proof.
- Rebuildability: a corrupt or stale index can be deleted and rebuilt from JSONL.
- Scope control: a native database dependency and new CLI command need explicit
  review.
- Safety: trace queries are read-only projections and must not create production
  or hook-trust claims.

## Consequences

Trace writes stay simple and append-only. Query speed can improve later without
changing the canonical trace contract.

The implementation must handle index staleness. Operators should be able to tell
whether a query result came from a rebuilt current index or a stale/missing one.

Using SQLite creates extra files, commonly including sidecar files when WAL is
enabled. Bundle/report logic must not silently include raw trace databases unless
the spec explicitly allows it.

`better-sqlite3` remains a candidate, not an accepted dependency, until the
dependency gate passes in the implementation PR.

## Alternatives Considered

- Query JSONL directly on every command: accepted as the fallback, but it can
  become slow and makes richer aggregate queries awkward.
- Make SQLite the canonical trace writer immediately: rejected because it
  contradicts ADR-0007/ADR-0011 P0 evidence simplicity and makes corruption or
  native install failures harder to recover from.
- Use Node's built-in `node:sqlite`: deferred because the current Node docs mark
  it as a release-candidate stability API, and KRN should not couple a core
  artifact path to an unstable runtime module yet.
- Add `better-sqlite3` immediately: rejected for this slice because it is a
  native dependency and needs install/CI proof before becoming part of the
  runtime.

## Evidence/Source References

- `docs/adr/ADR-0007-trace-based-evals.md`
- `docs/adr/ADR-0011-local-current-evidence.md`
- `docs/specs/trace.schema.md`
- `packages/trace/src/trace-writer.ts`
- SQLite WAL documentation: https://sqlite.org/wal.html
- SQLite isolation documentation: https://sqlite.org/isolation.html
- Node SQLite documentation: https://nodejs.org/api/sqlite.html
- better-sqlite3 documentation: https://github.com/WiseLibs/better-sqlite3

## Revisit When

Revisit when TASK-002 implementation begins, when CI/install behavior for the
chosen SQLite driver is proven, or when trace volume makes JSONL-only queries
measurably inadequate.
