---
name: pilnuj
description: KRN Harness architecture guardian and P0 scope-control workflow. Use before or during work that affects package boundaries, runtime model, hooks, context packages, graph, memory, evals, MCP, dashboard, multi-agent behavior, roadmap, or architecture decisions.
---

# Pilnuj

## Invocation

Use explicitly as `$pilnuj` before or during work that can change KRN scope,
package boundaries, runtime model, hooks, context, graph, memory, evals, MCP,
dashboard, or multi-agent behavior.

Expected output: a P0/P1/P2/P3/rejected classification, hidden complexity,
scope boundaries, and the narrowest accepted slice.

Use this to prevent P0 scope creep, overengineering, and architectural drift.

## Scope

Job: classify scope and enforce the narrowest accepted architecture boundary.

Use when:
- work touches package boundaries, runtime model, hooks, context, graph, memory,
  evals, MCP, dashboard, multi-agent behavior, roadmap, or architecture;
- a proposed slice may hide P1/P2/P3 complexity inside P0 work.

Do not use when:
- the task is already a small implementation detail with settled scope;
- the user asks for final evidence review, which belongs to `$review`;
- the work would require inventing architecture instead of classifying it.

Stop when the slice requires forbidden P0 scope, lacks ADR/spec rationale for an
architecture change, or cannot be narrowed without user approval.

## Workflow API

Inputs:
- proposed task or implementation slice;
- current goal, AGENTS guidance, relevant specs/ADRs, and P0/P1/P2/P3
  boundaries;
- known target findings and proof constraints when the slice comes from
  evidence.

Output:
- a scope classification: P0, P1, P2, P3, or rejected;
- hidden complexity and maintenance-cost notes;
- the narrowest accepted slice or the exact approval needed to continue.

Escalation:
- use `$kanon` when the accepted boundary needs canon/spec/ADR wording;
- use `$wycinek` only after the slice is narrow and implementable;
- use `$review` if the work is already complete and needs evidence judgment
  instead of scope classification.

Proof:
- every accepted architecture-affecting decision must point to official docs,
  research evidence, recorded target findings, existing specs, or ADR rationale.

Condensation:
- prefer narrowing, deleting, or reusing an existing surface over adding a new
  command, package, schema family, dashboard, MCP, vector, or runtime skill.

## Workflow

1. Classify the requested work as P0, P1, P2, P3, or rejected.
2. Identify hidden complexity, maintenance cost, and deferred product layers.
3. Prefer the smallest implementation that preserves future extension.
4. Require ADR rationale for architecture changes.
5. Require official docs, research evidence, established methodology, or ADR rationale for non-trivial decisions.
6. Stop or narrow the slice if it requires unaccepted architecture.

## P0 Allowed

- pnpm TypeScript workspace and CLI/core skeleton.
- `krn.config.json` and `.krn/` runtime model.
- Downstream AGENTS adapter, Codex hooks template, and one runtime skill template.
- Task contract schema, context package schema, graph-lite interfaces.
- Trace JSONL writer/schema.
- Verify, handoff, doctor skeletons.
- Harness-only eval fixtures.
- Build-time skills for building KRN Harness.

## P0 Forbidden

- Dashboard.
- MCP server.
- Multi-agent orchestration.
- Vector database or semantic embeddings.
- Full Tree-sitter, AST, callgraph, or dataflow.
- Production WordPress/ACF detector.
- Browser evidence layer.
- Auto-approved memory.
- GitHub Action.
- Plugin distribution.
- Many runtime skills.
