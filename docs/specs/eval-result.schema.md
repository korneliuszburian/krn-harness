# Eval Result Schema

## Purpose

`krn eval` runs deterministic harness-only fixture checks without invoking Codex, external services, or project commands.

## Current Artifacts

- `.krn/current/eval-result.json`
- `.krn/current/eval-result.md`

The Markdown artifact contains Summary, Graph Coverage, Downstream Acceptance, Hook Guardrails, Memory Governance, Fixture Results, Trace Coverage, Failures, and P0 Limits sections.

## Fields

- `status`: `pass` or `fail`.
- `passCount`: number of passing grader results.
- `failCount`: number of failing grader results.
- `fixtures`: per-fixture task, status, and grader results.
- `graph`: graph behavior grader result.
- `graphArtifact`: generated graph artifact shape grader result.
- `downstream`: downstream onboarding acceptance grader result.
- `verify`: verify profile and policy grader result.
- `hooks`: hook guardrail fixture matrix grader result.
- `memory`: governed memory grader result.
- `trace`: local trace completeness grader result.
- `runTraceMode`: `run-scoped`, `global`, or `missing`.

## P0 Fixtures

- `frontend-section-context`: expected must-read context coverage.
- `stale-doc-trap`: deprecated docs must stay in `do-not-use`.
- `missing-context-stop`: missing required context must produce STOP.
- `downstream-basic-package-context`: package-owned source/test/config/doc context from graph-lite must be selected without leaking from fixture-specific prefixes.
- `fixtures/hooks/guardrail-matrix.json`: expected hook `allow`/`warn`/`block` decisions, trace finding codes, compact remediation codes, and selected English/Polish operator wording.
- `fixtures/hooks/remediation-taxonomy.json`: stable remediation-code list, English/Polish hints, and finding-code mappings.
- `fixtures/repos/downstream-basic`: tiny downstream repo shape for onboarding acceptance checks.

## P0 Rule

Eval uses fixture-built task contracts and context packages only. It is not a real non-interactive agent runner.

The memory grader is harness-only. It verifies that pending memory is inactive, approved memory is active only through the context gate, deprecated memory is excluded, unrelated approved memory does not leak, broad single-term matches do not surface memory, English and Polish explicit opt-out suppress memory, Polish explicit approved-memory requests work only through the reference-only gate, and surfaced approved memory carries provenance.

The hook grader is harness-only. It loads the deterministic guardrail matrix and remediation taxonomy fixture, then checks blocked, warned, and allowed decisions, false-positive ownership collisions, compact owned hint lists, package-owned proof fixtures, cross-package proof-path blocks, unowned proof-path blocks, `enforced: false`, the P0 proof-path ownership model, expected ownership hints, declared hint and byte limits, selected English/Polish operator wording, compact remediation codes, writer-side compact trace payload shape, and expected trace finding-code payloads without invoking Codex or relying on a live hook run.

The downstream acceptance grader is harness-only. It checks fixture shape and generated AGENTS/hooks/runtime skill template contracts without installing into the source checkout, invoking Codex, or running downstream project commands.

The verify grader is harness-only. It checks safe record-only profile behavior, unsafe command blocking, output limits, and deterministic `execute` behavior using a tiny local node fixture. It does not run downstream project commands.

The graph grader is harness-only. It checks shallow graph-lite node/relation kinds, graph-fed context selection, package-owned source/test/config/doc relations, downstream package context selection, and no-graph leakage prevention. It must not rely on AST, import graph, Tree-sitter, embeddings, or semantic retrieval.
