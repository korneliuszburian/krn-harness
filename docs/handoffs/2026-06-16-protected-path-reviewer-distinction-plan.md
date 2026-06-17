# 2026-06-16 Protected Path Reviewer Distinction Plan

## Scope

Fix one false positive from the overnight adoption gauntlet: protected-looking
paths declared only as task-spec exclusions should not be treated as active
protected-data usage by deterministic reviewers.

This is not a schema expansion, CLI feature, hook-trust task, production proof
task, external audit implementation, runtime-dir change, or adoption proof rerun.

## Current Behavior

`packages/cli/src/commands/review.ts` safety review scans every
`contextPackage.items[*].path` and fails on protected-looking strings. That
includes `do-not-use` items created from
`metadata.requiredDoNotUsePaths`.

During the `marketing-intelligence-studio` proof, `.env` and `.env.*` in
structured exclusions were reported as `protected-looking context path`, even
though they were safety boundaries and not active context.

## Intended Behavior

- Active protected paths still fail:
  - `must-read`
  - `should-read`
  - `reference-only`
  - expected touched files such as `.env`
- Declared exclusions do not fail:
  - bucket `do-not-use`
  - source `task-contract`
  - selector `required-do-not-use-path`
- Mixed active + exclusion still fails because active use wins.
- Reviewer findings should distinguish exclusions from active usage.
- No protected file contents are read.

## Files To Change

- `packages/cli/src/commands/review.ts`
- `packages/cli/src/run-command.test.ts`
- `docs/specs/context-package.schema.md`
- `docs/specs/task-contract.schema.md`
- `docs/product/adoption-friction-register.md`
- `docs/product/target-adoption-playbook.md`
- `docs/handoffs/2026-06-16-protected-path-reviewer-distinction-result.md`

## Tests

Add end-to-end `krn run --task-spec ...` tests covering:

- active protected path in `expectedTouchedFiles` still blocks;
- `.env` / `.env.*` only in `requiredDoNotUsePaths` does not block;
- protected directory exclusions do not block;
- mixed expected-touched plus required-do-not-use blocks;
- reviewer wording says protected paths were excluded from active context for
  exclusions, not used/touched.

## Safety Boundary

Tests use path strings only. They do not create, read, or inspect protected file
contents.
