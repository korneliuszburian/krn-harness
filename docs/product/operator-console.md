# Operator Console Model

## Status

P1 executable summary artifact plus data model. No UI, static HTML, frontend framework, server, database, or hosted service is implemented.

## Purpose

The operator console model is currently exposed through `krn summary`. It summarizes existing local KRN artifacts so an operator can quickly decide what is safe to do next.

It must aggregate evidence already written by the CLI. It must not become a second source of truth.

## Sections

- Runs
- Memory
- Context
- Verify
- Handoff
- Graph
- Dogfood
- Repos
- Decisions
- Gaps
- Settings

## Summary Card Shape

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-06-13T00:00:00.000Z",
  "repo": "downstream-repo",
  "taskId": "task-example",
  "contextStop": false,
  "verifyStatus": "pass",
  "handoffStatus": "present",
  "graphStatus": "present",
  "dogfoodStatus": "skipped",
  "pendingMemoryCount": 0,
  "nextActions": [
    "Review current handoff",
    "Run dogfood comparison when paid Codex calls are approved"
  ],
  "gaps": [
    "Hooks are not validated until real hook.received appears from Codex"
  ]
}
```

## Inputs

`krn summary` may read only local artifacts:

- `.krn/current/run.json`
- `.krn/current/task-contract.json`
- `.krn/current/context-package.json`
- `.krn/current/verify-result.json`
- `.krn/current/handoff.md`
- `.krn/current/doctor-result.json`
- `.krn/current/eval-result.json`
- `.krn/current/review-summary.json`
- `.krn/graph/repo-graph.json`
- `.krn/memory/pending.json`
- `.krn/memory/approved.json`
- `.krn/memory/deprecated.json`
- `.krn/dogfood/*/run-record.json`
- `.krn/dogfood/*/grade.json`
- `.krn/dogfood/**/summary.json`

Missing artifacts are allowed. The summary should report missing status instead of failing.

## CLI

`krn summary` prints Markdown by default.

`krn summary --json` prints the `krn-operator-summary-v1` object.

`krn summary --write` writes:

- `.krn/current/operator-summary.json`
- `.krn/current/operator-summary.md`

It writes a `summary.ran` trace event. It does not run verify commands, call Codex, call network, or inspect protected file contents.

## Limits

- Do not duplicate full trace content.
- Do not infer product readiness from self-report.
- Do not claim hook validation without real `hook.received` from Codex.
- Do not run Codex.
- Do not execute verification commands.
- Do not add a database or server.

## Deferred UI

A future dashboard-lite renderer may consume `operator-summary.json`, but the current product layer is artifact-first.
