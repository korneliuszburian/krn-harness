# Task Contract Schema

## Purpose

The task contract turns user intent into a typed artifact before edits.

## Fields

- `id`: deterministic task identifier.
- `rawUserIntent`: exact user task text before trimming.
- `task`: task text.
- `intentQuality`: deterministic `low`, `medium`, or `high` signal for whether the task text is rich enough to build useful context.
- `intentWarnings`: non-blocking warnings such as slug-only or very short task starts.
- `metadata`: optional local task-spec metadata such as expected touched files, forbidden touched files, and required do-not-use paths.
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
