# Release Checklist

KRN Harness is private P0 source at `0.0.0`. This checklist is readiness prep, not a publish workflow.

## Required Local Validation

Run from the source checkout:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm --silent krn --help
pnpm --silent krn status
pnpm --silent krn install
pnpm --silent krn start "release checklist smoke"
pnpm --silent krn graph
pnpm --silent krn context
pnpm --silent krn hook codex SessionStart
pnpm --silent krn hook codex PreToolUse
pnpm --silent krn verify
pnpm --silent krn handoff
pnpm --silent krn doctor
pnpm --silent krn eval
git diff --check
git status --short
```

## Downstream Fixture Smoke

Run the local demo in `docs/demo/downstream-basic-demo.md` against a temp copy of `fixtures/repos/downstream-basic`.

Expected result:

- install preserves existing files and creates missing runtime artifacts;
- `krn verify` records the safe profile without execution;
- `krn verify --execute` runs the allowlisted `node src/index.test.ts` fixture;
- doctor/eval remain local deterministic checks.

## Metadata Decision

Do not add `bin` metadata yet. The current CLI entrypoint is TypeScript source run through `tsx` via the repo-local `pnpm krn` script. Add `bin` only after a build output and package boundary are defined.

## Version And Changelog

- Version is currently `0.0.0`.
- Do not publish from P0.
- Before any future version bump, add a changelog entry summarizing operator-visible changes, validation evidence, and known limitations.

## Non-Goals

Do not add GitHub Actions, npm publish automation, plugin distribution, hosted services, or Codex CLI CI dependency as part of this checklist.
