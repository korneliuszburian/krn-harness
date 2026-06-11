# Eval Result Schema

## Purpose

`krn eval` runs deterministic harness-only fixture checks without invoking Codex, external services, or project commands.

## Current Artifacts

- `.krn/current/eval-result.json`
- `.krn/current/eval-result.md`

The Markdown artifact contains Summary, Fixture Results, Graph Coverage, Memory Governance, Trace Coverage, Failures, and P0 Limits sections.

## Fields

- `status`: `pass` or `fail`.
- `passCount`: number of passing grader results.
- `failCount`: number of failing grader results.
- `fixtures`: per-fixture task, status, and grader results.
- `graph`: graph behavior grader result.
- `graphArtifact`: generated graph artifact shape grader result.
- `memory`: governed memory grader result.
- `trace`: local trace completeness grader result.
- `runTraceMode`: `run-scoped`, `global`, or `missing`.

## P0 Fixtures

- `frontend-section-context`: expected must-read context coverage.
- `stale-doc-trap`: deprecated docs must stay in `do-not-use`.
- `missing-context-stop`: missing required context must produce STOP.

## P0 Rule

Eval uses fixture-built task contracts and context packages only. It is not a real non-interactive agent runner.

The memory grader is harness-only. It verifies that pending memory is inactive, approved memory is active, and deprecated memory is excluded.
