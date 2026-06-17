# KRN Build-Time Skills

These are repo-scoped build-time skills for building KRN Harness itself. Invoke
them explicitly with `$skill-name` when the workflow matters, or let Codex select
one implicitly from the skill description.

Build-time skills live here in `.agents/skills/*`. Runtime/downstream skill
templates live in `packages/codex-adapter/src/templates/skills/*`; do not mix the
two layers.

| Skill | Invoke | Use When | Expected Output |
| --- | --- | --- | --- |
| `buduj` | `$buduj` | Non-trivial KRN build work, architecture-to-implementation work, or multi-step fixes. | Scoped implementation bead with files/areas, acceptance, proof, and residual risk. |
| `kanon` | `$kanon` | Updating specs, ADRs, security docs, research-backed architecture, or active project truth. | Concise active-truth docs with sources, tradeoffs, uncertainty, and ADR follow-up status. |
| `pilnuj` | `$pilnuj` | Scope-sensitive work touching package boundaries, runtime model, hooks, context, graph, memory, evals, MCP, dashboard, or multi-agent behavior. | P0/P1/P2/P3/rejected classification plus boundaries and narrow accepted slice. |
| `wycinek` | `$wycinek` | One small measurable implementation or docs slice after scope is clear. | Owned files, acceptance criteria, proof commands, and stop conditions. |
| `review` | `$review` | Evidence audit after KRN work, before completion, handoff, commit, push, or external review. | `VERIFIED`, `NEEDS_CHANGES`, or `BLOCKED` with exact evidence paths. |
| `handoff` | `$handoff` | Final response prep after non-trivial work, context compaction, or session handoff. | Review-ready summary with changed files, validation, gaps, P0 status, and next `/goal`. |

## Boundaries

- Do not create new build-time skills by hand. Use `$skill-creator` first.
- Keep build-time skills instruction-only unless a future ADR accepts scripts or
  references.
- Do not use build-time skills as downstream runtime skills.
- Do not turn this repo into a large skill pack.
