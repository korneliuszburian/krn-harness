# Task Contract Schema

## Purpose

The task contract turns user intent into a typed artifact before edits.

## Fields

- `id`: deterministic task identifier.
- `task`: task text.
- `classification`: `implementation`, `docs`, `research`, `review`, or `unknown`.
- `acceptance`: acceptance hints.
- `proof`: proof hints.
- `stop`: whether edits should stop.
- `stopReason`: optional reason when STOP is true.
