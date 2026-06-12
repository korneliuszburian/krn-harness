# WP/ACF Dogfood Evidence Handoff

## Summary

KRN Harness now has a synthetic WordPress/ACF-style fixture and deterministic dogfood evidence scaffolding.

This is evidence for realistic fixture behavior, not a production benchmark pass.

## Current Head

`0b7de00 docs: record dogfood evidence status`

## Fixture

`fixtures/repos/wordpress-acf-theme`

The fixture is intentionally static:

- no WordPress runtime
- no PHP runtime
- no Composer install
- no network
- no protected data

It includes theme-like PHP files, ACF-like JSON, CSS, JS, current docs, stale docs, legacy ACF config, and `tests/theme.test.js`.

## Task Specs

The WP/ACF task index is `fixtures/dogfood/tasks/wp-acf-theme-index.json`.

Covered task types:

- hero copy
- ACF field mapping
- CSS token change
- JS data attribute change
- stale doc trap
- missing context STOP
- package-owned source/test context
- handoff-required completion

## Graph And Context Behavior

Validated behavior:

- active hero source/config is selected as context
- paired package test is selected as supporting proof
- stale docs are `do-not-use`
- `acf/legacy_group.json` is `do-not-use`
- broad WordPress/ACF terms do not promote the entire fixture
- neighboring fixture docs do not leak into selected package context

## Verify Behavior

Manual temp fixture smoke:

```txt
KRN verify: pass
profile: unit
mode: execute
commands: 1
executed: 1
```

## Dogfood Grader Behavior

The grader now supports optional realistic-task checks:

- expected untouched files
- required do-not-use paths
- required trace events
- verify mode
- minimum executed command count
- handoff content
- touched files from `git diff --name-only` when the run record omits them

## Real Codex Run Status

Skipped.

Reason: the active goal forbids paid model calls. No real Codex WP/ACF baseline-vs-KRN comparison was executed.

## Scores

No WP/ACF baseline/KRN scores were produced in this slice.

The existing tiny fixture evidence remains:

- baseline: 5/10 fail
- krn-agents-only: 10/10 pass
- krn-explicit-skill: 10/10 pass
- krn-implicit-skill: 10/10 pass

## Hook Status

Manual hook probe can write `hook.received`.

Real Codex hook loading/trust remains unproven until a non-bypass Codex run emits `hook.received`.

## Product Decision

KRN now has acceptable local fixture evidence that its graph/context/verify/handoff loop works on a more realistic WordPress/ACF-style repository.

Do not claim KRN improves real WordPress/ACF Codex execution until a paid-call-approved comparison run is collected and graded.

## Recommended Next Goal

```txt
/goal Run the paid-call-approved WordPress/ACF dogfood comparison: baseline vs krn-explicit-skill on fixtures/repos/wordpress-acf-theme, collect grader records, verify artifacts, handoff artifacts, touched files, stale-doc violations, and hook.received status without bypass.
```
