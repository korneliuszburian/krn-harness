# WP/ACF Dogfood Evidence Handoff

## Summary

KRN Harness now has a synthetic WordPress/ACF-style fixture and deterministic dogfood evidence scaffolding.

This is evidence for realistic fixture behavior, not a production benchmark pass.

## Benchmark Source Head

`0a2f242 feat: harden dogfood readiness workflow`

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

## Repeatable Runner

The paid-call runner is source-controlled as:

```sh
pnpm dogfood:wp-acf
KRN_WP_ACF_INDEX_BENCHMARK_APPROVED=1 pnpm dogfood:wp-acf
```

Without `KRN_WP_ACF_INDEX_BENCHMARK_APPROVED=1`, it writes a skipped report and does not invoke Codex.

With approval, it reads `fixtures/dogfood/tasks/wp-acf-theme-index.json`, runs baseline and `krn-explicit-skill` modes for every indexed task, installs a pinned KRN shim, captures `krn doctor cli` identity evidence for KRN runs, and writes ignored artifacts under `.krn/dogfood/wp-acf-index-*`.

## Real Codex Run Status

Completed for the full WP/ACF task index.

Artifact root:

```txt
.krn/dogfood/wp-acf-index-2026-06-13T16-17-50-020Z
```

Summary files:

```txt
.krn/dogfood/wp-acf-index-2026-06-13T16-17-50-020Z/summary.json
.krn/dogfood/wp-acf-index-2026-06-13T16-17-50-020Z/summary.md
```

## Scores

Paid WP/ACF index run:

```txt
baseline: tasks 0/8, grades 38/117, invalid 0
krn-explicit-skill: tasks 8/8, grades 125/125, invalid 0
```

All eight KRN explicit runs had valid pinned CLI identity evidence and no global KRN fallback.

## Hook Status

Manual hook probe can write `hook.received`.

The WP/ACF task specs in this index set `hooksExpected: false`, so the paid index run does not prove real Codex hook loading/trust.

## Product Decision

KRN now has repeatable, source-controlled evidence that the explicit KRN workflow outperforms the baseline prompt on the local synthetic WordPress/ACF fixture index.

This is still local fixture evidence, not production WordPress proof.

## Recommended Next Goal

```txt
/goal Decide whether to run the first real user-repo dogfood behind explicit KRN_REAL_REPO_DOGFOOD_PATH and KRN_REAL_REPO_DOGFOOD_APPROVED=1, or first close the remaining real Codex hook-loading proof gap.
```
