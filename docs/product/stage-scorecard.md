# Stage Scorecard

## Scope

This scorecard tracks the `GOAL.md` P0 completion and P1 entry sprint. It is evidence for local product readiness, not production readiness.

## Summary

Stages attempted: 23.

Hard boundary violations: none found in the current source-controlled slice.

| Stage | Name | Status | Gate | Evidence integrity | Safety boundary | Operator usefulness | P1 progress | Test coverage | Condensation value | Regression risk | Artifacts | Tests | Decisions | Next |
| ---: | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- | --- |
| 0 | Baseline and product truth audit | pass | passed | 4 | 5 | 4 | 2 | 4 | 3 | low | README, docs, scripts, git status | `pnpm verify:local` | repo truth beats chat truth | continue |
| 1 | P0 exit criteria and P1 entry contract | pass | passed | 4 | 5 | 4 | 4 | 3 | 5 | low | `docs/product/p0-exit-criteria.md`, `docs/product/p1-entry-contract.md` | docs regression | P1 is contract-first | continue |
| 2 | Benchmark summary/report fragility | pass | passed | 4 | 5 | 4 | 2 | 4 | 4 | low | `packages/evals/src/wp-acf-index-benchmark.ts` | eval tests | summary is deterministic | continue |
| 3 | Report validity hardening | pass | passed | 4 | 5 | 4 | 2 | 4 | 4 | low | dogfood renderer/schema docs | eval tests | self-report insufficient | continue |
| 4 | Real-repo preflight | pass | passed | 4 | 5 | 5 | 4 | 4 | 4 | low | `scripts/krn-real-repo-preflight.sh` | CLI tests | preflight before real repo | continue |
| 5 | Real-repo protocol and scaffold | pass | passed | 4 | 5 | 5 | 4 | 4 | 4 | low | `docs/demo/real-repo-dogfood.md`, `scripts/krn-real-repo-dogfood.sh` | CLI tests | report-only scaffold first | continue |
| 6 | First real-repo attempt or exact skip | partial | passed as readiness/skipped | 3 | 5 | 4 | 3 | 3 | 3 | medium | skipped/readiness reports under `.krn/dogfood` | script smoke | no real repo validation claim | harden |
| 7 | Hardening after skipped/blocked/readiness | pass | passed | 4 | 5 | 4 | 3 | 4 | 4 | low | next-action output and tests | CLI tests | readiness is actionable | continue |
| 8 | Reviewer framework v0 | pass | passed | 4 | 5 | 4 | 4 | 4 | 4 | low | `docs/product/reviewers.md`, `krn review --write` | CLI and docs tests | reviewers are deterministic, not agents | continue |
| 9 | Subagent/reviewer contracts | partial | passed as contract | 3 | 5 | 3 | 4 | 3 | 4 | medium | `docs/product/subagent-contracts.md` | docs regression | no autonomous swarm | harden |
| 10 | Operator summary/data model | pass | passed | 4 | 5 | 4 | 4 | 4 | 4 | low | `docs/product/operator-console.md`, `krn summary --write` | CLI and docs tests | summary before UI | continue |
| 11 | Dashboard-lite read-only prototype | partial | ADR accepted, implementation deferred | 3 | 5 | 3 | 3 | 3 | 4 | medium | ADR-0014 | docs regression | static local viewer only | harden |
| 12 | MCP contract spike | partial | ADR accepted, no server | 3 | 5 | 3 | 3 | 3 | 4 | medium | ADR-0015 | docs regression | read-only resources first | harden |
| 13 | Vector/retrieval experiment harness | partial | ADR accepted, no dependency | 3 | 5 | 3 | 3 | 3 | 4 | medium | ADR-0016 | docs regression | synthetic benchmark first | harden |
| 14 | Knowledge condensation engine | partial | passed as workflow | 3 | 5 | 4 | 4 | 3 | 5 | medium | `docs/product/knowledge-condensation.md` | docs regression | review-only proposals | harden |
| 15 | Memory approval UX hardening | partial | docs already enforce no auto-approval | 3 | 5 | 3 | 2 | 3 | 3 | medium | `docs/specs/memory.schema.md` | memory tests | governed memory remains explicit | continue |
| 16 | Real-repo verify advisor | partial | preflight inspects verify profiles | 3 | 5 | 4 | 3 | 4 | 3 | medium | preflight summary shape | CLI tests | inspect, do not execute | continue |
| 17 | Context/graph stress pack | partial | WP/ACF synthetic tasks exist | 4 | 5 | 3 | 2 | 4 | 3 | medium | WP/ACF task index | eval tests | fixture proof only | continue |
| 18 | Downstream adapter hardening | pass | passed | 4 | 5 | 4 | 2 | 4 | 3 | low | adapter templates | adapter tests | hook honesty in templates | continue |
| 19 | Product docs and decision ledger condensation | pass | passed | 4 | 5 | 4 | 4 | 3 | 5 | low | README, ADRs, product docs | docs regression | P0/P1 decisions explicit | continue |
| 20 | Code/API cleanup | partial | not primary slice | 3 | 5 | 3 | 2 | 3 | 2 | medium | no broad cleanup | tests | avoid wide rewrite | harden |
| 21 | Local validation gate | pass | passed | 5 | 5 | 4 | 2 | 5 | 4 | low | `pnpm verify:local` | local gate output | paid calls excluded | continue |
| 22 | P0 completion and P1 entry decision | pass | passed | 4 | 5 | 5 | 5 | 3 | 5 | low | `docs/product/p0-p1-decision.md` | docs regression | P0 complete, P1 entered under constraints | continue |

## Minimums

- Evidence integrity minimum: met for all continued stages.
- Safety boundary minimum: met for all stages.
- P1 lane count: real-repo workflow, reviewers, operator summary, dashboard-lite ADR, MCP ADR, vector/retrieval ADR, subagent/reviewer contracts, knowledge condensation.
