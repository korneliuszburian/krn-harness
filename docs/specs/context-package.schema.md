# Context Package Schema

## Purpose

The context package identifies the smallest high-value context Codex should read before editing.

## Fields

- `taskId`: optional task contract id.
- `items`: ranked context entries with `path`, `reason`, `priority`, `bucket`, and `status`.
- `buckets`: named context buckets:
  - `mustRead`
  - `shouldRead`
  - `referenceOnly`
  - `doNotUse`
  - `missingContext`
- `coverage`: P0 scoring placeholders for required/present/missing counts, confidence, and over-inclusion risk.
- `stop`: whether edits must stop.
- `stopReason`: optional STOP explanation.

## P0 Behavior

P0 writes `.krn/current/context-package.md` and `.krn/current/context-package.json`.
