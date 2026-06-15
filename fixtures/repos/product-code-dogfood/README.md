# Product-Code Dogfood

Tiny downstream fixture for product-code dogfood checks.

The fixture starts with failing product-code implementations and passing oracles once
the implementations are corrected. It is local-only evidence.

## Smoke

```txt
krn start --task-spec fixtures/dogfood/tasks/product-code-test-dogfood.json
krn graph
krn context
krn verify --execute
krn handoff
```

```txt
krn start --task-spec fixtures/dogfood/tasks/product-code-tax-dogfood.json
krn graph
krn context
krn verify --profile tax --execute
krn handoff
```

## Expected Behavior

- KRN context selects `src/index.ts` and the paired `src/index.test.ts`.
- The second task localizes to `src/regional-tax.ts`, `src/regional-tax.test.ts`, and `docs/current-tax.md`.
- `docs/stale-pricing.md` is `do-not-use`.
- `docs/stale-tax.md` is `do-not-use`.
- `krn verify --execute` runs `node src/index.test.ts`.
- `krn verify --profile tax --execute` runs `node src/regional-tax.test.ts`.
- No Codex, CI, network, package install, or production proof is involved.
