# ADR-0012: Future Codex Exec Wrapper

## Status

Proposed.

## Context

Codex exposes non-interactive commands, but KRN Harness P0 evals are deterministic harness-only checks. Launching Codex from KRN would introduce auth, sandbox, mutation, timeout, trace, and protected-data questions that are not solved by the current P0 runtime.

## Decision

Do not implement a Codex exec wrapper in P0.

A future wrapper may be considered only as a local dry-run/no-mutation path after this ADR is replaced or accepted with concrete policy for:

- auth and account selection;
- sandbox and approval mode;
- mutation policy and writable paths;
- timeout and output limits;
- trace payload shape;
- protected data redaction;
- local-only dry-run evidence;
- no CI dependency on Codex CLI availability.

## Consequences

`krn eval` remains harness-only. It must not launch Codex, require Codex auth, mutate repositories through Codex, or claim non-interactive agent evaluation.

Docs may mention local feasibility evidence, but product behavior must describe this as future work.

## Alternatives Considered

- Implement a P0 Codex runner now: rejected as too much policy and trust-boundary surface.
- Depend on Codex CLI in CI: rejected because KRN P0 validation must be repo-local and deterministic.
- Ignore non-interactive Codex entirely: rejected because future dry-run evidence may be useful after policy is explicit.

## Evidence/Source References

- `docs/specs/codex-noninteractive-feasibility.md`
- https://developers.openai.com/codex/noninteractive

## Revisit When

Revisit after downstream fixture acceptance, trace budgets, and verify evidence are stable enough to evaluate a no-mutation dry-run wrapper.
