# 2026-06-16 Second Real Repo Repeat Plan

## Selected Target

- Repo: `korneliuszburian/marketing-intelligence-studio`.
- Isolated clone: `/tmp/marketing-intelligence-studio-adoption-20260616`.
- Base commit: `811da65713a101cb374b33af12759d86caff59bf`.
- Branch: `main`.

## Rejected / Deferred Candidates

- `marketing-intelligence-studio` local checkout: not present locally; cloned
  from GitHub instead.
- `krn-ai-os`: direct tests pass, but the repo already tracks a product-owned
  `.krn/` kernel directory. KRN Harness v0.1 has a fixed `.krn/` runtime dir,
  so adoption would write Harness runtime artifacts into another product's
  tracked namespace. Treat as `BLOCKED_RUNTIME_NAMESPACE_COLLISION`, not a KRN
  source feature request.
- `ekologus-AI`: not used; client/corpus safety risk is higher than needed for
  this proof.

## Safety Classification

Classification: `SELECTED_WITH_EXCLUSIONS`.

Path-level scan found expected marketing/contract/corpus words in source and
docs, plus `.env.example`. The repo `.gitignore` excludes `.env`, `.env.*`,
`protected_data/`, `private_data/`, `.local/`, `out/`, and `materials/*` except
`materials/README.md`.

Active proof excludes protected paths:

- `.env`
- `.env.*`
- `protected_data/`
- `private_data/`
- `materials/`
- `data/evidence/approved/`

No secret values are read or copied.

## Target Validation

Direct target baseline:

- `python3 -m pytest`: blocked by target suite drift, 361 passed and 3 failed in
  `tests/test_feedback_gsc_metrics_intelligence.py`.
- `scripts/quality_gate.sh`: pass using default fast profile. It ran format
  check, ruff check, architecture advisory, 84 selected tests, CLI/demo/product
  runtime smoke, and `git diff --check`.

KRN verify command:

```bash
python3 tools/krn_check_quality_gate.py
```

Reason: KRN v0.1 verify policy allows `python3 tools/*.py`; the wrapper is a
local-only adoption checker that delegates to the target's existing
`scripts/quality_gate.sh` fast profile without broadening KRN source policy.

## Local Proof Files

Expected local-only touched files:

- `krn.config.json`
- `tools/krn_check_quality_gate.py`
- `.krn/local/second-target-repeat-task-spec.json`

Expected runtime/generated artifacts:

- `.krn/current/*`
- `.krn/graph/*`
- `out/quality-gate/*`
- `.local/product-runtime/*`

No target product source, tests, docs, protected data, target main push, or
target merge is allowed.

## Commands

```bash
/home/krn/coding/krn/krn-harness/node_modules/.bin/tsx \
  /home/krn/coding/krn/krn-harness/packages/cli/src/index.ts \
  config doctor --json

/home/krn/coding/krn/krn-harness/node_modules/.bin/tsx \
  /home/krn/coding/krn/krn-harness/packages/cli/src/index.ts \
  run --task-spec .krn/local/second-target-repeat-task-spec.json --execute-verify --bundle
```

## Success Criteria

- `krn config doctor --json`: pass.
- `krn run`: `verified`.
- Verify mode/status: `execute` / `pass`.
- Executed command: `python3 tools/krn_check_quality_gate.py`.
- Run bundle exists at `.krn/current/run-bundle/manifest.json`.
- `productionProof` remains `false`.
- Hook trust remains unproven or diagnostic-only.
- No target commit, push, merge, or `.krn` staging.

## Rollback

Remove the isolated clone or discard local proof files and generated artifacts.
Do not clean or reset any active user checkout.
