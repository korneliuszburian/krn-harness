# KRN Harness

KRN Harness is a Codex-first local agentic engineering runtime/control layer.

It is intentionally not a prompt pack, dashboard-first product, generic multi-agent framework, or large skill pack. P0 focuses on a thin TypeScript workspace that can generate downstream Codex adapters, maintain local runtime state, write traces, and verify handoffs.

Core product principle:

```text
contract -> context -> graph -> hooks -> trace -> verify -> governed memory
```

## What KRN Is

KRN is a local operator runtime for Codex-assisted engineering. It turns a task
into durable artifacts: task contract, context package, graph-lite evidence,
trace events, verify results, handoff, deterministic review/summary/report, and
a run result with supporting report/release-check gates.

It is meant to be used from a source checkout with explicit validation evidence.

## What KRN Is Not

KRN is not a prompt pack, hosted dashboard, generic multi-agent framework,
production MCP server, vector database, package publisher, hook trust proof, or
production proof system.

## Current P0/P1 Surface

- pnpm TypeScript workspace.
- Deterministic `krn` CLI for local current-state artifacts.
- Condensed `krn run` operator workflow that writes run-result artifacts and an
  optional run bundle.
- `krn.config.json` schema and `.krn/` runtime layout.
- Safe downstream install/uninstall lifecycle for `AGENTS.md`, hooks, runtime skill, pinned CLI wrapper, and runtime directories.
- Task contract, context package, graph-lite, trace, verify, handoff, doctor, memory, and eval contracts.
- Verify execute policy documented in ADR-0017: record-only by default, explicit `--execute`, exact command allowlists, no shell mode, scrubbed env, and redacted compact output.
- Hook guardrails with deterministic `allow`, `warn`, and `block` decisions, compact trace evidence, and operator guidance.
- Dogfood evidence for tiny downstream fixture runs and a synthetic WordPress/ACF-style fixture.
- Operator report command for local Markdown, JSON, and static HTML evidence projection.
- Artifact lifecycle commands for listing and safely archiving historical `.krn` caveats.
- Release-check command as a supporting/internal handoff gate plus minimal local-validation CI workflow; no publish automation.
- Repo-scoped build-time skills in `.agents/skills/*`.

## Current Evidence Status

- Tiny downstream fixture dogfood: KRN agents-only, explicit skill, and implicit skill modes reached executable verify and handoff in the latest local comparison.
- Product-code fixture dogfood: `fixtures/repos/product-code-dogfood` proves local source/test/stale-doc context selection for invoice formatting and regional tax tasks, including executable `node src/index.test.ts` and `node src/regional-tax.test.ts` verification after deterministic code-only repairs.
- WordPress/ACF fixture: `fixtures/repos/wordpress-acf-theme` is synthetic and Node-only. It proves graph/context/verify behavior for realistic theme-like source, ACF-like config, stale docs, and handoff artifacts.
- Dogfood CLI identity: KRN-assisted dogfood must use a pinned KRN command path and captured `krn doctor cli` identity. Global `krn` fallback invalidates the run.
- Real user-repo dogfood: docs-only and config-adoption `krn-llm-wiki` evidence exists. A 2026-06-15 isolated `krn-llm-wiki` product-code/checker mutation passed `krn run --task-spec ... --execute-verify --bundle` as local real target product-code proof. Use `scripts/krn-real-repo-preflight.sh <repo-path>` first.
- Hooks: generated hooks and manual `krn hook codex SessionStart` can write `hook.received`, but real Codex hook loading/trust remains unproven until a non-bypass Codex run emits `hook.received`.

## P0/P1 Transition

- P0 exit criteria are tracked in `docs/product/p0-exit-criteria.md`.
- Controlled P1 entry rules are tracked in `docs/product/p1-entry-contract.md`.
- Current stage scorecard and decision are tracked in `docs/product/stage-scorecard.md` and `docs/product/p0-p1-decision.md`.
- P1 starts with local, gated, artifact-first lanes: real-repo workflow, deterministic reviewer records, operator summaries, subagent/reviewer contracts, and knowledge condensation.
- Dashboard-lite, MCP, and vector/retrieval remain contract or experiment lanes only under ADR-0014, ADR-0015, and ADR-0016.
- No production dashboard, production MCP server, required vector DB, autonomous subagent swarm, protected-data workflow, or hook enforcement claim exists.

## 10-Minute Operator Path

```bash
pnpm install
pnpm verify:local
pnpm --silent krn run --task "Update example task with explicit outcome, constraints, and validation proof." --execute-verify --bundle
```

Use `pnpm --silent krn run --task-spec <json> --execute-verify --bundle` when a task spec exists.

