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
    "hookTrustStatus": "unproven"
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

- `planned`: dry run completed without blockers.
- `blocked`: context STOP or verify/profile blockers prevent a usable run.
- `ran`: workflow artifacts were generated, but verify was record-only or not
  execution proof.
- `verified`: `--execute-verify` ran an allowlisted profile and verify passed.
- `failed`: a command step or release gate failed.

Context STOP blocks verify, handoff, review, summary, report, and release-check.

Historical `.krn` caveats may become warnings through the operator report. They
must not become current run blockers unless the current local artifacts identify
them as blockers.
