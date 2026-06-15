# Trace Query Store

## Purpose

The trace query store is a future derived local index for querying KRN trace
events. It does not replace trace JSONL.

## Source Of Truth

Canonical trace data remains:

- `.krn/traces/trace.jsonl`
- `.krn/runs/<task_id>/trace.jsonl`

The query store must be rebuildable from those files. If index state conflicts
with JSONL state, JSONL wins.

## Location

Future implementations should write derived query artifacts under:

`.krn/trace-index/`

The directory is local runtime state. It is not source, not production proof,
and not hook-trust proof.

## Minimal Event Table

If SQLite is used, the first table should preserve the trace event without
expanding every payload field:

```sql
CREATE TABLE trace_events (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  name TEXT NOT NULL,
  task_id TEXT,
  source_path TEXT NOT NULL,
  payload_json TEXT NOT NULL
);
```

Recommended indexes:

```sql
CREATE INDEX trace_events_task_id_idx ON trace_events(task_id);
CREATE INDEX trace_events_name_idx ON trace_events(name);
CREATE INDEX trace_events_timestamp_idx ON trace_events(timestamp);
```

## Query Semantics

Queries are read-only. A query command may build or refresh the derived index,
but it must not mutate task contracts, context packages, verify results, memory
stores, report bundles, source files, or target repositories.

Expected first query filters:

- task id;
- event name;
- timestamp range;
- source path scope: global trace, run trace, or both.

Expected first output fields:

- event id;
- timestamp;
- name;
- task id;
- source path;
- compact JSON payload.

## Staleness

Query output must state whether the index was rebuilt, current, stale, or
missing. Stale or missing index state is not a failure if the command can rebuild
from JSONL.

## Dependency Gate

Before adding `better-sqlite3` or any other SQLite driver:

- `pnpm install --frozen-lockfile` passes locally and in CI;
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm verify:local` pass;
- native build behavior and install-script implications are documented;
- bundle/report code is checked so raw trace database files are not copied into
  proof bundles by accident.

## Non-Goals

- No hosted database.
- No daemon.
- No dashboard.
- No vector or embedding layer.
- No production observability claim.
- No hook-trust claim.
