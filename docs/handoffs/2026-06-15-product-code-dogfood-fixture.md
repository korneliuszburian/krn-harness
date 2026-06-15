# Product-Code Dogfood Fixture

Date: 2026-06-15

## Scope

Added deterministic fixture-only product-code dogfood evidence:

- `fixtures/repos/product-code-dogfood`
- `fixtures/tasks/product-code-test-dogfood.json`
- `fixtures/dogfood/tasks/product-code-test-dogfood.json`

The fixture starts with an intentionally wrong `src/index.ts` implementation.
The paired `src/index.test.ts` oracle fails until `src/index.ts` is repaired.
`docs/stale-pricing.md` is stale and must stay `do-not-use`.

## Evidence

- CLI test proves the loop selects source, paired test, config, current docs,
  and stale docs into the right context buckets.
- CLI test proves initial `krn verify --execute` fails, then passes after a
  code-only repair where `git diff --name-only` is `src/index.ts`.
- Harness eval now includes `product-code-test-dogfood`; `krn eval` reports
  `pass` with 5 fixtures.

## Validation

- `pnpm lint`: pass
- `pnpm typecheck`: pass
- `pnpm test`: pass, 20 files / 263 tests
- `pnpm --silent krn eval`: pass, 5 fixtures
- `pnpm --silent krn summary --write`: warn
- `pnpm --silent krn report --bundle`: warn
- `pnpm --silent krn release-check --write`: pass
- `pnpm verify:local`: pass, including pinned KRN dogfood preflight
- `git diff --check`: pass

## Limits

This is local fixture proof only. It is not real target product-code mutation,
production proof, CI proof, hook trust proof, MCP, retrieval, or autonomous
subagent evidence.
