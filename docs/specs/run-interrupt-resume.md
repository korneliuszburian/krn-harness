# Run Interrupt/Resume

## Purpose

Run interrupt/resume is a future local KRN continuation contract for `krn run`.
It is not implemented by the current CLI.

The contract exists to keep a blocked or operator-gated run inspectable without
pretending that KRN owns Codex session state, hook trust, or production approval.

## Current Status

- Contract accepted by ADR-0020.
- Implementation deferred.
- No top-level `krn resume` command is currently approved.
- No `krn run --resume` option is currently implemented.
- No hook decision is currently trusted as a resume gate.

## Artifact

Future implementations may write:

- `.krn/current/interrupt.json`
- `.krn/runs/<task_id>/interrupt.json`

The schema name should be:

`krn-run-interrupt-v1`

Minimal shape:

```json
{
  "schema": "krn-run-interrupt-v1",
  "status": "awaiting-operator",
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "taskId": "example-task",
  "taskSpecPath": "tasks/example.json",
  "reason": {
    "kind": "verify-blocked",
    "summary": "verify profile is not runnable"
  },
  "resume": {
    "approvedCliSurface": false,
    "preferredFutureCommand": "krn run --resume .krn/current/interrupt.json"
  },
  "boundaries": {
    "productionProof": false,
    "hookTrustStatus": "unproven",
    "pushAllowed": false
  },
  "artifacts": {
    "runResultJson": ".krn/current/run-result.json",
    "operatorReportJson": ".krn/current/operator-report.json"
  }
}
```

## Interrupt Reasons

The first implementation may consider only local KRN reasons:

- context STOP;
- verify blocked or not runnable;
- explicit operator gate from a validated task spec;
- release-check blocker for source-checkout runs.

The first implementation must not use hook `warn` or `block` as an approval or
resume gate until non-bypass hook trust is proven. Manual hook probes remain
diagnostic-only evidence.

## Resume Rules

Resume must re-validate the task spec and interrupt artifact before continuing.

Resume must not bypass:

- task-spec runtime validation;
- context STOP state;
- verify execute policy;
- forbidden or protected paths;
- no-push boundaries;
- no-production-proof boundaries;
- report, summary, and run-bundle generation.

Resume output must write a fresh `run-result` and, when requested, a fresh
run-bundle. It must state whether the run resumed from an interrupt, started
fresh because the interrupt was stale, or refused to resume.

## Data Limits

Interrupt artifacts must not contain raw hook payloads, raw Codex transcripts,
full stdout/stderr, secret-looking values, or protected data.

Store compact reason codes, local artifact paths, task id, task spec path, and
the minimum operator decision needed to continue.

## Non-Goals

- No top-level `krn resume` command in the ADR/spec slice.
- No Codex execution wrapper.
- No Codex session resume wrapper.
- No hook-trust claim.
- No production approval claim.
- No push automation.
- No dashboard, MCP, vector DB, subagents, or publishing work.
