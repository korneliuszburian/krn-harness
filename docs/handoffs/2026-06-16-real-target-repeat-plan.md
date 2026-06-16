# 2026-06-16 Real Target Repeat Plan

## Chosen Path

Path A: review target PR #78 boundary for `korneliuszburian/krn-llm-wiki`.

## Target

- Repo: `korneliuszburian/krn-llm-wiki` (private).
- PR: #78, `krn-adopt-harness-config-20260615` -> `main`.
- PR state: OPEN, not draft, merge state CLEAN.
- Isolated worktree: `/tmp/krn-llm-wiki-pr78-repeat`.
- Worktree HEAD: `0449611b4f18ed89c05374c4f96a5421fc549229`.
- Source KRN HEAD: `781911f471dc123de02efd37a7273c5d3db3ac9e` or newer.

## Safety Boundary

- Do not merge PR #78 without explicit approval.
- Do not push target repo.
- Do not push target `main`.
- Do not commit target repo.
- Do not stage `.krn`.
- Treat target `.krn` as runtime-only evidence.
- Main target checkout is dirty and must remain untouched.
- Protected target areas excluded from active edits/context:
  - `raw/`
  - `wiki/_approvals/`
  - `wiki/_proposals/`
  - `wiki/_transactions/`

## Expected Target Change

- Expected changed file in PR: `krn.config.json`.
- No `.krn`, `AGENTS.md`, `.codex`, protected data, or source files should be changed by PR #78.

## Verify Command

`python3 tools/check_all_readonly.py`

This is target-owned and KRN allowlisted as a single safe relative `tools/*.py`
Python command.

## Runtime Task Spec

Local only:

`.krn/local/pr78-repeat-task-spec.json` inside the isolated target worktree.

`krn run` requires `--task-spec` to be a relative local path. An absolute
`/tmp/...` spec path is intentionally rejected by `krn start`.

Required metadata:

- `expectedTouchedFiles`: `["krn.config.json"]`
- `forbiddenTouchedFiles`: protected target areas plus `.krn/`
- `requiredDoNotUsePaths`: protected target areas
- prompt states validation command, rollback boundary, no target push, no
  merge, and review-only config adoption boundary

## Success Criteria

- PR #78 still changes only `krn.config.json`.
- Target worktree remains isolated from the dirty main checkout.
- Target preflight passes or exact blocker is recorded.
- `krn config doctor --json` passes in target worktree.
- `krn run --task-spec .krn/local/pr78-repeat-task-spec.json --execute-verify --bundle` runs in target worktree.
- Verify executes `python3 tools/check_all_readonly.py`.
- Result is classified as READY_TO_MERGE, NEEDS_CHANGES, KEEP_OPEN, CLOSE_REWORK, or BLOCKED.
