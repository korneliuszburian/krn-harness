# 2026-06-16 Real Target Repeat Result

## Summary

Path A was executed against `korneliuszburian/krn-llm-wiki` PR #78 in an
isolated detached worktree. The target run passed through
`krn run --task-spec ... --execute-verify --bundle`.

Result: `READY_TO_MERGE` pending explicit target-owner approval. No target merge,
commit, or push was performed.

Proof class: config proof / review-boundary proof. This run is not fixture
proof, not a new product-code mutation proof, not production proof, and not hook
trust proof.

## External Audit Triage

`docs/product/external-audit-triage-2026-06-16.md` classifies TASK-001..014.
No external audit feature was implemented.

## Target Boundary

- Repo: `korneliuszburian/krn-llm-wiki`.
- PR: #78, `krn-adopt-harness-config-20260615` -> `main`.
- Worktree: `/tmp/krn-llm-wiki-pr78-repeat`.
- Worktree HEAD: `0449611b4f18ed89c05374c4f96a5421fc549229`.
- PR state: OPEN, not draft, merge state CLEAN.
- PR changed files: `krn.config.json` only, 26 insertions.
- Dirty main target checkout was not touched.

## Task Spec

Runtime-only spec:
`.krn/local/pr78-repeat-task-spec.json`.

The spec records:

- expected touched files: `krn.config.json`;
- forbidden paths: `.krn/`, `raw/`, `wiki/_approvals/`,
  `wiki/_proposals/`, `wiki/_transactions/`;
- required do-not-use paths: `raw/`, `wiki/_approvals/`,
  `wiki/_proposals/`, `wiki/_transactions/`;
- validation command: `python3 tools/check_all_readonly.py`;
- rollback boundary: discard runtime `.krn` artifacts and remove the isolated
  worktree; do not reset/clean the dirty main target checkout;
- no target commit, no target push, no merge.

## Preflight And Doctor

- Direct target preflight passed: `python3 tools/check_all_readonly.py`.
- `krn config doctor --json` passed in the target worktree.
- Config doctor command policy allowed `python3 tools/check_all_readonly.py`.
- Source-pinned KRN identity pointed to this source checkout, not a global
  `krn` collision.

## KRN Run Evidence

Command:

```bash
/home/krn/coding/krn/krn-harness/node_modules/.bin/tsx \
  /home/krn/coding/krn/krn-harness/packages/cli/src/index.ts \
  run --task-spec .krn/local/pr78-repeat-task-spec.json --execute-verify --bundle
```

Result:

- run status: `verified`;
- verify mode/status: `execute` / `pass`;
- verify profile: `readonly`;
- executed commands: 1 of 1;
- command: `python3 tools/check_all_readonly.py`;
- command duration: 156040 ms;
- bundle manifest: `.krn/current/run-bundle/manifest.json`;
- `productionProof`: `false`;
- `hookTrustStatus`: `unproven`;
- blockers: none.

Warnings were expected local-evidence caveats: context quality warnings,
missing hook trust, no real-repo dogfood summary, reviewer records, historical
`.krn` caveats, and non-blocking source release-check in a downstream target
run.

## Infrastructure Grill Findings

NOT FLAGGED: `krn run` remains the primary workflow. No new top-level command or
bundle command was added.

NOT FLAGGED: run bundles copy only allowlisted `.krn/current` artifacts and keep
raw traces/protected-looking paths out of the bundle.

NOT FLAGGED: verify execution stayed behind the existing allowlist; the target
command is a single safe relative `tools/*.py` Python script.

NOT FLAGGED: source release-check failure semantics are non-blocking for a
downstream target run, and the run records that caveat explicitly.

FLAGGED: `--task-spec` must be a relative local path. The first absolute
`/tmp/...` attempt was rejected by design. The accepted run used
`.krn/local/pr78-repeat-task-spec.json`.

FLAGGED: target `.gitignore` does not ignore `.krn/`, so the isolated worktree
shows runtime evidence as untracked files. This is a target-owner adoption
follow-up, not a KRN source change in this goal.

FLAGGED FOR LATER DESIGN ONLY: task-spec schema currently preserves structured
touched-file and do-not-use metadata, while validation command, rollback, and
no-push boundaries live in the prompt text. Do not add schema fields in this
goal; consider only after another target repeat shows recurring friction.

## Decision

PR #78 is `READY_TO_MERGE` pending explicit target-owner approval. The current
safe follow-up is either operator-approved target PR merge/review, or a second
real repo repeat without adding new KRN product surfaces.
