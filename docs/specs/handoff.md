# Handoff

## Purpose

`krn handoff` creates a concise current-state summary for review or continuation.

## Current Artifact

- `.krn/current/handoff.md`

## P0 Content

- Task id and task summary.
- Context STOP state and reason when present.
- Verify status.
- Graph artifact status and node/edge counts when available.
- Current run trace path when available.
- Doctor, eval, and downstream acceptance status when available.
- Artifact pointers for current task, context, graph, verify, doctor, eval, and run trace evidence.
- Changed files when available from local git status.
- Known gaps, residual risks, and next safe action placeholders.

## P0 Rule

Handoff is generated from local current-state artifacts. It is not production proof.
