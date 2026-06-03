# Trace Schema

## Purpose

Trace JSONL records auditable KRN runtime events.

## Fields

- `id`: trace event id.
- `timestamp`: ISO timestamp.
- `name`: event name.
- `taskId`: optional task id.
- `data`: optional JSON object.

## P0 Events

`cli.status`, `task.started`, `context.built`, `verify.ran`, `handoff.created`, `doctor.ran`, `eval.ran`, and `hook.received`.

## P0 Trace Location

P0 writes a single local trace stream at `.krn/traces/trace.jsonl`. Run-scoped traces under `.krn/runs/<task_id>/trace.jsonl` are the intended next shape once run lifecycle semantics exist; they are deferred to P1 to avoid inventing a broader run model before current-state artifacts are proven.
