# ADR-0021: Eval Regression Baseline

## Status

Accepted.

## Context

GOAL-8H TASK-005 asks for an automated regression baseline in evals. Current
`krn eval` already writes deterministic harness-only fixture evidence to
`.krn/current/eval-result.json` and `.krn/current/eval-result.md`, but it does
not preserve a local previous-run baseline for regression comparison.

The roadmap requires a baseline artifact before CLI flags. That matters because
`krn eval --compare-baseline` would be new operator-facing CLI behavior, while a
rolling local artifact can harden evidence without broadening the command
surface.

ADR-0007 keeps evals trace-based and harness-only. ADR-0012 keeps Codex
non-interactive execution out of P0. Therefore the first baseline compares local
KRN eval grader results only; it must not become a model benchmark, production
proof, hook trust proof, or CI dependency on Codex.

## Decision

`krn eval` writes a rolling local baseline artifact on every eval run:

- `.krn/evals/baseline.json`;
- `.krn/current/eval-baseline.json`.

The artifact schema is `krn-eval-baseline-v1`.

The baseline compares the current flattened eval grade statuses to the previous
rolling baseline when one exists. It reports `created`, `unchanged`, `changed`,
`improved`, or `regressed`, plus changed grade keys.

Do not add `krn eval --compare-baseline` in this slice. A later CLI flag may be
considered only after the artifact shape proves useful and the operator-facing
exit-code semantics are specified.

## Drivers

- Regression visibility: local fixture evidence should show whether grader
  status got worse versus the previous local run.
- Scope control: write an artifact before adding a flag or exit-code policy.
- Determinism: compare stable grade keys and pass/fail status, not raw Markdown.
- Honesty: baseline output remains local harness-only evidence.

## Consequences

`krn eval` now mutates `.krn/evals/baseline.json` as local runtime state. This is
not source and must not be committed.

The first baseline is rolling-last-run, not an approved golden baseline. A
regressed run is reported in the artifact, but `krn eval` still exits according
to current eval status. Future work can decide whether comparison status should
affect exit codes.

The run/report bundle story remains unchanged. The baseline artifact is current
runtime evidence, not production proof.

## Alternatives Considered

- Add `krn eval --compare-baseline` immediately: rejected because the roadmap
  requires the artifact contract first and flag semantics need explicit policy.
- Store every eval history entry: deferred because retention, pruning, and
  artifact size policy are separate concerns.
- Store a manually approved golden baseline: deferred because approval workflow
  would add operator policy beyond this slice.
- Compare full JSON result objects: rejected because harmless detail wording or
  ordering changes would create noisy regressions.

## Evidence/Source References

- `docs/adr/ADR-0007-trace-based-evals.md`
- `docs/adr/ADR-0012-future-codex-exec-wrapper.md`
- `docs/specs/eval-result.schema.md`
- `docs/specs/eval-baseline.schema.md`
- `packages/evals/src/run-eval-core.ts`
- OpenAI agent improvement loop cookbook: https://developers.openai.com/cookbook/examples/agents_sdk/agent_improvement_loop

## Revisit When

Revisit after several local runs show whether rolling-last-run is sufficient,
before adding any `krn eval` comparison flag, or before making baseline
comparison affect exit codes.
