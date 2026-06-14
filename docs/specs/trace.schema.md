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

`cli.status`, `task.started`, `graph.built`, `context.built`, `verify.ran`, `handoff.created`, `install.ran`, `doctor.ran`, `eval.ran`, `review.ran`, `memory.proposed`, `memory.approved`, `memory.deprecated`, `memory.listed`, and `hook.received`.

The local current-state loop records `task.started -> graph.built -> context.built -> verify.ran -> handoff.created -> doctor.ran -> eval.ran -> review.ran` when the operator runs `krn start`, `krn graph`, `krn context`, `krn verify`, `krn handoff`, `krn doctor`, `krn eval`, and `krn review` in order.

## P0 Trace Location

P0 always writes the local global trace stream at `.krn/traces/trace.jsonl`.

When a current task exists, P0 loop commands also append the same event to `.krn/runs/<task_id>/trace.jsonl` and update `.krn/runs/<task_id>/run.json` plus `.krn/runs/<task_id>/summary.md`.

The active run pointer is `.krn/current/run.json`. It records `taskId`, `runDir`, `tracePath`, `runMetadataPath`, and the current artifact paths for task contract, graph artifact, context package, verify result, handoff, doctor result, and eval result.

Minimal run metadata:

- `schemaVersion`
- `taskId`
- `startedAt`
- `lastEventAt`
- `events`
- `artifactPaths`
- `current`

The run summary Markdown records task id, event count, last event, artifact paths, and a local-evidence-only warning.

`krn hook codex <event>` and `krn install` remain global-only P0 events. `krn memory ...` writes global memory trace events and also appends them to the current run trace when a current task exists. Run traces are local evidence only and do not claim production observability.

`install.ran` records status, created/skipped counts, optional reason, and compact action summaries with path/kind/status only. `hook.received` records provider, event, support status, result status, guardrail decision, `enforced: false`, proof-path ownership model, owned proof-path hint limit, trace payload byte limit, compact owned proof-path hints, payload source, detail, finding codes, `operatorMessageVersion`, compact `remediationCodes`, and `tracePayloadMode`. Warned or blocked hook decisions must include finding codes and, for `hook-operator-message-v1` events, remediation codes. Current-model `proof-path-exception` events must include at least one owned proof-path hint, must not use broad hints such as `docs`, `fixtures`, `tests`, or `packages`, must not exceed 4 compact hints, and must stay within the declared 1024-byte trace payload limit.

`verify.ran` records compact verify evidence: `profileName`, `mode`, `status`, `contextStop`, graph and run-trace presence, total/allowed/blocked/executed command counts. It does not record command stdout/stderr or environment.

`hook.received` trace payloads must not include long operator text such as `userFacingMessage` or full `remediationHints`. Those belong in hook command output only.

Hook trace payloads are built through the writer-side `buildHookTracePayload(result)` helper. If the normal compact payload would exceed 1024 bytes, the helper writes a deterministic `tracePayloadMode: "compacted"` fallback with compacted event/detail/hint strings while preserving decision, status, finding codes, and remediation codes.

Memory trace payloads are compact:

- `memory.proposed`: id, pending status, evidence path, and memory store counts.
- `memory.approved`: id, approved status, and memory store counts.
- `memory.deprecated`: id, deprecated status, optional reason, and memory store counts.
- `memory.listed`: memory store counts.
