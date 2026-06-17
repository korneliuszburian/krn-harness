# Target Adoption Playbook

## When To Use KRN

Use KRN when a target repo can be validated locally with deterministic commands
and the operator needs durable `krn run` evidence: task contract, context,
verify result, handoff, review/summary/report, and run bundle.

Do not use KRN adoption proof for protected-data work, production deployment,
hook trust claims, or direct target-main changes.

## Safe Target Selection

- Prefer a user-owned, non-protected repo.
- Use an isolated clone or worktree.
- Reject active scope with secrets, private/client data, raw corpora, dumps,
  backups, credentials, invoices, contracts, or production-only dependencies.
- Do path-level safety classification before content reads.
- If a repo already tracks a product-owned `.krn/` directory, configure
  `runtime.dir` to a local ignored directory such as `.krn-harness`.

## Config-Only Adoption Flow

1. Confirm the target validation command.
2. Create a conservative `krn.config.json`.
3. Run `krn config doctor --json`.
4. Create a relative task spec under the chosen runtime dir, for example
   `.krn/local/` or `.krn-harness/local/`.
5. Run `krn run --task-spec <runtime-dir>/local/<task>.json --execute-verify --bundle`.
6. Review `<runtime-dir>/current/run-result.md` and
   `<runtime-dir>/current/run-bundle/manifest.json`.

Only open a target PR when the allowed diff is limited to `krn.config.json`,
`.gitignore` for `.krn/`, or a safe adoption note. Do not push target main and
do not merge the PR as part of adoption proof.

## Runtime Artifacts

KRN writes local runtime evidence under `.krn/` by default. If the target owns
`.krn/`, set `runtime.dir` to `.krn-harness` or another safe repo-relative
dot-directory. The chosen runtime directory should be ignored by the target and
must never be staged.

Generated target outputs such as `.local/`, `out/`, caches, and `__pycache__/`
remain local unless the target already treats them as tracked product artifacts.

## Task Spec Rules

- `--task-spec` must be repo-relative.
- Put the task prompt in the `prompt` field.
- Include expected local proof files.
- Put protected paths that must not be read in structured do-not-use fields when
  possible; they are safety boundaries, not active context.
- Do not put protected paths in expected touched files unless the task is
  intentionally blocked for safety review.
- Keep validation command, rollback, no-push, no-merge, productionProof false,
  and hookTrust unproven boundaries explicit.

## Verify Command Selection

Use the target's own deterministic local validation. Prefer existing quality
gates over inventing broad checks.

KRN v0.1 verify policy is intentionally narrow. For Python targets, a local
`python3 tools/*.py` checker may be needed to call the target-owned quality
gate. Do not broaden KRN source policy during adoption proof.

## Final Handoff Checklist

- Target repo, base commit, and isolated path.
- Safety classification and protected exclusions.
- `krn config doctor --json` result.
- `krn run --task-spec ... --execute-verify --bundle` result.
- Verify command and executed command count.
- Bundle manifest path.
- Changed/untracked target files.
- Target PR URL if opened.
- No target main push.
- No target PR merge.
- No `.krn` artifacts committed.
- `productionProof: false`.
- Hook trust unproven.
- Known blockers and adoption frictions.
