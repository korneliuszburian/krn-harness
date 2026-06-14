# Operator Summary Schema

## Purpose

`krn-operator-summary-v1` is the stable local artifact for executable P1 operator intelligence.

It summarizes current KRN artifacts so a human operator can see what is true, risky, missing, blocked, skipped, readiness-only, execution-evidence, or unproven.

It is not production proof.

## Command

`krn summary` prints Markdown by default.

`krn summary --json` prints the JSON object.

`krn summary --write` writes:

- `.krn/current/operator-summary.json`
- `.krn/current/operator-summary.md`

The command writes `summary.ran` and does not run verify commands, call Codex, call network, inspect `.env` contents, or inspect protected file contents.

## Top-Level Fields

- `schema`: `krn-operator-summary-v1`.
- `generatedAt`: ISO timestamp.
- `repoPath`: current repository path.
- `status`: aggregate status.
- `currentTask`: current task contract status.
- `identity`: CLI identity status.
- `context`: context package status.
- `graph`: graph artifact status.
- `verify`: verify status and mode.
- `handoff`: handoff artifact status.
- `hooks`: hook evidence status.
- `realRepoDogfood`: real-repo dogfood status.
- `reviewers`: deterministic reviewer aggregate status.
- `memory`: governed memory counts.
- `risks`: durable risk strings.
- `blockers`: blocker strings.
- `warnings`: warning strings.
- `nextActions`: concrete next actions.
- `artifacts`: local artifact path table.

## Status Enum

- `pass`: local evidence supports the signal.
- `warn`: local evidence exists but is incomplete or lower confidence.
- `fail`: local evidence contradicts the requirement.
- `blocked`: the next step cannot proceed until a blocker is resolved.
- `missing`: expected artifact is absent.
- `skipped`: a run explicitly skipped.
- `readiness`: preflight/readiness exists but execution is not proven.
- `unproven`: no evidence proves the surface yet.
- `execution-evidence`: local real-repo execution evidence exists, with production proof still false.

Skipped, readiness, missing, and unproven are never pass states.

## Confidence Enum

- `high`
- `medium`
- `low`
- `unknown`

## Signal Objects

Every major surface has:

- `status`
- `confidence`
- `summary`
- `artifacts`

Surfaces may add typed fields. Examples:

- `currentTask.id`
- `verify.mode`
- `verify.executedCommands`
- `hooks.hookReceivedCount`
- `realRepoDogfood.latestPath`
- `realRepoDogfood.executionKind`
- `realRepoDogfood.validationStatus`
- `realRepoDogfood.productionProof`
- `reviewers.total`
- `memory.pending`

## Verify Semantics

Record-only verify is not execution proof.

Executed verify is represented by `verify.mode: "execute"` and `verify.executedCommands > 0`.

Missing verify is `missing`.

Blocked verify is `blocked`.

## Hook Semantics

If no `hook.received` event exists in `.krn/traces/trace.jsonl`, hooks are `unproven`.

Manual `krn hook codex <event>` traces are also `unproven` unless the trace payload includes a future trusted non-manual hook-load marker such as `payloadSource: "codex-trusted-hook"` or `trustedHookLoad: true`.

Hook status must not be treated as validated until a real non-bypass Codex hook trace exists.

## Real-Repo Semantics

No real-repo dogfood summary is `unproven`.

`skipped` is not pass.

`readiness` is not pass; it means preflight/readiness exists but paid/manual execution is not proven.

`blocked` must include an actionable next step.

`execution-evidence` means a `krn-real-repo-execution-result-v1` artifact exists and target validation passed. It is local evidence only. `productionProof` must remain `false`.

Unsafe execution evidence is `fail` when forbidden files were touched, the target repo was committed, the target repo was pushed, or production proof is overclaimed.

## Example JSON

```json
{
  "schema": "krn-operator-summary-v1",
  "generatedAt": "2026-06-14T00:00:00.000Z",
  "repoPath": "/repo",
  "status": "warn",
  "currentTask": {
    "status": "pass",
    "confidence": "high",
    "summary": "Current task is present.",
    "artifacts": [
      ".krn/current/task-contract.json"
    ],
    "id": "task-example"
  },
  "identity": {
    "status": "pass",
    "confidence": "high",
    "summary": "CLI identity is available and required commands are present.",
    "artifacts": []
  },
  "context": {
    "status": "pass",
    "confidence": "high",
    "summary": "Context package is present.",
    "artifacts": [
      ".krn/current/context-package.json"
    ]
  },
  "verify": {
    "status": "pass",
    "confidence": "high",
    "summary": "Verify is pass in execute mode.",
    "artifacts": [
      ".krn/current/verify-result.json"
    ],
    "mode": "execute",
    "executedCommands": 1
  },
  "hooks": {
    "status": "unproven",
    "confidence": "high",
    "summary": "No hook.received event exists; real Codex hook loading/trust remains unproven.",
    "artifacts": [],
    "hookReceivedCount": 0
  },
  "realRepoDogfood": {
    "status": "unproven",
    "confidence": "high",
    "summary": "No real-repo dogfood summary exists.",
    "artifacts": []
  },
  "reviewers": {
    "status": "warn",
    "confidence": "high",
    "summary": "Review summary is present with 7 reviewer record(s).",
    "artifacts": [
      ".krn/current/review-summary.json"
    ],
    "total": 7
  },
  "memory": {
    "status": "pass",
    "confidence": "medium",
    "summary": "No pending memory records require action.",
    "artifacts": [],
    "pending": 0,
    "approved": 0,
    "deprecated": 0
  },
  "risks": [
    "Hooks are not validated until real hook.received events appear without bypass."
  ],
  "blockers": [],
  "warnings": [
    "hooks: No hook.received event exists; real Codex hook loading/trust remains unproven."
  ],
  "nextActions": [
    "Run a non-bypass Codex hook trust probe before claiming hook validation."
  ],
  "artifacts": [
    {
      "label": "verify result",
      "status": "present",
      "path": ".krn/current/verify-result.json"
    }
  ]
}
```

## Example Markdown

```md
# KRN Operator Summary

Status: warn

## Signals

### verify

Status: pass
Summary: Verify is pass in execute mode.

## Warnings

- hooks: No hook.received event exists; real Codex hook loading/trust remains unproven.
```

## Limits

- Local evidence only.
- Self-report is never sufficient.
- No dashboard, MCP server, vector DB, or autonomous reviewer framework is implied by this schema.
