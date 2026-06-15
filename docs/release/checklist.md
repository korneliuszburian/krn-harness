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
pnpm --silent krn install --dry-run
pnpm --silent krn install
pnpm --silent krn config doctor
pnpm --silent krn config init --dry-run --profile readonly-python
pnpm --silent krn start "Run release checklist smoke with graph, context, hooks, verify, handoff, doctor, eval, and diff-check proof."
pnpm --silent krn graph
pnpm --silent krn context
pnpm --silent krn hook codex SessionStart
pnpm --silent krn hook codex PreToolUse
pnpm --silent krn verify
pnpm --silent krn handoff
pnpm --silent krn doctor
pnpm --silent krn eval
pnpm --silent krn review --write
pnpm --silent krn summary --write
pnpm --silent krn report --write
pnpm --silent krn report --bundle
pnpm --silent krn release-check --write
pnpm --silent krn release-check --bundle
pnpm --silent krn uninstall --dry-run
git diff --check
git status --short
```

`pnpm verify:local` is the no-model local gate. It runs lint, typecheck, tests, and the fixture dogfood preflight. It must not depend on paid Codex calls, hook trust, CI, network, or real user repositories.

## Downstream Fixture Smoke

Run the local demo in `docs/demo/downstream-basic-demo.md` against a temp copy of `fixtures/repos/downstream-basic`.

Expected result:

- install preserves existing files and creates missing runtime artifacts;
- install dry-run writes no runtime artifacts;
- config doctor reports safe/blocked verify policy before execution;
- `krn verify` records the safe profile without execution;
- `krn verify --execute` runs the allowlisted `node src/index.test.ts` fixture;
- uninstall dry-run plans only marker-managed file removals and preserves
  `.krn/current`;
- doctor/eval/review/summary remain local deterministic checks.

For product-code fixture proof, run the product-code fixture section in the same demo against `fixtures/repos/product-code-dogfood`.

Expected result:

- initial `krn verify --execute` fails on the intentionally wrong source implementation;
- after a code-only repair, `krn verify --execute` passes with one executed command;
- `src/index.test.ts` is selected as paired test context but remains untouched;
- `docs/stale-pricing.md` remains `do-not-use`;
- `git diff --name-only` reports `src/index.ts` only.

The second product-code fixture task,
`fixtures/dogfood/tasks/product-code-tax-dogfood.json`, should localize context
to `src/regional-tax.ts`, `src/regional-tax.test.ts`, and `docs/current-tax.md`.
After a code-only repair, `krn verify --profile tax --execute` should run
`node src/regional-tax.test.ts`; `docs/stale-tax.md` should remain `do-not-use`;
`git diff --name-only` should report `src/regional-tax.ts` only.

## Real-Repo Preflight Smoke

Before a first real user-repo dogfood, run:

```bash
scripts/krn-real-repo-preflight.sh <repo-path>
```

This is a readiness check only. It uses filename/path heuristics, rejects the KRN source checkout as a target, reports pinned CLI identity, and writes `.krn/dogfood/real-repo-preflight/latest/summary.json` plus `summary.md` in the target repo.

The real-repo dogfood scaffold is:

```sh
scripts/krn-real-repo-dogfood.sh
```

It must remain report-only unless explicit operator approvals are present. Missing approvals write a skipped report; preflight blockers write a blocked report; eligible repos without paid Codex execution write a readiness report. Do not make this command part of CI or `pnpm verify:local`.

Do not include paid dogfood, real repo mutation beyond local `.krn` preflight state, or hook trust proof in CI/local release gates.

## Minimal CI Gate

`.github/workflows/verify.yml` may run only local no-model validation:

- dependency install;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm verify:local`;
- `pnpm --silent krn report --write`;
- `pnpm --silent krn release-check --write`;
- `pnpm --silent krn release-check --bundle`.

It must not run paid Codex execution, real user-repo dogfood, package
publication, deployment, or a Codex CLI CI dependency.

## CLI Metadata Decision

`@krn-harness/cli` has local `bin` metadata for dogfood linking only. The entrypoint remains TypeScript source with a `tsx` shebang, so this is not a publish-ready package boundary.

Before any package publication, define a built output, package files, versioning policy, and install contract.

## Version And Changelog

- Version is currently `0.0.0`.
- Do not publish from P0.
- Before any future version bump, add a changelog entry summarizing operator-visible changes, validation evidence, and known limitations.

## Non-Goals

Do not add npm publish automation, plugin distribution, hosted services, real
user-repo mutation, paid Codex/model calls, or Codex CLI CI dependency as part
of this checklist.
