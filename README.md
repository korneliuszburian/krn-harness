# KRN Harness

KRN Harness is a Codex-first local agentic engineering runtime/control layer.

It is intentionally not a prompt pack, dashboard-first product, generic multi-agent framework, or large skill pack. P0 focuses on a thin TypeScript workspace that can generate downstream Codex adapters, maintain local runtime state, write traces, and verify handoffs.

Core product principle:

```text
contract -> context -> graph -> hooks -> trace -> verify -> governed memory
```

## Current P0 Surface

- pnpm TypeScript workspace.
- Skeletal `krn` CLI with deterministic commands.
- `krn.config.json` schema and `.krn/` runtime layout model.
- Downstream `AGENTS.md`, hooks, and runtime skill templates.
- Task contract, context package, graph-lite, trace, verify, doctor, memory, and eval package skeletons.
- Repo-scoped build-time skills in `.agents/skills/*`.

## Commands

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm --silent krn --help
pnpm --silent krn status
```

## P0 Non-Goals

No dashboard, MCP server, multi-agent orchestrator, vector DB, semantic embeddings, full Tree-sitter graph, production WordPress detector, browser evidence layer, GitHub Action, plugin distribution, autonomous researcher, or auto-approved memory is implemented in P0.

## Repository Truth

`AGENTS.md`, `docs/architecture/*`, `docs/specs/*`, and `docs/adr/*` are the active project truth. Raw research is only evidence until distilled into those files.
