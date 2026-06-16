# 2026-06-16 Final Monolith Burn-Down Result

## Summary

- Previous active tracked/source bloat flags: `8`.
- New active tracked/source bloat flags: `2`.
- `krn run` remains the primary workflow.
- No new top-level commands or bundle variants were added.
- No GOAL-8H gated TASK-002/003/004/008/012 work was implemented.
- No trace query store, resume semantics, `krn diff`, hook-trust work, MCP, vector DB, embeddings, dashboard, subagents, publishing, production runner, or production proof claim was added.

## Disposition

| File | Disposition |
| --- | --- |
| `.gitignore` | INTENTIONAL_KEEP_WITH_REASON: protected operator scratch; left untouched and unstaged |
| `pnpm-lock.yaml` | INTENTIONAL_KEEP_WITH_REASON: generated lockfile; not hand-edited |
| `packages/context/src/build-context-package.ts` | SPLIT: selection/path/graph/item helpers extracted; entrypoint now 289 lines |
| `packages/context/src/build-context-package.test.ts` | SPLIT: graph, stop/safety, memory, and render/budget tests split; largest shard now 641 lines |
| `packages/doctor/src/doctor.ts` | SPLIT: checks, graph, memory, hook-trace, runtime, JSON, render, and types extracted; entrypoint now 110 lines |
| `packages/doctor/src/doctor.test.ts` | SPLIT: current/config, governed-memory, and hook-trace test shards split; largest shard now 456 lines |
| `packages/hooks/src/codex-hook-entry.ts` | SPLIT: hook types, payload/path parsing, ownership hints, remediation, and trace payload helpers extracted; entrypoint now 326 lines |
| `packages/hooks/src/codex-hook-entry.test.ts` | SPLIT: core, scope, and lifecycle guardrail test shards split; largest shard now 351 lines |

## Remaining Flags

| File | Reason |
| --- | --- |
| `.gitignore` | Protected scratch from operator state; not owned by this sprint |
| `pnpm-lock.yaml` | Generated lockfile |

## Top Risks

- `context-graph-selection.ts` is still the densest algorithmic file at 617 lines; it is below the sprint threshold but should be treated carefully.
- Test split preserved assertions, but future behavior edits now span more files and should use focused test commands first.
- Hook trust remains deliberately unproven; the split only preserves guardrail/reporting semantics with `enforced: false`.

## Next Goals

1. Run the target PR #78 boundary or second real safe target through `krn run --task-spec ... --execute-verify --bundle`.
2. Add a small bloat-audit script/report only if the next goal explicitly wants a repeatable detector.

## Validation

Final validation commands are recorded in the completion response after this document is generated.
