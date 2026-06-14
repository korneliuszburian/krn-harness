# KRN Harness

KRN Harness is a Codex-first local agentic engineering runtime/control layer.

It is intentionally not a prompt pack, dashboard-first product, generic multi-agent framework, or large skill pack. P0 focuses on a thin TypeScript workspace that can generate downstream Codex adapters, maintain local runtime state, write traces, and verify handoffs.

Core product principle:

```text
contract -> context -> graph -> hooks -> trace -> verify -> governed memory
```

## Current P0 Surface

- pnpm TypeScript workspace.
- Deterministic `krn` CLI for local current-state artifacts.
- `krn.config.json` schema and `.krn/` runtime layout.
- Safe downstream install for `AGENTS.md`, hooks, runtime skill, and runtime directories.
- Task contract, context package, graph-lite, trace, verify, handoff, doctor, memory, and eval contracts.
- Hook guardrails with deterministic `allow`, `warn`, and `block` decisions, compact trace evidence, and operator guidance.
- Dogfood evidence for tiny downstream fixture runs and a synthetic WordPress/ACF-style fixture.
- Repo-scoped build-time skills in `.agents/skills/*`.

## Current Evidence Status

- Tiny downstream fixture dogfood: KRN agents-only, explicit skill, and implicit skill modes reached executable verify and handoff in the latest local comparison.
- WordPress/ACF fixture: `fixtures/repos/wordpress-acf-theme` is synthetic and Node-only. It proves graph/context/verify behavior for realistic theme-like source, ACF-like config, stale docs, and handoff artifacts.
- Dogfood CLI identity: KRN-assisted dogfood must use a pinned KRN command path and captured `krn doctor cli` identity. Global `krn` fallback invalidates the run.
- Real user-repo dogfood: pending unless `KRN_REAL_REPO_DOGFOOD_PATH` and `KRN_REAL_REPO_DOGFOOD_APPROVED=1` are explicitly configured. Use `scripts/krn-real-repo-preflight.sh <repo-path>` first.
- Hooks: generated hooks and manual `krn hook codex SessionStart` can write `hook.received`, but real Codex hook loading/trust remains unproven until a non-bypass Codex run emits `hook.received`.

## P0/P1 Transition

- P0 exit criteria are tracked in `docs/product/p0-exit-criteria.md`.
- Controlled P1 entry rules are tracked in `docs/product/p1-entry-contract.md`.
- Current stage scorecard and decision are tracked in `docs/product/stage-scorecard.md` and `docs/product/p0-p1-decision.md`.
- P1 starts with local, gated, artifact-first lanes: real-repo workflow, deterministic reviewer records, operator summaries, subagent/reviewer contracts, and knowledge condensation.
- Dashboard-lite, MCP, and vector/retrieval remain contract or experiment lanes only under ADR-0014, ADR-0015, and ADR-0016.
- No production dashboard, production MCP server, required vector DB, autonomous subagent swarm, protected-data workflow, or hook enforcement claim exists.

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:local
scripts/krn-real-repo-preflight.sh <repo-path>
scripts/krn-real-repo-dogfood.sh
pnpm --silent krn --help
pnpm --silent krn status
pnpm --silent krn install
pnpm --silent krn start "Update example task with explicit outcome, constraints, and validation proof."
pnpm --silent krn start --task-spec <json>
pnpm --silent krn graph
pnpm --silent krn context
pnpm --silent krn verify
pnpm --silent krn verify --execute
pnpm --silent krn handoff
pnpm --silent krn doctor
pnpm --silent krn doctor cli
pnpm --silent krn eval
pnpm --silent krn summary
pnpm --silent krn review
pnpm --silent krn memory list
pnpm --silent krn hook codex SessionStart
```

## Demo

See `docs/demo/downstream-basic-demo.md` for a local downstream onboarding smoke using `fixtures/repos/downstream-basic`.

See `docs/demo/codex-dogfood.md` for artifact-first dogfood protocols, including the synthetic WordPress/ACF fixture.

See `docs/demo/real-repo-dogfood.md` for the first real user-repo dry dogfood protocol, including preflight, safety boundaries, prompt templates, and skipped-run conditions.

## P0 Non-Goals

No dashboard, MCP server, multi-agent orchestrator, vector DB, semantic embeddings, full Tree-sitter graph, production WordPress detector, browser evidence layer, GitHub Action, plugin distribution, autonomous researcher, or auto-approved memory is implemented in P0.

## Repository Truth

`AGENTS.md`, `docs/architecture/*`, `docs/specs/*`, and `docs/adr/*` are the active project truth. Raw research is only evidence until distilled into those files.
