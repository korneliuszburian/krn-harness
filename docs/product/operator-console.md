# Operator Console Model

## Status

P0 data model only. No UI, static HTML, frontend framework, server, database, or hosted service is implemented.

## Purpose

The future operator console should summarize existing local KRN artifacts so an operator can quickly decide what is safe to do next.

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

The summary may read only local artifacts:

- `.krn/current/run.json`
- `.krn/current/task-contract.json`
- `.krn/current/context-package.json`
- `.krn/current/verify-result.json`
- `.krn/current/handoff.md`
- `.krn/current/doctor-result.json`
- `.krn/current/eval-result.json`
- `.krn/graph/repo-graph.json`
- `.krn/memory/pending.json`
- `.krn/dogfood/*/run-record.json`
- `.krn/dogfood/*/grade.json`

Missing artifacts are allowed. The summary should report missing status instead of failing.

## Limits

- Do not duplicate full trace content.
- Do not infer product readiness from self-report.
- Do not claim hook validation without real `hook.received` from Codex.
- Do not run Codex.
- Do not execute verification commands.
- Do not add a database or server.

## Deferred Command

A future `krn summary` or `krn operator` command may render this data model, but P0 keeps it as a product document until the dogfood evidence layer is stable.
