# Build-Time Skills

## Required Skills

- `buduj`: top-level KRN build workflow.
- `kanon`: research to canon/spec/ADR.
- `pilnuj`: P0 scope and architecture guardian.
- `wycinek`: small verified implementation slice.
- `handoff`: review-ready summary.

## Invocation

Each required build-time skill documents an explicit invocation section in its
`SKILL.md`:

- `$buduj`
- `$kanon`
- `$pilnuj`
- `$wycinek`
- `$handoff`

The repo-local skill index is `.agents/skills/README.md`. It lists when to use
each skill and the expected output shape. Explicit invocation is the preferred
operator path when the workflow matters; implicit invocation remains available
through each skill's description.

## Creation Method

These skills were initialized with the built-in `$skill-creator` helper script and then edited as instruction-only repo skills.

## krn-search Inspiration

The local `krn-search` `coding-system` skill was reviewed as workflow inspiration. KRN Harness adopted the patterns of framing outcomes, reading reality first, slicing work, declaring ownership, verifying before claims, and clean handoff. It did not copy the krn-search skill wholesale.

## Layer Boundary

Build-time skills live in `.agents/skills/*`. Runtime/downstream skills live in `packages/codex-adapter/src/templates/skills/*`.

The invocation docs are build-time onboarding only. They do not create new CLI
commands, runtime skills, plugin distribution, MCP tools, or hook trust claims.
