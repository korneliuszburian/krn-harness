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

## Workflow API

Inputs:
- completed or paused task state;
- changed files, validation commands/results, artifact pointers, current git
  status, and known gaps;
- the next concrete action or recovery entrypoint.

Output:
- a concise review-ready closeout or continuation summary;
- exact changed files, validation, proof status, P0 scope status, residual risk,
  and next `/goal` or next safe slice.

Escalation:
- use `$review` instead when a pass/fail evidence judgment is needed;
- use `$kanon` if the handoff would introduce new active truth rather than
  summarize completed work;
- use `$pilnuj` if the next action requires scope classification.

Proof:
- include only validation that actually ran or explicitly state why it did not
  run;
- never convert local evidence into production proof, hook trust, CI proof, or
  target-main approval.

Condensation:
- reference existing PRDs, plans, ADRs, commits, diffs, runtime artifacts, or
  handoffs by path or URL instead of duplicating them;
- redact sensitive data and avoid raw chat-history dumps.

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
