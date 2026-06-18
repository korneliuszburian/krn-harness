---
name: buduj
description: Top-level KRN Harness build workflow. Use when starting non-trivial KRN Harness repository setup, architecture work, TypeScript implementation, refactors, multi-step fixes, research-to-implementation work, or any task where Codex should move from intent to verified delivery instead of answering casually.
---

# Buduj

## Invocation

Use explicitly as `$buduj` for non-trivial KRN Harness build work.

Expected output: a scoped implementation bead with files/areas, acceptance,
proof, and residual risk before any final handoff.

Use this as the default operating loop for substantial KRN Harness work.

## Scope

Job: turn a clear KRN Harness task into a verified delivery slice.

Use when:
- the work is non-trivial, multi-step, architectural, or implementation-facing;
- Codex should move from intent to changed files plus validation evidence.

Do not use when:
- the user asks for read-only review, planning, or a direct answer only;
- the task is a narrow docs/test/code slice that already fits `$wycinek`;
- the task is mainly canon/spec/ADR distillation, which belongs to `$kanon`.

Stop when the request lacks success criteria, requires unaccepted architecture,
or would broaden P0/P1 scope without an explicit goal.

## Workflow API

Inputs:
- current git state and active goal/task;
- relevant docs, specs, ADRs, package scripts, and current runtime artifacts;
- operator constraints, proof expectations, and forbidden scope.

Output:
- one or more small implementation beads with owned files, acceptance, proof,
  and residual risk;
- a clear handoff to `$wycinek`, `$kanon`, `$pilnuj`, `$review`, or `$handoff`
  when the work needs a narrower owner.

Escalation:
- use `$pilnuj` when architecture scope or P0/P1/P2/P3 classification is
  uncertain;
- use `$kanon` when raw research, audits, or external docs must become active
  project truth;
- use `$wycinek` for the actual focused implementation bead;
- use `$review` when completed work needs an evidence judgment;
- use `$handoff` before final closeout or context transfer.

Proof:
- do not claim delivery until the bead-specific validation commands and artifact
  checks have run or a blocker is explicit.

Condensation:
- reference existing goal/spec/ADR paths instead of restating them;
- if new docs are needed, update the canonical owner and avoid parallel roadmap
  prose.

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
