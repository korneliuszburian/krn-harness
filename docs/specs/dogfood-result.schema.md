# Dogfood Result Schema

## Purpose

Dogfood run records compare baseline Codex and KRN-assisted Codex runs using local artifacts.

## Fields

- `runId`
- `mode`: `baseline`, `krn-explicit-skill`, `krn-implicit-skill`, or `krn-agents-only`
- `taskId`
- `codexAvailable`
- `codexCommand`
- `startedAt`
- `finishedAt`
- `status`: `pass`, `fail`, or `skipped`
- `touchedFiles`
- `forbiddenTouchedFiles`
- `requiredArtifactsPresent`
- `krnCommandsObserved`
- `hookTraceEvents`
- `verifyStatus`
- `handoffPresent`
- `notes`

## Grader Behavior

The dogfood grader inspects a downstream repo and a run record. It checks current KRN artifacts, run trace presence, `hook.received` events when expected, touched-file expectations, forbidden-file violations, verify status, handoff presence, command observations, and context STOP state.

Missing Codex is represented as a skipped run record. Self-report is not sufficient evidence.

## P0 Limits

Dogfood v0 is local-only and optional. It must not make `pnpm test` or CI depend on Codex CLI, auth, network, or external services. It must not run against the source checkout or use `danger-full-access`, bypass flags, semantic retrieval, embeddings, MCP, dashboard, or a production Codex runner.
