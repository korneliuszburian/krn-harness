# Run Result Schema

`krn-run-result-v1` is the condensed local operator workflow result written by
`krn run`.

It is local evidence only. It is not production proof, hook trust proof, Codex
execution, CI evidence, or package publication evidence.

## Command

```bash
krn run --task <text> [--dry-run] [--json] [--execute-verify] [--bundle]
krn run --task-spec <json> [--dry-run] [--json] [--execute-verify] [--bundle]
```

`--dry-run` keeps verify in record-only mode even if `--execute-verify` is also
present.

`--execute-verify` runs only the configured allowlisted verify profile through
the existing verify execution policy.

`--bundle` writes `.krn/current/run-bundle/` and runs `release-check` as an
internal gate so the run bundle can include release-check artifacts. It does not
expand `release-check --bundle`.

## Artifacts

- `.krn/current/run-result.json`
- `.krn/current/run-result.md`

When `--bundle` is present:

- `.krn/current/run-bundle/manifest.json`
- `.krn/current/run-bundle/run-result.json`
- `.krn/current/run-bundle/run-result.md`
- `.krn/current/run-bundle/operator-report.md`
- `.krn/current/run-bundle/operator-report.json`
- `.krn/current/run-bundle/operator-report.html`
- `.krn/current/run-bundle/release-check.json`
- `.krn/current/run-bundle/release-check.md`

Raw traces, protected-looking paths, external assets, and files outside
`.krn/current` are not copied into the run bundle.

## JSON Shape

```json
{
  "schema": "krn-run-result-v1",
  "status": "verified",
  "coreStatus": "verified",
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "dryRun": false,
  "executeVerify": true,
  "taskText": "Smoke local run",
  "taskSpecPath": "fixtures/tasks/smoke.json",
  "steps": {
    "start": { "status": "ran", "summary": "KRN start: task accepted" },
    "graph": { "status": "ran", "summary": "KRN graph: ready" },
    "context": { "status": "ran", "summary": "KRN context: package written" },
    "verify": { "status": "verified", "summary": "KRN verify: pass (execute)" },
    "handoff": { "status": "ran", "summary": "KRN handoff: ready" },
    "review": { "status": "ran", "summary": "KRN review: warn" },
    "summary": { "status": "ran", "summary": "KRN summary: warn" },
    "report": { "status": "ran", "summary": "KRN report: warn" },
    "releaseCheck": { "status": "ran", "summary": "KRN release-check: pass" }
  },
  "context": {
    "stop": false,
    "totalItems": 12,
    "activeItems": 10,
    "referenceOnlyItems": 2,
    "overInclusionRisk": "low"
  },
  "verify": {
    "mode": "execute",
    "status": "pass",
    "executedCommands": 1,
    "totalCommands": 1,
    "profileName": "local"
  },
  "proof": {
    "productionProof": false,
    "hookTrustStatus": "unproven",
    "fixture": "verified-local",
    "config": "not-indicated",
    "productCode": "verified-local",
    "notes": [
      "Local proof scope is inferred from task-spec metadata and core verify status.",
      "It is not production proof, hook trust proof, target-main approval, or CI evidence."
    ]
  },
  "supportingProjection": {
    "reportVerdict": "warn",
    "reportStepStatus": "ran",
    "releaseCheckStatus": "fail",
    "releaseCheckStepStatus": "ran",
    "releaseCheckBlocking": false,
    "nonBlockingReleaseCheckFailure": true
  },
  "blockers": [],
  "warnings": ["Hook trust remains unproven."],
  "nextActions": ["Review run-result and operator-report artifacts."],
  "artifacts": {
    "runResultJson": ".krn/current/run-result.json",
    "runResultMarkdown": ".krn/current/run-result.md"
  }
}
```

## Status Rules

- `status`: aggregate local run status after core run steps and supporting
  projection surfaces are considered. This preserves existing operator behavior:
  current report or release-check blockers may make the aggregate status
  `failed` or `blocked`.
- `coreStatus`: core run status from `start`, `graph`, `context`, `verify`, and
  `handoff` plus direct task/verify blockers. Review, summary, report, bundle,
  and release-check projection do not change `coreStatus`.
- `supportingProjection`: local report/release-check projection metadata. These
  fields explain why the aggregate status, blockers, or warnings may differ
  from `coreStatus`.
- `planned`: dry run completed without blockers.
- `blocked`: context STOP or verify/profile blockers prevent a usable run.
- `ran`: workflow artifacts were generated, but verify was record-only or not
  execution proof.
- `verified`: `--execute-verify` ran an allowlisted profile and verify passed.
- `failed`: a command step or release gate failed.

Context STOP blocks verify, handoff, review, summary, report, and release-check.

## Proof Scope

`proof.productionProof` remains literal `false`. `proof.hookTrustStatus` is copied
from local report evidence and must not be promoted by `run-result`.

`proof.fixture`, `proof.config`, and `proof.productCode` are local proof-scope
signals:

- `not-indicated`: the task spec metadata did not indicate that proof scope.
- `claimed-unverified`: the task spec metadata indicated that scope, but
  `coreStatus` is not `verified`.
- `verified-local`: the task spec metadata indicated that scope and
  `coreStatus` is `verified`.

The signals are inferred from `taskSpecPath` and `expectedTouchedFiles`; they do
not inspect diffs and do not prove target-main approval, CI, production behavior,
hook enforcement, or full-suite coverage. Product-code proof remains separate
from config adoption proof, fixture proof, production proof, and hook trust.

For downstream target runs, a KRN source `release-check` failure can be recorded
as non-blocking supporting projection when the target checkout does not contain
the KRN source release-check inputs. In that case `coreStatus` and `status` may
remain `verified`, while `supportingProjection.releaseCheckStatus` records the
failed source release-check and `nonBlockingReleaseCheckFailure: true`.

`report`, `release-check`, and `run-bundle` are local supporting evidence. They
must not be described as production release readiness, target-main approval,
hook trust proof, or production proof.

Historical `.krn` caveats may become warnings through the operator report. They
must not become current run blockers unless the current local artifacts identify
them as blockers.
