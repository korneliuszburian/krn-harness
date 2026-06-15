# 2026-06-15 Total Bloat Burn-Down Result

## Summary

- Starting tracked `FLAGGED` count from `docs/handoffs/2026-06-15-total-cleanup-bloat-map.md`: `33`.
- Current active tracked/source `FLAGGED` count after follow-up eval refactor: `8`.
- `krn run` remains the primary workflow.
- No new top-level commands or bundle commands were added.
- No dashboard, MCP, vector DB, embeddings, autonomous subagents, publishing, production runner, production proof, or hook-trust claim was added.
- Protected scratch remains unstaged: `.gitignore`, `GOAL.md`, `GOAL-8H.md`, `ARCHITECTURE-AUDIT.md`, and `docs/audit/`.

## Original Flagged File Disposition

| File | Disposition |
| --- | --- |
| `.gitignore` | INTENTIONAL_KEEP_WITH_REASON: protected operator scratch; not staged |
| `README.md` | FIXED: concise onboarding/current truth; detailed proof moved to linked docs |
| `docs/product/evidence-matrix.md` | FIXED: retained as surface ledger, not narrative copy |
| `docs/product/mvp-state.md` | FIXED: canonical concise v0.1 state |
| `docs/product/next-implementation-backlog.md` | FIXED: next-work list only |
| `docs/product/operator-console.md` | FIXED: collapsed to artifact-first summary/report contract |
| `docs/product/subagent-contracts.md` | FIXED: collapsed to reviewer-contract boundary; no execution framework |
| `docs/releases/v0.1-local-tool-candidate.md` | FIXED: release note links out to detailed target proof |
| `docs/specs/hooks-pack.md` | FIXED: compact hook/config ownership truth already present |
| `docs/specs/memory.schema.md` | FIXED: dirty-write rule already present |
| `docs/specs/task-contract.schema.md` | FIXED: normalized helper view already present |
| `packages/cli/src/commands/release-check.ts` | SPLIT: bundle helpers moved to `release-check-bundle.ts` |
| `packages/cli/src/commands/report.ts` | FIXED: renderer extracted through `operator-report-render.ts` |
| `packages/cli/src/commands/review.ts` | SPLIT: args, dogfood review, and Markdown rendering extracted |
| `packages/cli/src/commands/run.ts` | SPLIT: run artifacts and run-result builder extracted |
| `packages/cli/src/index.test.ts` | SPLIT: shared helpers and focused test shards extracted |
| `packages/cli/src/operator-report.ts` | SPLIT: Markdown/HTML rendering extracted |
| `packages/cli/src/operator-summary.ts` | SPLIT: real-repo signal, problem aggregation, and rendering extracted |
| `packages/context/src/build-context-package.test.ts` | INTENTIONAL_KEEP_WITH_REASON: characterization safety net, quarantined in refactor backlog |
| `packages/context/src/build-context-package.ts` | INTENTIONAL_KEEP_WITH_REASON: context algorithm monolith, quarantined in refactor backlog |
| `packages/doctor/src/doctor.test.ts` | INTENTIONAL_KEEP_WITH_REASON: characterization safety net, quarantined in refactor backlog |
| `packages/doctor/src/doctor.ts` | INTENTIONAL_KEEP_WITH_REASON: doctor monolith, quarantined in refactor backlog |
| `packages/evals/src/run-eval.ts` | SPLIT: eval runner extracted into core, reporter, validator, hook, memory, and type modules |
| `packages/hooks/src/codex-hook-entry.test.ts` | INTENTIONAL_KEEP_WITH_REASON: hook characterization safety net, quarantined in refactor backlog |
| `packages/hooks/src/codex-hook-entry.ts` | INTENTIONAL_KEEP_WITH_REASON: hook semantics monolith; hook trust work remains forbidden here |
| `packages/memory/src/memory-store.test.ts` | FIXED: dirty-write regression retained |
| `packages/memory/src/memory-store.ts` | FIXED: dirty-write behavior retained |
| `packages/task-contract/src/build-contract.test.ts` | FIXED: normalization compatibility retained |
| `packages/task-contract/src/build-contract.ts` | FIXED: compatibility retained |
| `packages/task-contract/src/index.ts` | FIXED: normalized helper exports retained |
| `packages/task-contract/src/schema.ts` | FIXED: normalized helper types retained |
| `pnpm-lock.yaml` | INTENTIONAL_KEEP_WITH_REASON: generated lockfile; not hand-edited |
| `scripts/krn-real-repo-execution-report.sh` | DEPRECATED: retained only for legacy summaries; primary path is `krn run --task-spec ... --execute-verify --bundle` |

## Remaining Active Flags

| File | Reason |
| --- | --- |
| `.gitignore` | protected scratch; dirty but not owned by this source commit |
| `pnpm-lock.yaml` | generated lockfile |
| `packages/context/src/build-context-package.ts` | large context algorithm; needs separate characterization-backed extraction |
| `packages/context/src/build-context-package.test.ts` | matching characterization safety net |
| `packages/doctor/src/doctor.ts` | large doctor implementation; needs separate characterization-backed extraction |
| `packages/doctor/src/doctor.test.ts` | matching characterization safety net |
| `packages/hooks/src/codex-hook-entry.ts` | large hook semantics module; hook-trust work is out of scope |
| `packages/hooks/src/codex-hook-entry.test.ts` | matching characterization safety net |

## Top Risks

- Split CLI files are behavior-preserving by tests, but future edits must avoid drifting import boundaries.
- Quarantined context/doctor/hook monoliths remain real maintenance risk.
- Historical `.krn` dogfood artifacts can still create report caveats.
- Real target evidence is local isolated-worktree proof only.
- Hook trust remains unproven.

## Next Goals

1. Review/merge or close the target `krn.config.json` PR boundary.
2. Repeat `krn run --task-spec ... --execute-verify --bundle` on a second safe non-protected target.
3. Extract one quarantined monolith with characterization tests and before/after artifact comparison.

## Validation

Final validation commands are recorded in the completion response after this document is generated.
