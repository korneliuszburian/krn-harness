# External Audit Triage 2026-06-16

## Scope

This triage classifies the external TASK-001..014 audit list for the real target
repeat goal. It does not implement any audit task.

Allowed classifications:
`NOW_DOCS_ONLY`, `NEXT_AFTER_TARGET_REPEAT`, `GATED_NEEDS_ADR_OR_APPROVAL`,
`OUTDATED_ALREADY_DONE`, `REJECTED_FOR_V0_1`.

## Decisions

| Task | Classification | Decision |
| --- | --- | --- |
| TASK-001 LLM-as-Judge | GATED_NEEDS_ADR_OR_APPROVAL | External/model dependency and grading policy change. Keep deterministic evals first. |
| TASK-002 OTEL traces | GATED_NEEDS_ADR_OR_APPROVAL | Adds SDK/export dependency and external observability semantics. No dependency now. |
| TASK-003 memory TTL/tier retrieval | REJECTED_FOR_V0_1 | Memory remains manual governed recall; TTL/tier retrieval is growth work. |
| TASK-004 context budget | OUTDATED_ALREADY_DONE | Deterministic context budget exists in ADR-0022, schema docs, tests, and context artifacts. |
| TASK-005 graph-lite dependency resolution / DOT | GATED_NEEDS_ADR_OR_APPROVAL | Module dependency evidence already exists; DOT/new graph output surface remains gated. |
| TASK-006 threat model / hook verify | NEXT_AFTER_TARGET_REPEAT | Threat model docs can follow target repeat; `krn hook verify` is rejected here as new surface/hook-trust work. |
| TASK-007 structured handoff/resume prompt | GATED_NEEDS_ADR_OR_APPROVAL | Resume/structured handoff must not pull product center away from `krn run`. |
| TASK-008 runHash / run compare | NEXT_AFTER_TARGET_REPEAT | Run hash can be considered after repeat evidence; `krn run --compare` is rejected here as new surface. |
| TASK-009 changesets | REJECTED_FOR_V0_1 | Publishing/release automation boundary. |
| TASK-010 package exports/publint | REJECTED_FOR_V0_1 | Package distribution/publishing-gated polish, not local v0.1 proof. |
| TASK-011 golden eval corpus | NEXT_AFTER_TARGET_REPEAT | Deterministic corpus should precede any LLM judge. |
| TASK-012 CI badge/coverage | REJECTED_FOR_V0_1 | CI exists; badge/Codecov/coverage polish is external and not target-repeat proof. |
| TASK-013 config inheritance | NEXT_AFTER_TARGET_REPEAT | Consider only if target repeat shows verify-profile copy/paste pain. |
| TASK-014 memory/eval ADRs | NEXT_AFTER_TARGET_REPEAT | Update existing ADRs/specs after target findings; avoid duplicate ADRs. |

## Evidence Used

- `docs/product/goal-8h-roadmap.md`: GOAL-8H completed/gated task state.
- `docs/adr/ADR-0022-context-budget-manager.md` and `docs/specs/context-package.schema.md`: context budget is implemented.
- `docs/specs/graph-lite.md`: module dependency evidence exists; DOT output is not current surface.
- `docs/specs/memory.schema.md`: memory is manual governed recall without TTL/tier retrieval.
- `docs/specs/hooks-pack.md` and ADR-0004: hooks remain diagnostic with `enforced: false`.

## Rule For This Goal

Do not implement any TASK-001..014 feature in the target-repeat goal. Use this
file only to route future work after real target repeat evidence.
