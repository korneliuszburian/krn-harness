# Research Baseline v0.1

## Why KRN Harness Exists

KRN Harness exists to give Codex a local control layer for scoped engineering work: task contract, context package, graph-lite evidence, hooks, trace, verification, and governed memory.

## Why Not a Skill Pack

Skills are reusable workflows loaded through progressive disclosure. KRN Harness needs repo-local runtime state, trace JSONL, generated adapters, and verification contracts, so it cannot be only a collection of prompts.

## Build-Time Skills vs Runtime/Downstream Skills

Build-time skills live in `.agents/skills/*` and help Codex build this repo. Runtime/downstream skills are templates emitted into other repositories under `packages/codex-adapter/src/templates/skills/*`.

## Why Build-Time Skills Use `$skill-creator`

Official Codex skill guidance says to use the built-in creator first for creating skills. This repo follows that rule so skills have valid frontmatter, metadata, and a documented creation path.

## Why krn-search Is Inspiration Only

The reviewed `krn-search` `coding-system` skill has useful operating patterns: frame outcome, read reality first, slice work, declare ownership, verify, and hand off. KRN Harness distills those patterns instead of copying repo-specific content wholesale.

## Why AGENTS.md Must Be Thin

Codex loads `AGENTS.md` automatically as durable repo guidance. A short file protects active context and keeps product detail in docs/specs/ADRs.

## Why Hooks Are Guardrails, Not a Sandbox

Codex hooks can run lifecycle commands and `PreToolUse` can inspect selected tool calls, but multiple hooks can run concurrently and hook trust is separate from full policy enforcement. KRN treats hooks as guardrails and trace points.

## Why Context Package Is Core

Codex best practices emphasize task context, constraints, and done criteria. The context package is the local artifact that makes those inputs inspectable before edits.

## Why Graph-Lite Before Full AST

P0 only needs lightweight repository intelligence from files, manifests, docs links, selectors, and framework hints. Full AST, Tree-sitter, callgraph, and dataflow are deferred until the graph-lite contract proves value.

## Why Governed Memory

Memory can carry useful context across sessions, but official Codex docs treat team guidance as belonging in `AGENTS.md` or checked-in docs. KRN memory therefore starts as pending, evidence-linked, and manually approved.

## Why Trace-Based Evals

Trace JSONL creates auditable evidence for task starts, context builds, verification, hooks, and handoffs. P0 evals use harness-only fixtures to check trace completeness and scope behavior without non-interactive Codex automation.

## Why MCP Later

MCP is useful for external tools and docs, but it adds authentication, tool policy, and security boundaries. P0 documents the later integration without shipping an MCP server.

## Why Dashboard Later

The product is a local runtime/control layer first. Dashboard work is deferred until CLI, trace, verify, memory, and graph contracts have stable evidence.

## Evidence Used

- https://developers.openai.com/codex/learn/best-practices
- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/mcp
- https://developers.openai.com/codex/noninteractive
- https://arxiv.org/abs/2307.03172
- https://arxiv.org/abs/2507.13334
- https://arxiv.org/abs/2601.10112
- https://aider.chat/docs/repomap.html
- https://genai.owasp.org/llmrisk/llm01-prompt-injection/
