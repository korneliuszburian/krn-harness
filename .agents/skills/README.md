# KRN Build-Time Skills

These are repo-scoped build-time skills for building KRN Harness itself. Invoke
them explicitly with `$skill-name` when the workflow matters, or let Codex select
one implicitly from the skill description.

Build-time skills live here in `.agents/skills/*`. Runtime/downstream skill
templates live in `packages/codex-adapter/src/templates/skills/*`; do not mix the
two layers.

| Skill | Invoke | One Job | Use When | Do Not Use When | Expected Output | Stop Condition |
| --- | --- | --- | --- | --- | --- | --- |
| `buduj` | `$buduj` | Top-level delivery loop. | Non-trivial KRN build work, architecture-to-implementation work, or multi-step fixes. | Read-only review, pure canon/spec work, or a small settled slice. | Scoped implementation bead with files/areas, acceptance, proof, and residual risk. | Scope is unclear, success criteria are missing, or unaccepted architecture is required. |
| `kanon` | `$kanon` | Evidence to active truth. | Updating specs, ADRs, security docs, research-backed architecture, or active project truth. | Pure implementation, raw research collection, or unfiltered note dumping. | Concise active-truth docs with sources, tradeoffs, uncertainty, and ADR follow-up status. | Evidence is missing, ADR ownership is missing, or the truth would exceed P0/P1 scope. |
| `pilnuj` | `$pilnuj` | Scope classification and boundary control. | Scope-sensitive work touching package boundaries, runtime model, hooks, context, graph, memory, evals, MCP, dashboard, or multi-agent behavior. | Settled small edits, final evidence review, or architecture invention. | P0/P1/P2/P3/rejected classification plus boundaries and narrow accepted slice. | The slice requires forbidden scope or cannot be narrowed without approval. |
| `wycinek` | `$wycinek` | One small measurable slice. | Focused TypeScript, CLI, schema, trace, graph, context, doctor, verify, eval, docs, or test edits after scope is clear. | Broad coordination, unresolved architecture, or final evidence audit. | Owned files, acceptance criteria, proof commands, and stop conditions. | The slice expands beyond owned files or lacks focused local proof. |
| `review` | `$review` | Evidence judgment after work. | Evidence audit after KRN work, before completion, handoff, commit, push, or external review. | Implementation, human PR review replacement, model-based review, or workflow rerun. | `VERIFIED`, `NEEDS_CHANGES`, or `BLOCKED` with exact evidence paths. | Required evidence or approval is missing, or the only honest status is not `VERIFIED`. |
| `handoff` | `$handoff` | Review-ready closeout. | Final response prep after non-trivial work, context compaction, or session handoff. | In-progress implementation, pass/fail evidence audit, or a simple direct answer. | Review-ready summary with changed files, validation, gaps, P0 status, and next `/goal`. | Validation or changed-file evidence is missing, or local evidence would be overclaimed. |

## Boundaries

- Do not create new build-time skills by hand. Use `$skill-creator` first.
- Keep build-time skills instruction-only unless a future ADR accepts scripts or
  references.
- Do not use build-time skills as downstream runtime skills.
- Do not turn this repo into a large skill pack.
- `grill-with-docs` was removed from active build-time skill discovery because
  it duplicated `$kanon + $pilnuj + $review` and carried generic
  domain-model references outside KRN's source truth.
