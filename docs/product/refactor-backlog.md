# Refactor Backlog

## Purpose

This backlog records large-file refactors that should wait for characterization tests and real dogfood evidence. It is not permission for a broad rewrite during audit hardening.

## `packages/doctor/src/doctor.ts`

Current responsibility:

- validates current artifacts, downstream install state, hook traces, memory state, verify config, and source/downstream boundaries.

Proposed modules:

- `artifact-checks.ts` for current artifact presence and schema-oriented checks;
- `downstream-checks.ts` for install/template acceptance;
- `hook-trace-checks.ts` for `hook.received` payload validation;
- `memory-checks.ts` for governed memory store checks;
- `verify-profile-checks.ts` for command policy and profile checks.

Tests needed before extraction:

- characterization tests for every current doctor check name, status, detail, and next action;
- fixture tests for legacy hook traces, malformed hook payloads, unsafe verify profiles, and memory poisoning.

Risk:

- changing check names or wording can break operator review, docs regression, and downstream acceptance evidence.

Stop condition:

- stop the refactor if check output changes without an intentional schema/spec update.

## `packages/context/src/build-context-package.ts`

Current responsibility:

- builds context buckets from base docs, graph-lite selections, memory gates, stale/deprecated markers, missing context, compactness limits, and coverage/over-inclusion scoring.

Proposed modules:

- `base-items.ts` for repo-level canonical docs;
- `graph-selection.ts` for graph-to-context mapping;
- `memory-selection.ts` for approved memory inclusion and opt-out handling;
- `bucket-rules.ts` for must/should/reference/do-not-use/missing assignment;
- `context-metrics.ts` for coverage and over-inclusion scoring.

Tests needed before extraction:

- characterization tests for bucket assignment, hidden item counts, memory opt-out, stale doc leakage, and over-inclusion risk;
- downstream fixture tests for missing base docs so generated context does not mark absent files as active truth.

Risk:

- subtle selection-order changes can pollute active context or hide required evidence.

Stop condition:

- stop the refactor if context package JSON changes for existing fixtures without a reviewed before/after rationale.

## `packages/hooks/src/codex-hook-entry.ts`

Current responsibility:

- parses Codex hook payloads, builds current hook state decisions, computes ownership hints, finding codes, remediation codes, operator messages, and compact trace payloads.

Proposed modules:

- `payload-parser.ts` for event payload parsing;
- `decision-engine.ts` for allow/warn/block guardrail logic;
- `ownership-hints.ts` for proof-path ownership and hint compaction;
- `operator-message.ts` for localized human guidance;
- `trace-payload.ts` for compact trace serialization.

Tests needed before extraction:

- guardrail matrix characterization for every fixture case;
- trace payload byte-limit tests;
- remediation taxonomy tests;
- regression tests that `enforced: false` remains until a later ADR accepts real enforcement.

Risk:

- splitting the file can accidentally change hook truth semantics or make blocked decisions look enforced.

Stop condition:

- stop the refactor if any hook fixture result changes without a new ADR/spec update and explicit operator review.
