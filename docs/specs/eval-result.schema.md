# Eval Result Schema

## Purpose

`krn eval` runs deterministic harness-only fixture checks without invoking Codex, external services, or project commands.

## Current Artifacts

- `.krn/current/eval-result.json`
- `.krn/current/eval-result.md`

The Markdown artifact contains Summary, Fixture Results, Graph Coverage, Hook Guardrails, Memory Governance, Trace Coverage, Failures, and P0 Limits sections.

## Fields

- `status`: `pass` or `fail`.
- `passCount`: number of passing grader results.
- `failCount`: number of failing grader results.
- `fixtures`: per-fixture task, status, and grader results.
- `graph`: graph behavior grader result.
- `graphArtifact`: generated graph artifact shape grader result.
- `hooks`: hook guardrail fixture matrix grader result.
- `memory`: governed memory grader result.
- `trace`: local trace completeness grader result.
- `runTraceMode`: `run-scoped`, `global`, or `missing`.

## P0 Fixtures

- `frontend-section-context`: expected must-read context coverage.
- `stale-doc-trap`: deprecated docs must stay in `do-not-use`.
- `missing-context-stop`: missing required context must produce STOP.
- `fixtures/hooks/guardrail-matrix.json`: expected hook `allow`/`warn`/`block` decisions and trace finding codes.

## P0 Rule

Eval uses fixture-built task contracts and context packages only. It is not a real non-interactive agent runner.

The memory grader is harness-only. It verifies that pending memory is inactive, approved memory is active only through the context gate, deprecated memory is excluded, unrelated approved memory does not leak, broad single-term matches do not surface memory, English and Polish explicit opt-out suppress memory, Polish explicit approved-memory requests work only through the reference-only gate, and surfaced approved memory carries provenance.

The hook grader is harness-only. It loads the deterministic guardrail matrix and checks blocked, warned, and allowed decisions, scoped proof-path exceptions, `enforced: false`, and expected trace finding-code payloads without invoking Codex or relying on a live hook run.
