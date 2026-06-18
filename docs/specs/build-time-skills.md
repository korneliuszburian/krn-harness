# Build-Time Skills

## Required Skills

- `buduj`: top-level KRN build workflow.
- `kanon`: research to canon/spec/ADR.
- `pilnuj`: P0 scope and architecture guardian.
- `wycinek`: small verified implementation slice.
- `review`: evidence audit after KRN work.
- `handoff`: review-ready summary.

## Invocation

Each required build-time skill documents an explicit invocation section in its
`SKILL.md`:

- `$buduj`
- `$kanon`
- `$pilnuj`
- `$wycinek`
- `$review`
- `$handoff`

The repo-local skill index is `.agents/skills/README.md`. It lists when to use
each skill and the expected output shape. Explicit invocation is the preferred
operator path when the workflow matters; implicit invocation remains available
through each skill's description.

## Quality Contract

Build-time skills are KRN workflow APIs. They are not prompt-pack surface area
and they are not downstream runtime skills.

Every active build-time skill must keep these fields explicit enough for a new
Codex session to use without chat history:

- trigger and non-trigger scope;
- input artifacts or decisions to inspect;
- concrete output shape;
- escalation path to another KRN skill when the work is outside its job;
- proof or evidence needed before claims;
- condensation rule to avoid duplicating active truth.

The current quality bar is sourced from:

- official Codex skills guidance: focused one-job skills, front-loaded
  descriptions for implicit matching, imperative steps with explicit inputs and
  outputs, and instruction-only skills unless deterministic scripts are needed;
- Matt Pocock's public skills pattern, condensed only as external inspiration:
  small composable workflows, repo-specific configuration outside reusable skill
  bodies, and handoffs that point to existing artifacts rather than duplicating
  them.

Do not copy external skill bodies wholesale. Do not add a global skill router,
new build-time skills, runtime/downstream skill templates, or XML/tagged
contracts without a specific accepted KRN need.

## Creation Method

These skills were initialized with the built-in `$skill-creator` helper script and then edited as instruction-only repo skills.

## krn-search Inspiration

The local `krn-search` `coding-system` skill was reviewed as workflow inspiration. KRN Harness adopted the patterns of framing outcomes, reading reality first, slicing work, declaring ownership, verifying before claims, and clean handoff. It did not copy the krn-search skill wholesale.

## Layer Boundary

Build-time skills live in `.agents/skills/*`. Runtime/downstream skills live in `packages/codex-adapter/src/templates/skills/*`.

The invocation docs are build-time onboarding only. They do not create new CLI
commands, runtime skills, plugin distribution, MCP tools, or hook trust claims.
