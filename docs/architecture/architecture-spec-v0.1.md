# Architecture Spec v0.1

## Goals

Create a Codex-first local harness that turns task intent into a contract, context package, graph-lite evidence, hooks, trace, verification, and governed memory.

## Non-Goals

No dashboard, MCP server, multi-agent orchestrator, vector DB, semantic embeddings, full AST/callgraph/dataflow, full Tree-sitter graph, production WordPress detector, browser evidence layer, GitHub Action, plugin distribution, autonomous researcher, or auto-approved memory in P0.

## Runtime Model

Downstream repositories use `krn.config.json` for stable config and `.krn/` for local runtime state. `.krn/current/` contains the current task contract and context package.

## File Layout

The P0 monorepo uses `packages/*` for TypeScript packages, `docs/*` for canon/spec/ADR truth, `.agents/skills/*` for build-time skills, `fixtures/*` for harness-only eval inputs, and `examples/*` for downstream examples.

## CLI Commands

`krn --help`, `krn status`, `krn start "<task>"`, `krn graph`, `krn context`, `krn verify`, `krn handoff`, `krn doctor`, `krn eval`, `krn install`, and `krn memory <command>` are deterministic skeleton commands. Hook entrypoints accept `krn hook codex <event>`.

## Codex Adapter Model

The adapter emits a thin downstream `AGENTS.md`, a Codex `hooks.json`, and one runtime skill template. It does not install plugins or MCP servers in P0.

## Build-Time Skills Model

Build-time skills are repo-scoped `.agents/skills/*` workflows created through `$skill-creator`: `buduj`, `kanon`, `pilnuj`, `wycinek`, and `handoff`.

## Runtime Skill Adapter Model

The downstream runtime skill is a short instruction-only template that routes Codex through `krn status`, `krn start`, `krn context`, STOP policy, `krn verify`, and `krn handoff`.

## Hook Pack

The hook template covers `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `PostCompact`, and `Stop`. Hooks are trace/guardrail entrypoints, not a complete sandbox.

## Task Contract

The task contract records task id, task text, classification, acceptance hints, proof hints, and STOP state.

## Context Package

The context package ranks minimal context items and records STOP state before edits.

## Graph-Lite

Graph-lite exposes nodes, edges, and detector interfaces. P0 ships file and package-json detectors plus no-op detector placeholders for future framework hints.

## Trace

Trace writes JSONL events under `.krn/traces/trace.jsonl`.

## Verify/Evidence

Verify is a skeleton profile runner. P0 evidence is local validation only and must not be called production proof.

## Memory

Memory records are pending, approved, or deprecated. P0 does not approve memory autonomously, and approved memory can enter context only as reference-only material through explicit-request or task-relevance gates with broad-term and opt-out guards.

## Doctor

Doctor returns typed checks for runtime, adapters, skills, context, docs, memory, graph, and trace health.

## Harness-Only Evals

P0 eval fixtures are tiny local repos and tasks. They do not run real non-interactive Codex eval automation.

## Security/Trust

Trust boundaries are explicit: user prompt, repo files, `.krn/` runtime state, hooks, generated templates, future MCP, and memories each have separate trust properties.

## P0/P1/P2/P3

P0 is this scaffold and local typed skeleton. P1 may harden context/verify behavior. P2 may add richer graph intelligence. P3 may add dashboard, MCP server, or plugin distribution after ADR approval.
