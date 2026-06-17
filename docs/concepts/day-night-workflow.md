# Day/Night Workflow

KRN separates human planning from Codex execution evidence. The P0 planner is human, not automated: the operator chooses the goal, scope, target repo, protected paths, and acceptable proof level before Codex starts implementation.

## Day Shift

1. Operator writes or updates the task goal and protected boundaries.
2. Operator asks Codex to inspect repo truth, not chat memory.
3. Codex runs `krn start` or `krn run --dry-run` to create the task contract and current plan artifacts.
4. Operator reviews `.krn/current/task-contract.json`, `.krn/current/context-package.json`, and any STOP or scope warnings before allowing edits.

## Night Shift

1. Codex implements the narrow accepted slice.
2. Codex uses `krn graph` and `krn context` when context or graph evidence must be refreshed.
3. Codex runs `krn verify` for record-only evidence, or `krn verify --execute` / `krn run --execute-verify` only when the configured commands are allowed and safe.
4. Codex runs `krn review --write`, `krn handoff`, `krn summary --write`, and `krn report --write` when the session needs reviewable closeout artifacts.

## Artifact Map

`krn start` writes `task-spec` evidence under `<runtime-dir>/current/task-contract.*`. `krn run` writes the task loop result, run-scoped trace, and optional bundle. `krn verify` writes verify evidence. `krn review --write` writes task-alignment and boundary checks. `krn handoff` writes continuation notes. The next session reads those artifacts before trusting prior chat summaries.

## Honest Limit

KRN can make Codex work more inspectable, but it does not automate product judgment. If the task is vague, unsafe, or under-specified, the correct P0 behavior is to stop, narrow the slice, or ask the operator.
