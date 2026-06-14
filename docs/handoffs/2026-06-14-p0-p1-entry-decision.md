# P0/P1 Entry Decision Handoff

## Summary

KRN Harness has completed the local deterministic P0 loop and entered P1 under contract-first constraints.

This handoff does not claim production readiness.

## Current Decision

- P0 decision: complete for the local deterministic harness loop.
- P1 decision: entered under gated, local, artifact-first contracts.
- Real-repo status: preflight and report-only dogfood scaffold exist; no real user-repo execution has been validated.
- Hook status: real Codex hook loading/trust remains unproven.

## P1 Lanes Started

- Real-repo workflow: `scripts/krn-real-repo-preflight.sh`, `scripts/krn-real-repo-dogfood.sh`.
- Reviewers: `docs/product/reviewers.md`, `krn review`.
- Operator summary: `docs/product/operator-console.md`.
- Dashboard-lite: ADR-0014, static local report viewer only.
- MCP: ADR-0015, read-only contract only, no server.
- Vector/retrieval: ADR-0016, synthetic experiment only, no dependency.
- Subagent/reviewer contracts: `docs/product/subagent-contracts.md`.
- Knowledge condensation: `docs/product/knowledge-condensation.md`.

## Scorecard

See `docs/product/stage-scorecard.md`.

Stages attempted: 23.

Hard boundary violations: none found in source-controlled work.

## Evidence

- Full WP/ACF paid benchmark: baseline `0/8`, KRN explicit `8/8`, invalid `0`.
- Local validation gate: `pnpm verify:local`.
- Real-repo scaffold skip/readiness states: `scripts/krn-real-repo-dogfood.sh`.
- P0/P1 decision: `docs/product/p0-p1-decision.md`.

## Known Gaps

- No approved real user-repo dogfood execution yet.
- No real Codex `hook.received` proof from non-bypass hook loading.
- Dashboard-lite has ADR only, no generated HTML implementation.
- MCP has ADR only, no server.
- Retrieval/vector has ADR only, no experiment harness implementation.
- Reviewers now emit deterministic local artifact records, but their operator usefulness beyond first records remains unproven.
- Condensation is workflow-only, not executable `krn condense`.

## Next Recommended Goal

Implement one executable P1 artifact at a time, starting with deterministic reviewer records or an operator summary JSON renderer. Keep dashboard-lite, MCP, and retrieval behind their ADR boundaries until the artifact schema is stable.
