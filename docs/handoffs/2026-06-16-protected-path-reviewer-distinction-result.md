# 2026-06-16 Protected Path Reviewer Distinction Result

## Summary

KRN safety review now distinguishes active protected context from declared
task-contract exclusions.

Protected-looking paths in `requiredDoNotUsePaths` are treated as safety
boundary evidence when they appear only as task-contract `do-not-use` items.
Protected-looking active context still blocks.

## Changed Source Behavior

Active protected path behavior:

- A protected-looking path in `expectedTouchedFiles` becomes active `must-read`
  context and fails deterministic safety review.
- Reviewer finding: `active protected path in context: <path>`.

Declared exclusion behavior:

- A protected-looking path in `requiredDoNotUsePaths` becomes a task-contract
  `do-not-use` item.
- It does not create a blocker by itself.
- Reviewer finding: `protected path excluded from active context: <path>`.

Mixed behavior:

- If the same protected-looking path is both expected-touched and do-not-use,
  active context wins and the run blocks.

## Tests

Added end-to-end run-command tests for:

- active protected expected-touched path blocks;
- `.env` and `.env.*` as do-not-use only do not block;
- protected directory exclusions remain do-not-use boundaries;
- mixed active plus exclusion blocks;
- reviewer wording avoids `protected-looking context path` and does not claim
  protected data was touched.

## Docs

Updated:

- `docs/specs/task-contract.schema.md`
- `docs/specs/context-package.schema.md`
- `docs/product/adoption-friction-register.md`
- `docs/product/target-adoption-playbook.md`

## Boundaries

- No protected file contents were created, read, or inspected.
- No schema field was added.
- No CLI command or bundle variant was added.
- No hook trust or production proof claim was added.
- No external audit task or GOAL-8H gated task was implemented.

## Focused Proof

`pnpm vitest run packages/cli/src/run-command.test.ts` passed with 14 tests.
