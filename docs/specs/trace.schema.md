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

`cli.status`, `task.started`, `graph.built`, `context.built`, `verify.ran`, `handoff.created`, `install.ran`, `doctor.ran`, `eval.ran`, and `hook.received`.

The P0 current-state loop records `task.started -> graph.built -> context.built -> verify.ran -> handoff.created -> doctor.ran -> eval.ran` when the operator runs `krn start`, `krn graph`, `krn context`, `krn verify`, `krn handoff`, `krn doctor`, and `krn eval` in order.

## P0 Trace Location

P0 always writes the local global trace stream at `.krn/traces/trace.jsonl`.

When a current task exists, P0 loop commands also append the same event to `.krn/runs/<task_id>/trace.jsonl` and update `.krn/runs/<task_id>/run.json`.

The active run pointer is `.krn/current/run.json`. It records `taskId`, `runDir`, `tracePath`, `runMetadataPath`, and the current artifact paths for task contract, graph artifact, context package, verify result, handoff, doctor result, and eval result.

Minimal run metadata:

- `schemaVersion`
- `taskId`
- `startedAt`
- `lastEventAt`
- `events`
- `artifactPaths`
- `current`

`krn hook codex <event>` and `krn install` remain global-only P0 events. Run traces are local evidence only and do not claim production observability.
