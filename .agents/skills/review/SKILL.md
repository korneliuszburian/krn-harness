---
name: review
description: Review completed KRN Harness work against task intent, verification evidence, protected paths, proof claims, P0 scope, target-merge boundaries, and staged runtime artifacts. Use when a KRN task needs a final or midstream evidence audit; do not use to implement features, replace human PR review, rerun the whole workflow, or invent new scope.
---

# Review

## Invocation

Use explicitly as `$review` when KRN Harness work needs an evidence-first audit
before completion, handoff, commit, push, or external review.

Expected output: `VERIFIED`, `NEEDS_CHANGES`, or `BLOCKED`, with specific
reasons and exact evidence paths.

## Scope

Job: judge whether completed KRN work is supported by current evidence.

Use when:
- KRN work needs a final or midstream evidence audit before completion, handoff,
  commit, push, or external review;
- task alignment, verify evidence, protected paths, proof claims, target
  operations, or runtime artifact hygiene are in question.

Do not use when:
- implementation or fixes are still being made, unless the user asks for a
  midstream audit;
- the task is a human PR review replacement or model-based reviewer request;
- the goal is to rerun the full workflow instead of checking current evidence.

Stop when required evidence is unavailable, an approval gate is missing, or the
only honest result is `NEEDS_CHANGES` or `BLOCKED`.

## Workflow

1. Read the active task/spec/goal and summarize the requested outcome.
2. Inspect `git status --short --branch` and staged files before judging.
3. If owned source files are untracked, inspect those exact files and require
   direct path checks as needed; `git diff` and `git diff --check` do not prove
   untracked content.
4. Check task-spec alignment: confirm the result matches what was asked.
5. Check verify evidence: confirm allowed verify commands ran and passed.
6. Check protected paths: confirm no active protected path was used, touched, or read outside explicit task permission.
7. Check proof claims: reject production-proof or hook-trust overclaims.
8. Check scope: reject P1/P2 creep inside P0 work.
9. Check target operations: reject target main push or merge unless explicitly approved.
10. Check runtime hygiene: confirm `.krn` runtime artifacts are not staged or committed.
11. Emit one status with exact reasons and evidence paths.

## Output

- `VERIFIED`: Evidence proves the requested result, validation passed, scope boundaries held, and no runtime artifacts are staged.
- `NEEDS_CHANGES`: Work can continue locally; list concrete missing evidence, failed checks, scope drift, or artifact hygiene issues.
- `BLOCKED`: Progress requires operator input, missing external state, approval, or an unavailable dependency.

Each output must include exact evidence paths or command names, such as
`GOAL.md`, `<runtime-dir>/current/verify-result.json`, `git status --short`,
`git diff --cached --name-only`,
`git diff --no-index --check -- /dev/null <new-file>`, or a target PR URL.
If review adds no finding beyond already-recorded validation, say that directly
instead of promoting another ritual step.

## Constraints

- Do not rerun the whole implementation workflow.
- Do not edit files while reviewing unless the operator explicitly asks for fixes.
- Do not replace human PR review or approval.
- Do not claim hard security, production proof, or hook trust.
- Do not treat local evidence as production evidence.
- Do not add feature scope while auditing.
