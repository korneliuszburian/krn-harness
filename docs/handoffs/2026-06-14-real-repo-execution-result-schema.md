# Real-Repo Execution Result Schema Handoff

Date: 2026-06-14

## Scope

Goal: turn manual real-repo Codex execution proof into a durable machine-readable KRN artifact.

New schema:

```text
krn-real-repo-execution-result-v1
```

Target repo:

```text
/home/krn/coding/krn/active/krn-llm-wiki
```

Execution worktree:

```text
/tmp/krn-llm-wiki-exec-20260614-145036
```

## Implementation

- Added `docs/specs/real-repo-execution-result.schema.md`.
- Added `scripts/krn-real-repo-execution-report.sh`.
- Updated `krn review` dogfood classification for blocked, skipped, preflight-only, readiness-only, execution-result, unsafe execution, and hook-unproven caveats.
- Updated `krn summary` to surface real-repo manual execution as `realRepoDogfood.status = execution-evidence`.
- Updated tests for writer output, unsafe execution failure, and operator summary execution evidence.
- Updated product evidence docs and backlog.

## Real Run

Codex command shape:

```text
codex -a never -s workspace-write -C <repo> exec <prompt>
```

Codex session:

```text
019ec631-9eef-7861-9fbf-630475625974
```

Target result:

- changed only `README.md`;
- no target commit;
- no target push;
- no forbidden files touched;
- `.krn/` remained runtime-only and untracked.

Target validation:

```text
python3 tools/check_all_readonly.py
exit code: 0
All read-only checks passed. (164.10s total)
```

Execution result artifact:

```text
.krn/dogfood/real-repo-execution/krn-llm-wiki-manual-20260614-145036/summary.json
```

Key fields:

- `executionKind`: `manual-codex`
- `validationStatus`: `pass`
- `changedFiles`: `README.md`
- `forbiddenTouchedFiles`: none
- `committedTargetRepo`: `false`
- `pushedTargetRepo`: `false`
- `productionProof`: `false`
- `verifyMode`: `record-only`
- `verifyStatus`: `not-runnable`
- `hookTrustStatus`: `unproven`
- `contextOverInclusionRisk`: `high`

## Review Signals

Pinned KRN:

```text
/tmp/krn-real-repo-preflight-bin-UVgYu4/krn
```

`krn review --write` in target worktree:

- status: `warn`
- dogfood summary: one preflight-only artifact and one execution-result artifact
- warning cause: preflight-only artifact plus execution-result warning for unproven hook trust

`krn summary --write` in target worktree:

- status: `warn`
- `realRepoDogfood.status`: `execution-evidence`
- `productionProof`: `false`
- next action: non-bypass Codex hook trust probe

## Usefulness Scores

Scores are 0-5 and local evidence only.

- context usefulness: 3. Required README was present and no STOP fired.
- context over-inclusion: 2. Risk remained `high` with 28 total items.
- verify clarity: 4. It honestly reported record-only/not-runnable.
- review usefulness: 4. It distinguished preflight-only from execution-result and warned on hook trust.
- summary usefulness: 4. It surfaced execution evidence without production proof.
- execution result usefulness: 5. It captured target path, worktree path, session id, validation, changed files, forbidden files, commit/push flags, hook trust, and production-proof false.
- next-action clarity: 4. Hook probe and verify-profile gaps are explicit.
- hook honesty: 5. Hook trust stayed unproven.

## Residual Risks

- Target has no `krn.config.json`, so KRN verify remains record-only.
- Context over-inclusion remains high; do not broad-refactor context from this one run.
- Real non-bypass Codex hook trust remains unproven.
- Execution evidence is local evidence, not production proof.
- Target repo changes and target `.krn/` artifacts were intentionally not committed.

## Next Goal

Run one more safe real-repo dogfood on a target with a real `krn.config.json` verify profile, or add a non-bypass Codex hook trust probe before broadening execution claims.
