# 2026-06-15 Total Bloat Burn-Down Plan

## Scope

- Start point: `de38cd06b09cd7a2a684a82cd3710919ba74dc55` or newer.
- Previous tracked FLAGGED count: `33`.
- Current pre-burn-down active tracked FLAGGED count: `24`.
- Target active tracked FLAGGED count: `<= 10`.
- Risk level: medium. Most risk is behavior drift from moving CLI/test code.
- Intended commit buckets: docs truth collapse; CLI monolith split; core quarantine; legacy script deprecation; specs/result update.

## Files Intentionally Not Touched

- `.gitignore`: protected scratch, dirty by operator context.
- `GOAL.md`, `GOAL-8H.md`, `ARCHITECTURE-AUDIT.md`, `docs/audit/`: protected scratch.
- `.krn/**`: runtime artifacts only, never staged.
- `pnpm-lock.yaml`: generated lockfile, inspected only.

## Per-File Action Table

| File | Current action | Risk | Commit bucket |
| --- | --- | --- | --- |
| `.gitignore` | INTENTIONAL_KEEP_WITH_REASON: protected scratch; owner operator | low | none |
| `README.md` | FIXED: keep onboarding only, no full evidence retell | low | docs truth collapse |
| `docs/product/evidence-matrix.md` | FIXED: evidence ledger only | low | docs truth collapse |
| `docs/product/mvp-state.md` | FIXED: canonical concise product state | low | docs truth collapse |
| `docs/product/next-implementation-backlog.md` | FIXED: only active next-work list | low | docs truth collapse |
| `docs/product/operator-console.md` | DEPRECATED: reduce to tiny historical/current-artifact note | low | docs truth collapse |
| `docs/product/subagent-contracts.md` | DEPRECATED: reduce to reviewer-contract note, no execution lane | low | docs truth collapse |
| `docs/releases/v0.1-local-tool-candidate.md` | FIXED: release note only, links out for evidence detail | low | docs truth collapse |
| `docs/specs/hooks-pack.md` | FIXED: previous compact/config ownership truth retained, minor cleanup only if needed | low | specs cleanup |
| `docs/specs/memory.schema.md` | FIXED: dirty-write truth already present | low | specs cleanup |
| `docs/specs/task-contract.schema.md` | FIXED: normalization helper truth already present | low | specs cleanup |
| `packages/cli/src/commands/release-check.ts` | SPLIT: move release bundle helpers/model/rendering | medium | CLI monolith split |
| `packages/cli/src/commands/report.ts` | FIXED: already uses shared current artifact helpers | low | CLI monolith split |
| `packages/cli/src/commands/review.ts` | SPLIT: move dogfood review/readers | medium | CLI monolith split |
| `packages/cli/src/commands/run.ts` | SPLIT: move run bundle/result helpers | medium | CLI monolith split |
| `packages/cli/src/index.test.ts` | SPLIT: move shared test helpers and focused suites | high | CLI monolith split |
| `packages/cli/src/operator-report.ts` | SPLIT: move report rendering helpers | medium | CLI monolith split |
| `packages/cli/src/operator-summary.ts` | SPLIT: move real-repo summary and rendering helpers | medium | CLI monolith split |
| `packages/context/src/build-context-package.test.ts` | INTENTIONAL_KEEP_WITH_REASON: characterization safety net; owner context/refactor backlog | medium | core quarantine |
| `packages/context/src/build-context-package.ts` | INTENTIONAL_KEEP_WITH_REASON: algorithm split deferred; owner context/refactor backlog | medium | core quarantine |
| `packages/doctor/src/doctor.test.ts` | INTENTIONAL_KEEP_WITH_REASON: characterization safety net; owner doctor/refactor backlog | medium | core quarantine |
| `packages/doctor/src/doctor.ts` | INTENTIONAL_KEEP_WITH_REASON: algorithm split deferred; owner doctor/refactor backlog | medium | core quarantine |
| `packages/evals/src/run-eval.ts` | INTENTIONAL_KEEP_WITH_REASON: fixture scorer split deferred; owner eval/refactor backlog | medium | core quarantine |
| `packages/hooks/src/codex-hook-entry.test.ts` | INTENTIONAL_KEEP_WITH_REASON: hook semantics safety net; owner hooks/refactor backlog | medium | core quarantine |
| `packages/hooks/src/codex-hook-entry.ts` | INTENTIONAL_KEEP_WITH_REASON: hook trust work forbidden; owner hooks/refactor backlog | medium | core quarantine |
| `packages/memory/src/memory-store.test.ts` | FIXED: dirty-write regression covered | low | specs/result update |
| `packages/memory/src/memory-store.ts` | FIXED: writes only changed stores | low | specs/result update |
| `packages/task-contract/src/build-contract.test.ts` | FIXED: compatibility tests retained; normalization tests live separately | low | specs/result update |
| `packages/task-contract/src/build-contract.ts` | FIXED: compatibility retained, no bloat action needed | low | specs/result update |
| `packages/task-contract/src/index.ts` | FIXED: normalized helpers exported | low | specs/result update |
| `packages/task-contract/src/schema.ts` | FIXED: normalized helper types added | low | specs/result update |
| `pnpm-lock.yaml` | INTENTIONAL_KEEP_WITH_REASON: generated lockfile; owner package manager | low | none |
| `scripts/krn-real-repo-execution-report.sh` | DEPRECATED: mark as historical/legacy, point at `krn run` artifacts | low | legacy script deprecation |

## Expected Remaining Active Flags

Expected active tracked FLAGGED files after burn-down: `9`.

Remaining: `.gitignore`, `pnpm-lock.yaml`, context source/test, doctor source/test, eval runner, hook source/test.
