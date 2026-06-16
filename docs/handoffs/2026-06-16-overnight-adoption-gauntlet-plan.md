# 2026-06-16 Overnight Adoption Gauntlet Plan

## Scope

Run adoption proof work only. Do not add KRN product surfaces, bundle variants,
hook trust checks, production proof claims, external audit feature work, or
GOAL-8H gated work.

## Source Baseline

- Source HEAD: `217b239c55978f3cdb2a2b1c18c376f6e77c74be`.
- `HEAD == origin/main`: yes at baseline start.
- Required lower bound `217b239c55978f3cdb2a2b1c18c376f6e77c74be`: satisfied.
- Protected scratch is dirty/untracked and must stay untouched:
  `.gitignore`, `GOAL.md`, `GOAL-8H.md`, `ARCHITECTURE-AUDIT.md`,
  `docs/audit/`, `.agents/skills/grill-with-docs/`.
- `.krn/` is ignored in the source checkout.

Baseline commands:

- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm test`: pass, 39 files and 316 tests.
- `pnpm verify:local`: pass, including dogfood preflight.
- `pnpm --silent krn run --task "overnight adoption gauntlet source baseline" --dry-run --json`: planned, no blockers.
- `pnpm --silent krn release-check --write`: pass.
- `pnpm --silent krn eval`: pass after sequential rerun. The first parallel run raced against the active run trace and failed trace-completeness; this was command ordering, not a source regression.
- `git diff --check`: pass.
- `git diff --cached --check`: pass.

## Target Candidates

Preferred order:

1. `korneliuszburian/marketing-intelligence-studio`, if local and non-protected.
2. `korneliuszburian/krn-ai-os`, if local and non-protected.
3. Another local user-owned repo only if the safety scan is clean.

Avoid `ekologus-AI` unless a path-level scan proves active proof can exclude
protected client/corpus data.

## Safety Criteria

- Use an isolated target worktree.
- Do not inspect or copy secret values.
- Reject active scope if protected-looking data appears in required proof paths:
  `.env`, secrets, private/client data, raw corpora, dumps, backups, documents,
  invoices, contracts, credentials, production artifacts, or protected corpora.
- Prefer path-level classification over content reads for protected-looking
  files.
- Use only deterministic local validation that belongs to the target.

## Allowed Target Diffs

Only branch/PR changes are allowed, never direct target-main pushes.

Allowed files:

- `krn.config.json`;
- `.gitignore` only for adding `.krn/`;
- documentation-only adoption note if already present and clearly safe.

Runtime `.krn/` artifacts, protected data, product code, generated dumps, and
target source mutations are not allowed unless a later separate approval exists.

## Stop Conditions

Stop target expansion if protected data enters scope, direct target-main push is
required, runtime `.krn/` would be committed, a target merge is required, a new
KRN top-level command or bundle variant is needed, hook-trust investigation
becomes necessary, production proof would be claimed, or final source validation
cannot run.

If one target is blocked safely, record the exact blocker and try the next safe
candidate.

## Planned Validation

Source:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm verify:local`
- `pnpm --silent krn run --task "overnight adoption gauntlet final source dry run" --dry-run --json`
- `pnpm --silent krn run --task "overnight adoption gauntlet final source execute run" --execute-verify --bundle`
- `pnpm --silent krn release-check --write`
- `pnpm --silent krn eval`
- `git diff --check`
- `git diff --cached --check`

Second target:

- target-owned deterministic validation command;
- source-pinned `krn config doctor --json`;
- source-pinned `krn run --task-spec .krn/local/second-target-repeat-task-spec.json --execute-verify --bundle`.

## Evidence Boundaries

- `productionProof` must remain `false`.
- Hook trust must remain `unproven` or diagnostic-only; do not claim trusted
  hook loading.
- Target proof is local isolated-worktree evidence unless a separate target PR
  is opened.
- Target PRs may be opened but not merged in this goal.
