# 2026-06-16 Final Monolith Burn-Down Plan

## Baseline

- Start HEAD: `829d1d40cb59daba81961887740248550cdc153a`.
- `main` equals `origin/main`.
- Baseline validation passed before edits:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm verify:local`
  - `pnpm --silent krn run --task "final monolith burn-down baseline" --execute-verify --bundle`
  - `pnpm --silent krn release-check --write`
  - `pnpm --silent krn eval`
  - `git diff --check`

## Current Active Flags

Previous active tracked/source flags: `8`.

| File | Baseline lines | Plan |
| --- | ---: | --- |
| `.gitignore` | 7 | Protected scratch; do not stage. |
| `pnpm-lock.yaml` | 1195 | Generated lockfile; do not hand-edit. |
| `packages/context/src/build-context-package.ts` | 1179 | Split pure ranking/graph/path helpers. |
| `packages/context/src/build-context-package.test.ts` | 1379 | Keep as characterization until split is safe. |
| `packages/doctor/src/doctor.ts` | 1403 | Split check definitions, renderers, git/fs helpers. |
| `packages/doctor/src/doctor.test.ts` | 1240 | Keep or split by existing behavior groups. |
| `packages/hooks/src/codex-hook-entry.ts` | 1119 | Mechanically split parsing/path/ownership/remediation/trace/messages helpers. |
| `packages/hooks/src/codex-hook-entry.test.ts` | 708 | Keep or split by existing behavior groups. |

## Behavior Boundaries

- `krn run` stays the primary workflow.
- No new top-level CLI command.
- No new bundle variant.
- No GOAL-8H gated TASK-002/003/004/008/012 implementation.
- No trace query store, resume semantics, `krn diff`, hook trust work, MCP,
  vector DB, embeddings, dashboard, subagents, publishing, production runner,
  production proof, or hook trust claim.
- Hook `enforced: false` and hook-trust unproven semantics stay unchanged.

## Protected Scratch Not Touched

- `.gitignore`
- `GOAL.md`
- `GOAL-8H.md`
- `ARCHITECTURE-AUDIT.md`
- `docs/audit/`
- `.agents/skills/grill-with-docs/`

## Split Protection Tests

- Context split:
  - `pnpm --silent vitest run packages/context/src/build-context-package.test.ts`
  - full `pnpm test`
- Doctor split:
  - `pnpm --silent vitest run packages/doctor/src/doctor.test.ts`
  - full `pnpm test`
- Hook split:
  - `pnpm --silent vitest run packages/hooks/src/codex-hook-entry.test.ts`
  - full `pnpm test`
- Final proof:
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm verify:local`
  - `pnpm --silent krn run --task "final monolith burn-down dry run" --dry-run --json`
  - `pnpm --silent krn run --task "final monolith burn-down execute run" --execute-verify --bundle`
  - `pnpm --silent krn release-check --write`
  - `pnpm --silent krn eval`
  - `git diff --check`
  - `git diff --cached --check`
