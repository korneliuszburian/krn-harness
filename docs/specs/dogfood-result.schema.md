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
- `ambientKrnCommandPath`: ambient `command -v krn` / `which krn` evidence when captured
- `krnCommandPath`: exact pinned KRN command path used for KRN-assisted runs
- `krnIdentity`: captured `krn doctor cli` output
- `krnIdentityValid`: true only when the identity marker, package marker, and required command list are present
- `globalKrnFallbackUsed`: true when the run used the ambient/global `krn` instead of an exact pinned KRN command
- `krnCommandsObserved`
- `hookTraceEvents`
- `hookEvidenceSource`: `real-codex`, `manual-probe`, `fixture`, or `unknown`
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

The compliance result includes an evidence summary for report rendering:

- required artifacts present/missing
- task contract, context, verify, handoff, current run, and trace paths
- touched files, forbidden touched files, expected untouched violations, and missing commands
- verify status, verify mode, and executed command count
- required, observed, and missing `do-not-use` paths
- context STOP status
- KRN identity validity problems
- ambient-vs-pinned KRN path comparison
- whether global KRN fallback was used

Reports must include the sections `Run Validity`, `KRN CLI Identity`, `Evidence Artifacts`, `Context Quality`, `Forbidden File Safety`, and `Hook Status`.

If `touchedFiles` is empty in the run record, the grader may read `git diff --name-only` from the downstream repo as local evidence.

Missing Codex is represented as a skipped run record. Self-report is not sufficient evidence. A KRN-assisted run with missing or invalid `krn-harness-cli-identity-v1` evidence must be marked failed or invalid, because a global `krn` collision can otherwise masquerade as a KRN Harness benchmark. A KRN-assisted report must mark the run invalid when identity evidence is missing, required commands are missing from `doctor cli`, `krnCommandPath` is empty, the identity marker is absent, or `globalKrnFallbackUsed` is true.

Hook reporting must stay conservative. `hook.received` from a manual probe or fixture is not proof that Codex loaded and trusted project hooks. A report must classify manual probes as diagnostic-only and must not call hooks partially proven unless `hook.received > 0` came from a trusted real non-bypass Codex hook path.

## P0 Limits

Dogfood v0 is local-only and optional. It must not make `pnpm test` or CI depend on Codex CLI, auth, network, or external services. It must not run against the source checkout or use `danger-full-access`, bypass flags, semantic retrieval, embeddings, MCP, dashboard, or a production Codex runner.
