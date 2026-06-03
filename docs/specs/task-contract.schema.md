# Task Contract Schema

## Purpose

The task contract turns user intent into a typed artifact before edits.

## Fields

- `id`: deterministic task identifier.
- `rawUserIntent`: exact user task text before trimming.
- `task`: task text.
- `interpretation`: concise KRN interpretation of the task.
- `classification`: `implementation`, `docs`, `research`, `review`, or `unknown`.
- `mode`: `edit`, `read-only`, `review`, or `unknown`.
- `nonTrivial`: basic flag for whether the task is more than a trivial one-word request.
- `acceptance`: acceptance hints.
- `proof`: proof hints.
- `evidenceRequirements`: evidence expected before completion.
- `stopConditions`: typed STOP conditions with `code`, `reason`, and `active`.
- `stop`: whether edits should stop.
- `stopReason`: optional reason when STOP is true.
