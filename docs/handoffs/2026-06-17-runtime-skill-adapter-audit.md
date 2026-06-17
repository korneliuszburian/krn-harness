# Runtime Skill Adapter Product Audit

## Scope

This audit covers the product-facing downstream layer: `AGENTS.md.tmpl`,
`skills/krn-harness/`, and `install-lifecycle`. It does not evaluate
build-time skills such as `$buduj`, `$kanon`, or `$review`.

## Findings

1. `RUNTIME-SKILL-GAP-001`: The installed runtime skill was a single
   `.agents/skills/krn-harness/SKILL.md` file. That made references/scripts
   impossible to ship as part of the product surface.
2. `RUNTIME-SKILL-GAP-002`: The existing runtime skill workflow was correct but
   too compressed for STOP handling, verification ambiguity, review checklist,
   and handoff quality.
3. `RUNTIME-SKILL-GAP-003`: Runtime scripts are not justified yet. A script
   would need a deterministic KRN/CI invocation path; otherwise it is only
   another prompt-surface risk.
4. `RUNTIME-SKILL-GAP-004`: Runtime `.krn/` collisions are mitigated by
   configurable `runtime.dir`, but install still defaults to `.krn`; target
   owners must configure a different runtime dir when `.krn/` is product-owned.

## Decision

Keep one downstream runtime skill, but install it as a small managed folder:

- `.agents/skills/krn-harness/SKILL.md`
- `.agents/skills/krn-harness/agents/openai.yaml`
- `.agents/skills/krn-harness/references/workflow.md`

The reference contains decision rules, output contract, and review checklist.
No runtime scripts are added in this slice.

## Proof Target

The proof is deterministic install behavior: `krn install` creates the runtime
skill folder, preserves existing target files, uninstall removes only managed
files, and downstream acceptance still passes without architecture bloat or
hook-trust claims.
