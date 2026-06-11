# Verify Result Schema

## Purpose

`krn verify` records deterministic P0 verification state without running arbitrary project commands.

## Current Artifacts

- `.krn/current/verify-result.json`
- `.krn/current/verify-result.md`

## Fields

- `schemaVersion`: currently `1`.
- `generatedAt`: ISO timestamp.
- `profileName`: verify profile name.
- `profile`: legacy alias for `profileName`.
- `mode`: `record-only` or `execute`.
- `status`: `pass`, `warn`, `fail`, `blocked`, or `not-runnable`.
- `summary`: total, allowed, blocked, and executed command counts.
- `configSource`: `file` or `default`.
- `limits`: command timeout and output byte budget.
- `taskId`: current task id when available.
- `contextStop`: whether the current context package reports STOP.
- `graphArtifactPresent`: whether `.krn/graph/repo-graph.json` was present when verify ran.
- `currentRunTracePresent`: whether the current run trace was present when verify ran.
- `commands`: command policy results with command text, allow/block status, and reason when blocked.
- `configuredCommands`: validation commands from `krn.config.json`.
- `executedCommands`: commands actually run by KRN in `execute` mode.
- `notRunnableReason`: reason when verification is blocked or not runnable.
- `checks`: deterministic P0 checks and details.

## P0 Rule

P0 resolves verify profiles and blocks unsafe commands before execution. Record-only mode is the default and does not execute commands. Execute mode runs only allowlisted command/args through `child_process.spawn` with `shell: false`, a timeout, and compact stdout/stderr tails.

Before execute mode runs, the whole profile is policy-checked. If any command is blocked, no command in the profile is executed.

Allowed P0 command forms are intentionally narrow:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `npm test`
- `npm run test`
- `node <relative-file>`

Shell syntax, redirects, pipes, destructive git commands, `rm`, `scp`, `curl`, `wget`, and unknown commands are blocked.

Verify artifacts never store environment variables or full command output.
