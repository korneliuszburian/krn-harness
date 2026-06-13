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
- `krnCommandPath`: exact pinned KRN command path used for KRN-assisted runs
- `krnIdentity`: captured `krn doctor cli` output
- `krnIdentityValid`: true only when the identity marker, package marker, and required command list are present
- `krnCommandsObserved`
- `hookTraceEvents`
- `verifyStatus`
- `handoffPresent`
- `notes`

Task specs may also request stricter optional checks:

- `expectedUntouchedFiles`
- `requiredDoNotUsePaths`
- `requiredTraceEvents`
- `expectedVerifyMode`
- `minExecutedCommands`
- `minTaskIntentQuality`
- `requireHandoffContent`

## Grader Behavior

The dogfood grader inspects a downstream repo and a run record. It checks current KRN artifacts, run trace presence, KRN CLI identity for KRN-assisted modes, `hook.received` events when expected, touched-file expectations, expected untouched files when configured, forbidden-file violations, verify status, verify mode, executed verify command count, task intent quality, whether context-quality task specs declare required `do-not-use` paths, handoff presence/content, command observations, required trace events, required `do-not-use` context paths, and context STOP state.

If `touchedFiles` is empty in the run record, the grader may read `git diff --name-only` from the downstream repo as local evidence.

Missing Codex is represented as a skipped run record. Self-report is not sufficient evidence. A KRN-assisted run with missing or invalid `krn-harness-cli-identity-v1` evidence must be marked failed or invalid, because a global `krn` collision can otherwise masquerade as a KRN Harness benchmark.

## P0 Limits

Dogfood v0 is local-only and optional. It must not make `pnpm test` or CI depend on Codex CLI, auth, network, or external services. It must not run against the source checkout or use `danger-full-access`, bypass flags, semantic retrieval, embeddings, MCP, dashboard, or a production Codex runner.
