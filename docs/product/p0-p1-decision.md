# P0/P1 Decision

## Decision

P0 is complete for the local deterministic harness loop.

P1 is entered under contract-first constraints. The v0.1 local proof threshold
is crossed for the local tool candidate.

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

- real-repo workflow: preflight plus skipped/blocked/readiness scaffold and one
  isolated real target product-code/checker proof through `krn run`;
- reviewers: deterministic `krn review --write` artifact records;
- operator summary: deterministic `krn summary --write` artifact;
- verify execute policy: ADR-0017 documents explicit `--execute`, exact allowlists, no shell mode, scrubbed env, redaction, and the narrow coverage exception;
- dashboard-lite: ADR for static local generated HTML only;
- MCP: read-only resource contract only, no server;
- vector/retrieval: synthetic experiment contract only, no vector DB or embeddings dependency;
- subagent/reviewer contracts: reviewer-like roles first, no autonomous swarm;
- knowledge condensation: review-only workflow, no auto-approved memory.

## Still Unproven

- Durable committed target verify profile beyond isolated-worktree real target
  product-code proof.
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
- production real-repo validation;
- hook enforcement;
- arbitrary verify command execution;
- dashboard product readiness;
- MCP server readiness;
- vector retrieval quality;
- autonomous subagent capability.

## Next Controlled Use Protocol

1. Run `pnpm verify:local`.
2. Run `pnpm --silent krn run --task-spec <task.json> --execute-verify --bundle`
   on an approved isolated target worktree.
3. Keep target commit/push separate and explicitly approved.
4. Treat hooks, production proof, publishing, MCP, dashboard, vector retrieval,
   and autonomous subagents as separate future goals.
