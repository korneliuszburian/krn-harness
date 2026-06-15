# Product-Code Dogfood

Tiny downstream fixture for product-code dogfood checks.

The fixture starts with a failing product-code implementation and a passing oracle in
`src/index.test.ts` once the implementation is corrected. It is local-only evidence.

## Smoke

```txt
krn start --task-spec fixtures/dogfood/tasks/product-code-test-dogfood.json
krn graph
krn context
krn verify --execute
krn handoff
```

## Expected Behavior

- KRN context selects `src/index.ts` and the paired `src/index.test.ts`.
- `docs/stale-pricing.md` is `do-not-use`.
- `krn verify --execute` runs `node src/index.test.ts`.
- No Codex, CI, network, package install, or production proof is involved.
