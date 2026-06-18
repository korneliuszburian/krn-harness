---
name: handoff
description: KRN Harness review-ready handoff workflow. Use before the final response after non-trivial work, before context compaction, before switching sessions, or when the user asks for a concise summary suitable for ChatGPT review or future continuation.
---

# Handoff

## Invocation

Use explicitly as `$handoff` before final responses after non-trivial KRN work,
before context compaction, or before switching sessions.

Expected output: a review-ready closeout with changed files, validation results,
known gaps, P0 scope status, and the next concrete `/goal`.

Use this to prepare KRN Harness work for external review and safe continuation.

## Scope

Job: produce a concise review-ready closeout or continuation summary.

Use when:
- non-trivial KRN work is complete enough to summarize for review;
- context is about to compact, a session is ending, or another reviewer needs
  exact changed files, validation, gaps, and next action.

Do not use when:
- work is still being designed or implemented;
- the user asks for an evidence audit with pass/fail judgment, which belongs to
  `$review`;
- the response can be a simple direct answer.

Stop when validation evidence is missing, changed files are unclear, or the
handoff would imply production proof or hook trust from local evidence.

## Workflow

1. Summarize what changed and why.
2. List changed files grouped by purpose.
3. Report validation commands and exact results.
4. Mention commands not run and why.
5. Record known gaps and residual risks.
6. State whether P0 scope was respected.
7. State whether ADR or spec follow-up is needed.
8. Suggest the next recommended `/goal`.

## Constraints

- Do not claim success without evidence.
- Do not hide failed commands.
- Do not omit residual risks.
- Do not call local evidence production proof.
- Do not include raw chain-of-thought.
