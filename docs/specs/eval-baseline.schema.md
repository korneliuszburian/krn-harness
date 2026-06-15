# Eval Baseline Schema

## Purpose

`krn-eval-baseline-v1` records a rolling local comparison for `krn eval`.

It is local harness-only evidence. It is not production proof, hook trust proof,
Codex execution proof, or a hosted benchmark.

## Artifacts

`krn eval` writes:

- `.krn/evals/baseline.json`: rolling last-run baseline;
- `.krn/current/eval-baseline.json`: current-run copy for operator review.

These files are runtime artifacts and should not be committed as source.

## JSON Shape

```json
{
  "schema": "krn-eval-baseline-v1",
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "baselinePath": ".krn/evals/baseline.json",
  "currentResultPath": ".krn/current/eval-result.json",
  "current": {
    "status": "pass",
    "passCount": 25,
    "failCount": 0,
    "fixtureCount": 6,
    "gradeCount": 25,
    "grades": [
      {
        "key": "graph:graph-behavior",
        "status": "pass",
        "detail": "graph behavior matched fixture expectations"
      }
    ]
  },
  "previous": {
    "generatedAt": "2026-06-14T00:00:00.000Z",
    "status": "pass",
    "passCount": 25,
    "failCount": 0,
    "gradeCount": 25
  },
  "comparison": {
    "status": "unchanged",
    "regressions": [],
    "improvements": [],
    "newGrades": [],
    "removedGrades": []
  },
  "limits": {
    "productionProof": false,
    "codexExecutionProof": false,
    "hookTrustProof": false,
    "baselineMode": "rolling-local-last-run"
  }
}
```

## Comparison Status

- `created`: no previous baseline existed.
- `unchanged`: all comparable grade statuses stayed the same and no grade keys
  were added or removed.
- `changed`: grade keys were added or removed without pass-to-fail or
  fail-to-pass status changes.
- `improved`: at least one grade moved from `fail` to `pass` and no grade moved
  from `pass` to `fail`.
- `regressed`: at least one grade moved from `pass` to `fail`.

`regressions`, `improvements`, `newGrades`, and `removedGrades` contain stable
grade keys, not raw Markdown.

## Limits

The baseline is rolling-last-run evidence. It is not an approved golden baseline
and does not make claims about model quality, Codex execution, production
readiness, or hook trust.

No `krn eval --compare-baseline` flag exists in this slice. Future flag work
must define operator-facing output and exit-code semantics before implementation.
