# krn-llm-wiki Product-Code Dogfood Decision

## Decision

Do not mutate `krn-llm-wiki` product code until the operator explicitly approves
a product-code dogfood run.

Current KRN proof for `krn-llm-wiki` is config/install adoption plus executable
readonly validation in isolated worktrees. It is not product-code mutation proof,
hook trust proof, or production proof.

## Why Current Proof Is Config Adoption Only

Existing isolated `krn-llm-wiki` evidence proves:

- KRN can install managed onboarding/runtime files in a detached worktree.
- KRN can generate and validate a readonly Python verify profile.
- `krn verify --execute` can run `python3 tools/check_all_readonly.py`.
- `krn review --write`, `krn summary --write`, and `krn report --bundle` can
  summarize local target artifacts.

It does not prove:

- editing wiki/product code safely;
- updating tests for a real target feature;
- applying a reviewed proposal to canonical content;
- real Codex hook loading/trust;
- production readiness.

## What Product-Code Proof Requires

A valid product-code proof needs all of the following:

- an operator-approved non-protected task;
- an isolated clean worktree, never the dirty active checkout;
- pinned local KRN identity evidence from `krn doctor cli`;
- a task spec that names expected touched files, forbidden files, validation,
  rollback, and no-push boundary;
- `krn start --task-spec`, `krn graph`, `krn context`, `krn verify --execute`,
  `krn review --write`, `krn summary --write`, and `krn report --bundle`;
- target validation passing after the change;
- a real-repo execution-result artifact with `productionProof: false` and
  `hookTrustStatus: "unproven"` unless separate non-bypass hook evidence exists;
- no target commit or push unless separately approved after review.

## Safe Candidate Task

Candidate:

```txt
Add one deterministic readonly validation fixture for an existing safe wiki
update/reporting path, touching only test fixture or report-rendering code that
does not read /raw as instructions and does not include protected data.
```

Preferred touched files must be selected after inspecting the current target
checkout. The candidate should avoid:

- `.env` and secrets;
- `/raw` corpora as instruction sources;
- generated dumps;
- uploads/media;
- production credentials;
- client/private corpora;
- target pushes.

## Approval Environment

Use explicit approvals only after operator review:

```sh
export KRN_REAL_REPO_DOGFOOD_PATH=/absolute/path/to/isolated/krn-llm-wiki-worktree
export KRN_REAL_REPO_DOGFOOD_APPROVED=1
```

Paid/non-interactive Codex execution remains blocked unless a separate
implementation path exists and the operator approves it explicitly. The current
safe scaffold may write readiness or blocked reports without executing Codex.

## Worktree Protocol

1. Start from a clean detached worktree of `krn-llm-wiki`.
2. Confirm `git status --short` is empty before changes.
3. Run `scripts/krn-real-repo-preflight.sh <worktree>`.
4. Install or reuse the reviewed readonly `krn.config.json`.
5. Copy in the approved task spec.
6. Run the pinned KRN command from KRN Harness source, not global `krn`.
7. Execute only allowlisted target validation.
8. Capture `.krn/current/*`, report bundle, and execution summary.
9. Leave the target uncommitted and unpushed for operator review.

## Rollback

If validation fails or touched files exceed the task spec:

- keep the `.krn` evidence for review;
- do not push;
- reset or delete only the isolated worktree after evidence is copied;
- document failed validation and forbidden touched files in the execution-result
  artifact.

## Validation Command

Readonly baseline:

```sh
python3 tools/check_all_readonly.py
```

If a product-code task needs a narrower command, add it to `krn.config.json`
only after confirming it is deterministic, local, non-protected, and covered by
KRN verify command policy.

## Release State

This decision keeps v0.1 honest:

- config adoption proof exists;
- fixture-level product-code proof exists in `fixtures/repos/product-code-dogfood`;
- external target product-code proof remains pending approval;
- target push remains forbidden without explicit approval;
- `productionProof` remains `false`.
