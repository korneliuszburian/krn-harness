# Release Checklist

KRN Harness is private P0 source at `0.0.0`. This checklist is readiness prep, not a publish workflow.

## Required Local Validation

Run from the source checkout:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:local
pnpm --silent krn --help
pnpm --silent krn status
pnpm --silent krn install
pnpm --silent krn start "Run release checklist smoke with graph, context, hooks, verify, handoff, doctor, eval, and diff-check proof."
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

`pnpm verify:local` is the no-model local gate. It runs lint, typecheck, tests, and the fixture dogfood preflight. It must not depend on paid Codex calls, hook trust, CI, network, or real user repositories.

## Downstream Fixture Smoke

Run the local demo in `docs/demo/downstream-basic-demo.md` against a temp copy of `fixtures/repos/downstream-basic`.

Expected result:

- install preserves existing files and creates missing runtime artifacts;
- `krn verify` records the safe profile without execution;
- `krn verify --execute` runs the allowlisted `node src/index.test.ts` fixture;
- doctor/eval remain local deterministic checks.

## Real-Repo Preflight Smoke

Before a first real user-repo dogfood, run:

```bash
scripts/krn-real-repo-preflight.sh <repo-path>
```

This is a readiness check only. It uses filename/path heuristics, rejects the KRN source checkout as a target, reports pinned CLI identity, and writes `.krn/dogfood/real-repo-preflight/latest/summary.json` plus `summary.md` in the target repo.

Do not include paid dogfood, real repo mutation beyond local `.krn` preflight state, or hook trust proof in CI/local release gates.

## CLI Metadata Decision

`@krn-harness/cli` has local `bin` metadata for dogfood linking only. The entrypoint remains TypeScript source with a `tsx` shebang, so this is not a publish-ready package boundary.

Before any package publication, define a built output, package files, versioning policy, and install contract.

## Version And Changelog

- Version is currently `0.0.0`.
- Do not publish from P0.
- Before any future version bump, add a changelog entry summarizing operator-visible changes, validation evidence, and known limitations.

## Non-Goals

Do not add GitHub Actions, npm publish automation, plugin distribution, hosted services, or Codex CLI CI dependency as part of this checklist.
