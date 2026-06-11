# Architecture Spec v0.1

## Goals

Create a Codex-first local harness that turns task intent into a contract, context package, graph-lite evidence, hooks, trace, verification, and governed memory.

## Non-Goals

No dashboard, MCP server, multi-agent orchestrator, vector DB, semantic embeddings, full AST/callgraph/dataflow, full Tree-sitter graph, production WordPress detector, browser evidence layer, GitHub Action, plugin distribution, autonomous researcher, or auto-approved memory in P0.

## Runtime Model

Downstream repositories use `krn.config.json` for stable config and `.krn/` for local runtime state. `.krn/current/` contains current task, context, verify, handoff, doctor, and eval artifacts. `.krn/runs/<task_id>/` contains run-scoped trace and metadata for the current task. `.krn/traces/trace.jsonl` remains the global trace for install, hooks, memory commands, and compatibility events.

## File Layout

The P0 monorepo uses `packages/*` for TypeScript packages, `docs/*` for canon/spec/ADR truth, `.agents/skills/*` for build-time skills, `fixtures/*` for harness-only eval inputs, and `examples/*` for downstream examples.

## CLI Commands

`krn --help`, `krn status`, `krn start "<task>"`, `krn graph`, `krn context`, `krn verify`, `krn handoff`, `krn doctor`, `krn eval`, `krn install`, and `krn memory <command>` are deterministic P0 commands. Hook entrypoints accept `krn hook codex <event>`.

## Codex Adapter Model

The adapter emits a thin downstream `AGENTS.md`, a Codex `hooks.json`, and one runtime skill template. It does not install plugins or MCP servers in P0.

## Build-Time Skills Model

Build-time skills are repo-scoped `.agents/skills/*` workflows created through `$skill-creator`: `buduj`, `kanon`, `pilnuj`, `wycinek`, and `handoff`.

## Runtime Skill Adapter Model

The downstream runtime skill is a short instruction-only template that routes Codex through `krn status`, `krn start`, `krn context`, STOP policy, `krn verify`, and `krn handoff`.

## Hook Pack

The hook template covers `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `PostCompact`, and `Stop`. Hooks return deterministic `allow`, `warn`, or `block` guardrail decisions for current-state issues, STOP state, out-of-scope edits, and final verify/handoff readiness. They are trace/guardrail entrypoints, not a complete sandbox.

## Task Contract

The task contract records task id, task text, classification, acceptance hints, proof hints, and STOP state.

## Context Package

The context package ranks minimal context items and records STOP state before edits.

## Graph-Lite

Graph-lite exposes nodes, edges, and detector interfaces. P0 ships file and package-json detectors plus no-op detector placeholders for future framework hints.

## Trace

Trace writes JSONL events. Task-loop commands write run-scoped events under `.krn/runs/<task_id>/trace.jsonl` and mirror current evidence to the global trace where needed. Install, hook, and memory commands write compact global trace events.

## Verify/Evidence

Verify records deterministic P0 result artifacts from current task/context/config state. It resolves named profiles, applies a narrow command allowlist, records limits, and defaults to record-only mode. `execute` mode runs only allowlisted command/args with no shell mode, timeout enforcement, and compact stdout/stderr tails. P0 evidence is local validation only and must not be called production proof.

## Memory

Memory records are pending, approved, or deprecated. P0 does not approve memory autonomously, and approved memory can enter context only as reference-only material through explicit-request or task-relevance gates with broad-term and English/Polish opt-out guards.

## Doctor

Doctor returns typed checks for runtime, adapters, skills, context, docs, memory, graph, and trace health.

## Harness-Only Evals

P0 eval fixtures are tiny local repos and tasks. They cover context, STOP, graph-lite, memory gates, hook guardrails, trace completeness, and downstream onboarding acceptance. They do not run real non-interactive Codex eval automation.

## Security/Trust

Trust boundaries are explicit: user prompt, repo files, `.krn/` runtime state, hooks, generated templates, future MCP, and memories each have separate trust properties.

## P0/P1/P2/P3

P0 is the deterministic local harness loop, shallow graph/context evidence, hook guardrails, governed memory gates, downstream onboarding, and harness-only evals. P1 may harden runtime intelligence. P2 may add richer graph intelligence. P3 may add dashboard, MCP server, or plugin distribution after ADR approval.
