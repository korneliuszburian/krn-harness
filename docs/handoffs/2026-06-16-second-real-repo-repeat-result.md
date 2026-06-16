# 2026-06-16 Second Real Repo Repeat Result

## Summary

`marketing-intelligence-studio` passed the second real repo repeat as local
isolated-worktree evidence.

Result: `VERIFIED_SECOND_TARGET`.

This is not production proof, not hook trust proof, and not a target PR.

## Target

- Repo: `korneliuszburian/marketing-intelligence-studio`.
- Worktree: `/tmp/marketing-intelligence-studio-adoption-20260616`.
- Base commit: `811da65713a101cb374b33af12759d86caff59bf`.
- Source-pinned KRN: `/home/krn/coding/krn/krn-harness/packages/cli/src/index.ts`.

## Safety

Safety classification: `SELECTED_WITH_EXCLUSIONS`.

Excluded paths:

- `.env`
- `.env.*`
- `protected_data/`
- `private_data/`
- `materials/`
- `data/evidence/approved/`

No protected values were read. No protected data was touched.

## Validation

Direct target evidence:

- `python3 -m pytest`: 361 passed, 3 failed in
  `tests/test_feedback_gsc_metrics_intelligence.py`.
- `scripts/quality_gate.sh`: pass with the target default fast profile.

KRN config:

- Local `krn.config.json` profile: `quality`.
- Configured command: `python3 tools/krn_check_quality_gate.py`.
- `krn config doctor --json`: pass.

KRN run:

- Command: `krn run --task-spec .krn/local/second-target-repeat-task-spec.json --execute-verify --bundle`.
- Status: `verified`.
- Verify mode/status: `execute` / `pass`.
- Executed commands: 1 of 1.
- Executed command: `python3 tools/krn_check_quality_gate.py`.
- Verify duration: 35974ms.
- Bundle manifest: `.krn/current/run-bundle/manifest.json`.
- `productionProof`: `false`.
- `hookTrustStatus`: `unproven`.
- Blockers: none.

## Local Files

Local-only proof files:

- `krn.config.json`.
- `tools/krn_check_quality_gate.py`.
- `.krn/local/second-target-repeat-task-spec.json`.

Runtime/generated files:

- `.krn/current/*`.
- `.krn/graph/*`.
- `out/quality-gate/*`.
- `.local/product-runtime/*`.
- cache and `__pycache__/` files.

No target commit, push, PR, direct main push, or merge occurred.

## Follow-Up

Do not open a config-only PR for this target from this proof as-is: the useful
config depends on the local checker wrapper, and checker files are outside this
goal's target PR allowlist.

Record these adoption frictions in the product docs before choosing whether KRN
should later support Python project quality gates without local wrappers.
