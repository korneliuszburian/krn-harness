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
- Repo-scoped build-time skills in `.agents/skills/*`.

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm --silent krn --help
pnpm --silent krn status
pnpm --silent krn install
pnpm --silent krn start "example task"
pnpm --silent krn graph
pnpm --silent krn context
pnpm --silent krn verify
pnpm --silent krn handoff
pnpm --silent krn doctor
pnpm --silent krn eval
```

## Demo

See `docs/demo/downstream-basic-demo.md` for a local downstream onboarding smoke using `fixtures/repos/downstream-basic`.

## P0 Non-Goals

No dashboard, MCP server, multi-agent orchestrator, vector DB, semantic embeddings, full Tree-sitter graph, production WordPress detector, browser evidence layer, GitHub Action, plugin distribution, autonomous researcher, or auto-approved memory is implemented in P0.

## Repository Truth

`AGENTS.md`, `docs/architecture/*`, `docs/specs/*`, and `docs/adr/*` are the active project truth. Raw research is only evidence until distilled into those files.
