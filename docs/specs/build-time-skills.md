# Build-Time Skills

## Required Skills

- `buduj`: top-level KRN build workflow.
- `kanon`: research to canon/spec/ADR.
- `pilnuj`: P0 scope and architecture guardian.
- `wycinek`: small verified implementation slice.
- `handoff`: review-ready summary.

## Creation Method

These skills were initialized with the built-in `$skill-creator` helper script and then edited as instruction-only repo skills.

## krn-search Inspiration

The local `krn-search` `coding-system` skill was reviewed as workflow inspiration. KRN Harness adopted the patterns of framing outcomes, reading reality first, slicing work, declaring ownership, verifying before claims, and clean handoff. It did not copy the krn-search skill wholesale.

## Layer Boundary

Build-time skills live in `.agents/skills/*`. Runtime/downstream skills live in `packages/codex-adapter/src/templates/skills/*`.
