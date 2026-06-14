# Reviewer Framework v0

## Purpose

Reviewers inspect KRN artifacts and emit review records for operator decisions.

They are not autonomous agents. They do not edit code, commit, push, or approve memory.

## Inputs

Allowed reviewer inputs are local artifacts only:

- `.krn/current/task-contract.json`
- `.krn/current/context-package.json`
- `.krn/current/verify-result.json`
- `.krn/current/handoff.md`
- `.krn/current/run.json`
- `.krn/graph/repo-graph.json`
- `.krn/dogfood/**/summary.json`
- `.krn/dogfood/**/grade.json`
- sanitized handoff or release docs

Missing artifacts produce `warn`, `fail`, or `blocked`; they must not be silently ignored.

## Output Schema

```json
{
  "schema": "krn-reviewer-result-v1",
  "reviewerId": "evidence",
  "reviewerName": "Evidence reviewer",
  "reviewer": "evidence",
  "status": "pass",
  "severity": "pass",
  "confidence": "medium",
  "summary": "Required artifacts are present.",
  "evidence": [
    ".krn/current/verify-result.json"
  ],
  "artifactsRead": [
    ".krn/current/verify-result.json"
  ],
  "findings": [],
  "blockers": [],
  "warnings": [],
  "nextActions": []
}
```

## Status And Severity

- `pass`: evidence supports the check.
- `warn`: evidence is incomplete or lower-confidence.
- `fail`: evidence contradicts the requirement.
- `blocked`: required evidence cannot be inspected safely.

Confidence is `low`, `medium`, or `high`.

## Initial Reviewers

| Reviewer | Checks | Must not do |
| --- | --- | --- |
| Safety | protected-data warnings, source checkout target, global KRN fallback, danger bypass claims | read secret contents |
| Evidence | required artifacts, trace paths, verify/handoff presence | accept self-report alone |
| Context | STOP status, must-read/do-not-use coverage, stale doc leakage | use embeddings |
| Verify | verify status/mode/executed commands | execute commands |
| Handoff | handoff present and names risks | rewrite handoff |
| Dogfood | task pass/fail, identity validity, forbidden files, skipped/blocked status | call Codex |
| Release | local validation status and unpublished constraints | publish or create CI |

## Optional LLM Reviewer

An LLM reviewer is dry-run only until explicitly approved. It must receive sanitized summaries, not protected repo contents, and normal tests must not call paid models.

## CLI

`krn review` runs deterministic reviewers and prints Markdown by default.

`krn review --json` prints the aggregate `krn-review-summary-v1` object.

`krn review --write` writes:

- `.krn/current/review-summary.json`
- `.krn/current/review-summary.md`

It also writes compatibility aliases:

- `.krn/current/review-result.json`
- `.krn/current/review-result.md`

It writes a `review.ran` trace event. It does not edit source files, execute verify commands, call models, commit, or push.

`krn review --llm` does not exist. It would require explicit approval and a stubbed/no-model test path before it can be added.
