# First Real-Repo Codex Execution Handoff

Date: 2026-06-14

## Scope

Goal: move from real-repo readiness to first approved KRN-assisted Codex execution evidence.

Target repo: `/home/krn/coding/krn/active/krn-llm-wiki`

Execution worktree: `/tmp/krn-llm-wiki-exec-20260614-1155`

KRN Harness source HEAD: `583f926dc666125bee5f06334f7b0a2d3d6be2a2`

## Source Baseline

- `HEAD == origin/main` at start.
- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm test`: pass, 227 tests.
- `pnpm verify:local`: pass, including pinned local dogfood preflight.
- `pnpm --silent krn review`: warn, no blockers.
- `pnpm --silent krn summary`: blocked by historical source dogfood artifact after tests.
- `pnpm --silent krn eval`: pass.
- `git diff --check`: pass.

User-owned source scratch remained out of commits: `.gitignore`, `GOAL*.md`, `ARCHITECTURE-AUDIT.md`, `docs/audit/`.

## Target Safety

Original target checkout was dirty:

- `AGENTS.md` modified.
- `.codex/` untracked.
- `.krn/` untracked runtime artifacts.

To avoid confusing evidence, execution used a detached git worktree at:

```text
/tmp/krn-llm-wiki-exec-20260614-1155
```

Preflight on the isolated worktree:

- eligible: true.
- dirtyWorktree: false.
- blockers: none.
- warnings: `missing_krn_config_json`.
- pinned KRN: `/tmp/krn-real-repo-preflight-bin-XXr51q/krn`.
- krnIdentityValid: true.

## Task

Task spec:

```text
.krn/dogfood/real-repo-execution/first-krn-assisted-task-spec.json
```

Task: docs-only README clarification. Touch only `README.md`; clarify that `python3 tools/check_fast.py` is the fast local iteration check, while `python3 tools/check_all_readonly.py` remains the side-effect-free pre-work orientation check.

## Execution

Codex command shape:

```text
CODEX_HOME=/home/krn/.codex codex -a never -s workspace-write -C /tmp/krn-llm-wiki-exec-20260614-1155 exec <prompt>
```

Codex session:

```text
019ec603-262d-7ae2-8fa1-d4996c660783
```

Codex result:

- exit 0.
- changed only `README.md`.
- did not commit or push.
- left `.krn/` untracked runtime artifacts.
- reported `python3 tools/check_all_readonly.py` pass: `All read-only checks passed. (160.89s total)`.

Target diff:

```text
README.md | 4 +++-
```

## KRN Post-Run Artifacts

Pinned KRN post-run commands:

- `<pinned-krn> verify`: `not-runnable`, `record-only`, 0 commands.
- `<pinned-krn> handoff`: ready.
- `<pinned-krn> review --write`: warn.
- `<pinned-krn> summary --write`: warn.

Key artifacts in execution worktree:

- `.krn/current/task-contract.json`
- `.krn/current/context-package.json`
- `.krn/current/verify-result.json`
- `.krn/current/handoff.md`
- `.krn/current/review-summary.json`
- `.krn/current/operator-summary.json`
- `.krn/traces/trace.jsonl`

Signals:

- task intent quality: high.
- context stop: false.
- context over-inclusion risk: high.
- verify mode: record-only, not execution proof.
- hook.received count: 0.
- real Codex hook loading/trust: unproven.

## Usefulness Scores

Scores are 0-5, local evidence only.

- context usefulness: 3. It found required context and no STOP, but over-included 48 items.
- verify clarity: 4. It honestly reported record-only/not-runnable.
- review usefulness: 3. It found context/verify/release warnings, but initially treated preflight-only dogfood as pass.
- summary usefulness: 3. It surfaced warnings and hook honesty, but did not connect preflight-only evidence to execution state.
- next-action clarity: 3. Useful general actions, but not execution-specific enough.
- blocker/warning clarity: 4. Dirty target and missing KRN config were explicit.
- hook honesty: 5. It did not overclaim hook proof.
- real-repo status honesty: 3. Readiness/preflight distinctions were mostly honest, but execution summary schema is missing.

## Hardening Done

Finding: deterministic dogfood reviewer counted preflight-only summaries as pass.

Fix:

- `packages/cli/src/commands/review.ts` now counts preflight-only dogfood summaries separately and warns.
- `packages/cli/src/operator-summary.ts` now surfaces preflight-only real-repo dogfood as `unproven` instead of no signal.
- `packages/cli/src/index.test.ts` adds a preflight-only regression.
- `docs/product/evidence-matrix.md` records first manual execution evidence and the remaining schema gap.
- `docs/product/next-implementation-backlog.md` records the finding and next schema need.

## Residual Risks

- No first-class `krn-real-repo-execution-result-v1` schema exists yet.
- Target repo has no `krn.config.json`, so KRN verify is record-only.
- Hook trust remains unproven because non-bypass real Codex hook evidence is still absent.
- Execution worktree is local evidence, not production proof.
- Target repo changes and `.krn/` artifacts were intentionally not committed.

## Next Goal

Add a first-class manual execution summary artifact schema for real-repo dogfood, then rerun one tiny execution to verify that review and operator summary can distinguish:

- preflight-only,
- readiness-only,
- manual execution evidence,
- automated execution evidence.