`krn run` writes `.krn/current/run-result.json` and
`.krn/current/run-result.md`. With `--bundle`, it writes
`.krn/current/run-bundle/` and uses report/release-check as supporting gates.

## Install Into Target Repo

Use a safe non-protected target checkout or an isolated worktree. Do not use
global `krn` as proof; prefer the source checkout command or a pinned shim.

```bash
pnpm --silent krn install --dry-run --with-config
pnpm --silent krn install --with-config
pnpm --silent krn uninstall --dry-run
```

Install writes only managed onboarding/runtime files. Existing unmanaged files
are preserved.

## Generate Config

```bash
pnpm --silent krn config init --dry-run --profile readonly-python
pnpm --silent krn config init --write --profile readonly-python
```

Starter profiles are conservative. Tune commands only to safe local validation
that belongs to the target repo.

## Validate Config

```bash
pnpm --silent krn config doctor
pnpm --silent krn config doctor --json
```

`config doctor` checks whether verify commands are allowed by KRN policy. It
does not execute the target command.

## Run Verify

```bash
pnpm --silent krn verify
pnpm --silent krn verify --execute
pnpm --silent krn verify --profile readonly --execute
```

`krn verify` is record-only by default. `--execute` is required for executable
local validation and still uses exact command allowlists, scrubbed env, no shell
mode, timeout limits, and compact output.

## Advanced Plumbing / Troubleshooting

```bash
pnpm --silent krn doctor cli
pnpm --silent krn start "Update example task with explicit outcome, constraints, and validation proof."
pnpm --silent krn start --task-spec <json>
pnpm --silent krn graph
pnpm --silent krn context
pnpm --silent krn verify --execute
pnpm --silent krn handoff
pnpm --silent krn review --write
pnpm --silent krn summary --write
pnpm --silent krn report --bundle
pnpm --silent krn release-check --write
```

The plumbing commands remain useful for diagnosis and compatibility. The normal
operator path is `krn run`.

## Read Proof States

- `productionProof.value: false` means the artifact is local evidence only.
- `hookTrust.status: unproven` means hook loading/trust has not been proven by a
  non-bypass Codex run.
- `verify.mode: execute` plus executed commands is local validation evidence.
- `realRepoEvidence.status: readiness` is not real target mutation proof.
- Historical `.krn` caveats may warn without blocking current report artifacts.

## Known Limits

- Hook trust remains unproven unless scoped non-bypass hook provenance exists.
- Production proof remains false.
- Product-code proof is fixture-level unless an approved target worktree task is
  executed and validated.
- Run and report bundles do not copy raw trace dumps by default.
- KRN does not publish packages, push target repos, run paid Codex, or call
  network services in local release gates.

## Target Repo Safety

Do not touch protected data: `.env`, dumps, uploads/media, client documents,
credentials, private corpora, or protected corpora. For real target adoption,
run:

```bash
scripts/krn-real-repo-preflight.sh <repo-path>
scripts/krn-real-repo-dogfood.sh
```

The real-repo dogfood scaffold is report-only unless explicit operator approval
environment variables are present. Do not push target repos without explicit
approval.

## Command Reference

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:local
pnpm --silent krn --help
pnpm --silent krn run --task "Command reference smoke" --dry-run --json
pnpm --silent krn run --task-spec fixtures/tasks/product-code-test-dogfood.json --dry-run
pnpm --silent krn status
pnpm --silent krn graph
pnpm --silent krn handoff
pnpm --silent krn doctor
pnpm --silent krn eval
pnpm --silent krn review
pnpm --silent krn summary
pnpm --silent krn report --json
pnpm --silent krn report --bundle
pnpm --silent krn release-check --write
pnpm --silent krn artifacts list
pnpm --silent krn artifacts archive --dry-run
pnpm --silent krn memory list
pnpm --silent krn hook codex SessionStart
```

## Demo

See `docs/demo/downstream-basic-demo.md` for local downstream onboarding and product-code fixture smokes using `fixtures/repos/downstream-basic` and `fixtures/repos/product-code-dogfood`.

See `docs/demo/codex-dogfood.md` for artifact-first dogfood protocols, including the synthetic WordPress/ACF fixture.

See `docs/demo/real-repo-dogfood.md` for the first real user-repo dry dogfood protocol, including preflight, safety boundaries, prompt templates, and skipped-run conditions.

## P0 Non-Goals

No dashboard, MCP server, multi-agent orchestrator, vector DB, semantic embeddings, full Tree-sitter graph, production WordPress detector, browser evidence layer, GitHub Action, plugin distribution, autonomous researcher, or auto-approved memory is implemented in P0.

## Repository Truth

`AGENTS.md`, `docs/architecture/*`, `docs/specs/*`, and `docs/adr/*` are the active project truth. Raw research is only evidence until distilled into those files.
