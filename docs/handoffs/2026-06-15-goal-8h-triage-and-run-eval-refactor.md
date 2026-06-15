# 2026-06-15 GOAL-8H Triage And Eval Refactor

## Scope

`GOAL-8H.md` is a broad external audit/backlog, not active architecture truth.
This handoff distills it against current repo canon before implementation.

Current repo constraints:

- P1 is contract-first.
- `krn run` remains the primary workflow.
- New product surfaces require a contract or ADR first.
- No production proof or hook-trust claim.
- No dashboard server, MCP server, vector DB, embeddings dependency, autonomous
  subagent framework, or publishing pipeline.

## Task Triage

| Task | Decision | Reason |
| --- | --- | --- |
| TASK-001 Zod runtime validation | DEFER | Adds dependency and broad schema migration; needs ADR/spec and dependency justification. |
| TASK-002 SQLite trace store | DEFER | Adds dependency and new query surface; outside current local JSONL proof loop without ADR. |
| TASK-003 interrupt/resume | DEFER | Adds `krn resume` and run checkpoint semantics; needs architecture decision. |
| TASK-004 hook structured-output validation | DEFER | Changes hook semantics while hook trust remains unproven. |
| TASK-005 eval regression baseline | DEFER | Adds eval persistence/flag semantics; needs spec and baseline policy. |
| TASK-006 context budget manager | DEFER | Plausible context-engineering slice, but should be driven by real target context findings. |
| TASK-007 run-eval refactor | IMPLEMENTED | No new surface or dependency; already listed in refactor backlog. |
| TASK-008 hook trust proof | DEFER | Requires separate explicit approval and disposable non-protected target. |
| TASK-009 graph-lite dependency evidence | DEFER | Adds graph behavior and CLI option; needs graph-lite contract update first. |
| TASK-010 skill invocation docs | ACCEPT FUTURE DOC SLICE | Documentation-only and aligned, but separate from eval refactor. |
| TASK-011 context poisoning ADR/sanitizer | ACCEPT ADR FIRST | Security ADR is plausible; implementation needs package-boundary design. |
| TASK-012 `krn diff` | DEFER | New top-level command; not accepted by current backlog. |
| TASK-013 downstream AGENTS quality gate | ACCEPT FUTURE SMALL SLICE | Aligns install lifecycle; should start with tests and existing templates. |

## Implemented Slice

TASK-007 was implemented by splitting `packages/evals/src/run-eval.ts` while
preserving the public `./run-eval.js` import path:

- `run-eval.ts` is now a facade.
- `run-eval-core.ts` owns orchestration.
- `run-eval-reporters.ts` owns Markdown rendering.
- `run-eval-validators.ts` owns graph/downstream/verify validators.
- `run-eval-hook-validator.ts` owns hook guardrail validation.
- `run-eval-memory-validator.ts` owns memory governance validation.
- `run-eval-types.ts` owns shared eval result types.

All split files are under 500 lines.

## Proof

Focused proof before final validation:

- `pnpm typecheck`: pass.
- `pnpm --silent vitest run packages/evals/src/run-eval.test.ts`: 1 file, 4 tests pass.
- `pnpm --silent krn eval`: pass, 6 fixtures.

## Residual Risk

The remaining GOAL-8H tasks are not complete. Most are deliberate future P1/P2
or ADR-first slices, not safe to implement directly from scratch text.
