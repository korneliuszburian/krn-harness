# Reviewer Result Schema

## Purpose

`krn-reviewer-result-v1` records one deterministic reviewer result.

`krn-review-summary-v1` aggregates reviewer results for `krn summary`.

Reviewers are artifact evaluators. They are not autonomous agents.

## Command

`krn review` prints Markdown by default.

`krn review --json` prints the aggregate JSON object.

`krn review --write` writes:

- `.krn/current/review-summary.json`
- `.krn/current/review-summary.md`

It also writes compatibility aliases:

- `.krn/current/review-result.json`
- `.krn/current/review-result.md`

The command writes `review.ran` and does not run verify commands, call Codex, call models, commit, push, approve memory, or inspect protected file contents.

`krn review --llm` is intentionally unsupported.

## Per-Reviewer Fields

- `schema`: `krn-reviewer-result-v1`.
- `reviewerId`: stable reviewer id.
- `reviewerName`: human-readable reviewer name.
- `reviewer`: compatibility alias for `reviewerId`.
- `status`: reviewer status.
- `severity`: compatibility alias for status.
- `confidence`: reviewer confidence.
- `summary`: one-line finding summary.
- `evidence`: local evidence path list.
- `artifactsRead`: compatibility-explicit artifact path list.
- `findings`: reviewer findings.
- `blockers`: blocker findings.
- `warnings`: warning findings.
- `nextActions`: concrete next actions.

## Aggregate Fields

- `schema`: `krn-review-summary-v1`.
- `generatedAt`: ISO timestamp.
- `status`: aggregate status.
- `reviewers`: reviewer result array.
- `records`: compatibility alias for `reviewers`.
- `blockers`: aggregate blockers.
- `warnings`: aggregate warnings.
- `nextActions`: aggregate next actions.

## Status Enum

- `pass`: evidence supports the check.
- `warn`: evidence is incomplete, unproven, skipped, blocked, readiness-only, preflight-only, execution evidence with caveats, or lower confidence.
- `fail`: evidence contradicts the requirement.
- `blocked`: required evidence cannot be inspected safely or an unsafe state blocks completion.
- `skipped`: reserved for future reviewer records that intentionally skip.

The aggregate status is:

- `blocked` if any reviewer is blocked.
- `fail` if any reviewer fails.
- `warn` if any reviewer warns.
- `pass` only if all reviewers pass.

## Initial Reviewers

- `safety`
- `evidence`
- `context`
- `verify`
- `handoff`
- `dogfood`
- `release`

## Dogfood Reviewer Semantics

The dogfood reviewer reads `.krn/dogfood/**/summary.json`.

- `krn-real-repo-preflight-v1` is preflight-only and warns.
- `krn-real-repo-dogfood-v1` with `readiness-only` warns.
- skipped and blocked dogfood artifacts warn unless they contain unsafe evidence.
- `krn-real-repo-execution-result-v1` can be execution evidence.
- forbidden touched files, target commits, target pushes, or `productionProof: true` fail.
- `hookTrustStatus: "unproven"`, `"manual-diagnostic-only"`, or `"blocked"` warns, but does not fail.

Reviewer output is still local operator guidance, not production proof.

## Example

```json
{
  "schema": "krn-review-summary-v1",
  "generatedAt": "2026-06-14T00:00:00.000Z",
  "status": "warn",
  "reviewers": [
    {
      "schema": "krn-reviewer-result-v1",
      "reviewerId": "dogfood",
      "reviewerName": "Dogfood reviewer",
      "reviewer": "dogfood",
      "status": "warn",
      "severity": "warn",
      "confidence": "medium",
      "summary": "No local dogfood summary artifacts found.",
      "evidence": [],
      "artifactsRead": [],
      "findings": [
        "missing artifact: .krn/dogfood/**/summary.json"
      ],
      "blockers": [],
      "warnings": [
        "missing artifact: .krn/dogfood/**/summary.json"
      ],
      "nextActions": [
        "Run a dogfood benchmark or real-repo readiness scaffold when relevant."
      ]
    }
  ],
  "records": [
    {
      "schema": "krn-reviewer-result-v1",
      "reviewerId": "dogfood",
      "reviewerName": "Dogfood reviewer",
      "reviewer": "dogfood",
      "status": "warn",
      "severity": "warn",
      "confidence": "medium",
      "summary": "No local dogfood summary artifacts found.",
      "evidence": [],
      "artifactsRead": [],
      "findings": [
        "missing artifact: .krn/dogfood/**/summary.json"
      ],
      "blockers": [],
      "warnings": [
        "missing artifact: .krn/dogfood/**/summary.json"
      ],
      "nextActions": [
        "Run a dogfood benchmark or real-repo readiness scaffold when relevant."
      ]
    }
  ],
  "blockers": [],
  "warnings": [
    "missing artifact: .krn/dogfood/**/summary.json"
  ],
  "nextActions": [
    "Run a dogfood benchmark or real-repo readiness scaffold when relevant."
  ]
}
```

## Limits

- Reviewers read local artifacts only.
- Reviewers do not mutate source files.
- Reviewers do not execute commands.
- Reviewers do not call paid models.
- Reviewer output is operator guidance, not production proof.
