# 2026-06-16 Runtime Dir Collision Plan

## Scope

Fix the adoption blocker where a target repository already tracks a
product-owned `.krn/` namespace. Add one optional runtime directory config field
and keep default `.krn` behavior unchanged.

This is not hook trust, production proof, config inheritance, migration, a new
CLI command, a bundle variant, trace query store, resume, MCP, vector search, or
dashboard work.

## Baseline

- Source HEAD and `origin/main`: `99c9adf5014141fa1c77890aac0b0fd6db51043c`.
- Protected scratch remains unstaged: `.gitignore`, `GOAL.md`, `GOAL-8H.md`,
  `ARCHITECTURE-AUDIT.md`, `docs/audit/`, `.agents/skills/grill-with-docs/`.
- Baseline validation passed after adding a central Vitest `testTimeout` because
  full-suite load repeatedly exceeded the default 5s timeout.
- The literal inventory command from the goal includes `tests`, which is not a
  directory in this repo. Usable inventory was run over `packages`, `docs`,
  `scripts`, `fixtures`, and `examples`.

## Runtime Write/Read Hotspots

- Current artifacts: `packages/cli/src/current-state.ts`,
  `packages/cli/src/current-artifacts.ts`.
- Task loop commands: `start`, `graph`, `context`, `verify`, `handoff`,
  `review`, `summary`, `report`, `release-check`, `eval`, `run`.
- Trace/run state: `packages/trace/src/trace-writer.ts`,
  `packages/cli/src/run-trace.ts`.
- Memory: `packages/memory/src/memory-store.ts`, memory CLI and doctor checks.
- Doctor/readers: `packages/doctor/src/*`, `packages/cli/src/commands/doctor.ts`.
- Bundles and artifact scope: `packages/cli/src/run-artifacts.ts`,
  `packages/cli/src/release-check-bundle.ts`,
  `packages/cli/src/artifact-scope.ts`, artifacts command.
- Config and identity: `packages/config/src/schemas.ts`,
  `packages/config/src/load-config.ts`, `packages/cli/src/identity.ts`.

## Defaults That Should Stay `.krn`

- Existing fixtures under `fixtures/**`.
- Dogfood demos, historical handoffs, and benchmark examples.
- Generated downstream hooks template `./.krn/bin/krn`; hook trust is out of
  scope and install layout is not migrated in this slice.
- Docs that describe historical artifacts or default layout examples.

## Source Paths Needing Resolver Support

- New shared resolver should expose root/current/graph/traces/runs/memory and
  bundle dirs.
- CLI commands should resolve artifact writes through that layout.
- Readers should use the same layout so report/release-check do not drift to
  `.krn` after a custom-runtime run.
- Path display should use resolved relative paths where the artifact belongs to
  the active runtime.
- Bundle allowlists must use the active runtime root, not hard-coded `.krn`.

## Implementation Plan

1. Add ADR-0024 accepting configurable `runtime.dir` with default `.krn` and
   safe repo-relative dot-directory validation.
2. Update config schema to accept `.krn-harness`-style values and reject unsafe
   or source/doc directories.
3. Add a small runtime layout resolver in CLI/shared runtime utilities.
4. Add a tracked-runtime guard for write-producing commands before artifacts are
   written.
5. Thread the layout through current artifact helpers, task-loop commands,
   report/release-check, trace, memory, doctor, and bundles.
6. Add tests for default compatibility, custom `.krn-harness`, report and
   release-check reads, unsafe config rejection, tracked `.krn` collision, and
   collision bypass with custom runtimeDir.
7. Update specs and adoption docs.
8. Attempt isolated `krn-ai-os` proof only if a safe target validation command
   is available without reading protected data.

## Stop Conditions

- Stop with `BLOCKED_NEEDS_RUNTIME_LAYOUT_ADR` if resolver threading requires
  config inheritance, multiple runtime roots, install migration, hook template
  migration, or changing downstream hook trust semantics.
- Stop if custom runtime can write but report/release-check still read `.krn`.
- Stop if tracked `.krn/` collision cannot be detected without inspecting
  protected file contents.
