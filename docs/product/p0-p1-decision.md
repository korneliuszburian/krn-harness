# P0/P1 Decision

## Decision

P0 is complete for the local deterministic harness loop.

P1 is entered under contract-first constraints.

## P0 Complete Means

The following are source-controlled and validated locally:

- CLI/core skeleton;
- `.krn/` runtime model;
- task contract;
- context package;
- graph-lite;
- hooks template and hook trace entrypoints;
- trace JSONL;
- verify;
- handoff;
- doctor;
- governed memory;
- dogfood/evals;
- downstream adapters;
- runtime skill template;
- pinned CLI identity for dogfood;
- real-repo preflight and report-only dogfood scaffold.

This is not production readiness.

## P1 Entered Means

P1 starts only through gated local artifacts and contracts:

- real-repo workflow: preflight plus skipped/blocked/readiness scaffold;
- reviewers: deterministic `krn review --write` artifact records;
- operator summary: deterministic `krn summary --write` artifact;
- dashboard-lite: ADR for static local generated HTML only;
- MCP: read-only resource contract only, no server;
- vector/retrieval: synthetic experiment contract only, no vector DB or embeddings dependency;
- subagent/reviewer contracts: reviewer-like roles first, no autonomous swarm;
- knowledge condensation: review-only workflow, no auto-approved memory.

## Still Unproven

- Real user-repo dogfood execution.
- Real Codex hook loading/trust.
- Noisy large repo behavior.
- Production WordPress/ACF behavior.
- CI evidence.
- Dashboard-lite usefulness beyond ADR.
- MCP usefulness beyond contract.
- Retrieval/vector usefulness beyond experiment contract.
- Reviewer usefulness beyond first deterministic records.
- Operator summary usefulness beyond first deterministic artifact.

## Product Decision

KRN may proceed with controlled P1 slices that read local artifacts and preserve operator approval gates.

KRN must not claim:

- production readiness;
- real-repo validation;
- hook enforcement;
- dashboard product readiness;
- MCP server readiness;
- vector retrieval quality;
- autonomous subagent capability.

## Next Controlled Use Protocol

1. Run `pnpm verify:local`.
2. Run `pnpm --silent krn review --write`.
3. Run `pnpm --silent krn summary --write`.
4. Run `scripts/krn-real-repo-dogfood.sh` without env to confirm skipped reporting.
5. Run `scripts/krn-real-repo-dogfood.sh` on a safe temp git fixture with explicit env to confirm readiness reporting.
6. Only after operator approval, select a non-protected real repo and run preflight.
7. Treat any real-repo execution as a manual protocol until an ADR accepts a Codex execution wrapper.
