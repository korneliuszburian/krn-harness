# 2026-06-16 PR #78 Decision Result

## Summary

PR #78 in `korneliuszburian/krn-llm-wiki` remains
`READY_TO_MERGE_PENDING_APPROVAL`.

No target merge, target commit, target push, or direct target-main push was
performed.

## Operator Approval Phrase

Required phrase: `APPROVE_TARGET_PR_78_MERGE`.

Status: absent as an explicit top-of-goal approval. The phrase appears only
inside the decision-gate instructions and example text in `GOAL.md`, so it is
not treated as target-owner merge approval.

Decision: do not merge.

## PR Boundary

- PR: `https://github.com/korneliuszburian/krn-llm-wiki/pull/78`.
- State: OPEN.
- Draft: false.
- Merge state: CLEAN.
- Base: `main`.
- Head: `krn-adopt-harness-config-20260615`.
- Head commit: `0449611b4f18ed89c05374c4f96a5421fc549229`.
- Target main ref at decision time: `e230289ae3d744561555a6998a32b8ae2ecd0b24`.
- Changed files: `krn.config.json` only.
- Patch scope: 26 insertions, no deletions.

No `.krn`, `AGENTS.md`, `.codex`, protected data, or product source-code
mutation appears in the PR diff.

## Target Validation

Fresh final target validation was not run in this decision turn because the
operator approval gate was absent and `GOAL.md` says to stop after recording
that exact missing approval.

Prior evidence remains: PR #78 previously passed `krn config doctor --json` and
`krn run --task-spec .krn/local/pr78-repeat-task-spec.json --execute-verify
--bundle` with `python3 tools/check_all_readonly.py` as the single target-owned
executed command.

## Target Main Adoption

Target main adoption status: not adopted.

GitHub contents API returned 404 for `krn.config.json` on target `main`, and PR
#78 remains open.

## Target Hygiene Follow-Up

Recommendation for target owner:

```txt
Target should ignore `.krn/` runtime artifacts.
```

Do not change target `.gitignore` without separate explicit approval.

## Source Baseline

KRN source HEAD at decision time:
`344a03630c8c46c235596ff1ad170d062a0a9be4`.

`HEAD == origin/main` before this handoff file was written.

Stage 0 passed:

- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm verify:local`;
- `pnpm --silent krn run --task "pr78 decision source baseline" --dry-run
  --json`;
- `pnpm --silent krn release-check --write`;
- `pnpm --silent krn eval`;
- `git diff --check`.

## Limits

- No production proof is claimed.
- No hook trust is claimed.
- No external audit feature was implemented.
- No GOAL-8H gated work was implemented.
- No new KRN CLI command or bundle variant was added.
