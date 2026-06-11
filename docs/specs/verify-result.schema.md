# Verify Result Schema

## Purpose

`krn verify` records deterministic P0 verification state without running arbitrary project commands.

## Current Artifacts

- `.krn/current/verify-result.json`
- `.krn/current/verify-result.md`

## Fields

- `profile`: verify profile name.
- `status`: `ready`, `blocked`, or `not-runnable`.
- `taskId`: current task id when available.
- `contextStop`: whether the current context package reports STOP.
- `graphArtifactPresent`: whether `.krn/graph/repo-graph.json` was present when verify ran.
- `currentRunTracePresent`: whether the current run trace was present when verify ran.
- `configuredCommands`: validation commands from `krn.config.json`.
- `executedCommands`: commands actually run by KRN; empty in P0.
- `notRunnableReason`: reason when verification is blocked or not runnable.
- `checks`: deterministic P0 checks and details.

## P0 Rule

P0 records configured commands but does not execute them.
