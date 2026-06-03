---
name: buduj
description: Top-level KRN Harness build workflow. Use when starting non-trivial KRN Harness repository setup, architecture work, TypeScript implementation, refactors, multi-step fixes, research-to-implementation work, or any task where Codex should move from intent to verified delivery instead of answering casually.
---

# Buduj

Use this as the default operating loop for substantial KRN Harness work.

## Workflow

1. Frame the outcome as acceptance criteria and proof level.
2. Read reality first: inspect files, package state, docs, ADRs, scripts, and current git state before editing.
3. Choose supporting skills when relevant: `$kanon` for canon/spec/ADR work, `$pilnuj` for scope control, `$wycinek` for implementation slices, and `$handoff` before final review handoff.
4. Slice the work into small vertical beads.
5. Declare owned files or areas before edits.
6. Keep implementation within documented P0 scope.
7. Verify before claiming completion.
8. End with changed files, commands and results, residual risks, and the next concrete action.

## Constraints

- Do not build dashboard, MCP server, multi-agent orchestration, vector DB, semantic embeddings, full AST/callgraph/dataflow, full Tree-sitter graph, GitHub Action, plugin distribution, autonomous memory approval, or many runtime skills in P0.
- Do not broaden scope silently.
- Do not claim done without validation evidence.
- Keep `AGENTS.md` concise; put product detail in docs, specs, or ADRs.
- Prefer TypeScript-first implementation and pnpm workflows.
- Add dependencies only with explicit justification.

## Bead Shape

Use this shape for each non-trivial slice:

```text
Bead: <small outcome>
Files/areas: <owned paths>
Acceptance: <observable repo state or behavior>
Proof: <command/test/output>
Risk: <remaining uncertainty>
```
