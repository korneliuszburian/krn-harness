# Goal 8H Readiness Slice Handoff

## Summary

This slice moved KRN dogfood from synthetic proof toward first real-repo readiness without adding P0-forbidden product layers.

Implemented:

- dogfood report evidence summary with run validity, CLI identity, artifact, context, forbidden-file, verify, handoff, and hook-status sections;
- invalid KRN identity/global fallback reporting;
- real-repo preflight script with pinned KRN identity, safe verify-profile inspection, path/filename risk warnings, JSON output, and Markdown output;
- real-repo dogfood protocol with safety checklists, prompt templates, scoring rubric, skipped-run rule, and safe verify examples;
- downstream template wording for pinned command paths, `krn graph` before `krn context`, conditional verify execute, and hook-unproven status;
- ADR-0013 for dogfood CLI identity and real-repo preflight decisions;
- `pnpm verify:local` no-model local gate.

## Validation

Passed:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test` (`17 passed`, `208 passed`)
- `pnpm --silent krn --help`
- `pnpm --silent krn status`
- `pnpm --silent krn doctor cli`
- `scripts/krn-dogfood-preflight.sh`
- `scripts/codex-hook-trust-probe.sh`
- `scripts/codex-dogfood-smoke.sh` (skipped by design without `RUN_KRN_CODEX_DOGFOOD=1`)
- `scripts/krn-real-repo-preflight.sh` on a temp `downstream-basic` git fixture
- `pnpm verify:local`
- `git diff --check`

One parallel validation attempt of `scripts/krn-dogfood-preflight.sh` failed because `krn status` mutated source `.krn` during the preflight snapshot window. The same command passed when rerun alone.

## Real-Repo Status

First real user-repo dogfood was skipped because required configuration is missing:

- `KRN_REAL_REPO_DOGFOOD_PATH`
- `KRN_REAL_REPO_DOGFOOD_APPROVED=1`

Skipped report artifact:

```text
.krn/dogfood/real-repo-skipped/2026-06-13T15-59-08-112Z/report.md
```

This does not validate a real user repo.

## Known Gaps

- Full paid WP/ACF benchmark rerun was not executed in this slice.
- Real Codex hook loading/trust remains unproven.
- Real user-repo dogfood remains pending explicit safe path and approval.
- Preflight uses filename/path heuristics only; it does not prove absence of secrets.

## Next Goal

Run the paid-call-approved WP/ACF benchmark rerun with the hardened report shape and pinned CLI identity metadata, then decide whether to execute or keep skipping first real user-repo dogfood based on explicit operator configuration.
