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
