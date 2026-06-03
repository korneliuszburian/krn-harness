# Eval Result Schema

## Purpose

`krn eval` runs deterministic harness-only fixture checks without invoking Codex, external services, or project commands.

## Current Artifacts

- `.krn/current/eval-result.json`
- `.krn/current/eval-result.md`

## Fields

- `status`: `pass` or `fail`.
- `passCount`: number of passing grader results.
- `failCount`: number of failing grader results.
- `fixtures`: per-fixture task, status, and grader results.
- `trace`: local trace completeness grader result.

## P0 Fixtures

- `frontend-section-context`: expected must-read context coverage.
- `stale-doc-trap`: deprecated docs must stay in `do-not-use`.
- `missing-context-stop`: missing required context must produce STOP.

## P0 Rule

Eval uses fixture-built task contracts and context packages only. It is not a real non-interactive agent runner.
