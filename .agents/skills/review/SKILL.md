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

## Workflow

1. Read the active task/spec/goal and summarize the requested outcome.
2. Inspect `git status --short --branch` and staged files before judging.
3. Check task-spec alignment: confirm the result matches what was asked.
4. Check verify evidence: confirm allowed verify commands ran and passed.
5. Check protected paths: confirm no active protected path was used, touched, or read outside explicit task permission.
6. Check proof claims: reject production-proof or hook-trust overclaims.
7. Check scope: reject P1/P2 creep inside P0 work.
8. Check target operations: reject target main push or merge unless explicitly approved.
9. Check runtime hygiene: confirm `.krn` runtime artifacts are not staged or committed.
10. Emit one status with exact reasons and evidence paths.

## Output

- `VERIFIED`: Evidence proves the requested result, validation passed, scope boundaries held, and no runtime artifacts are staged.
- `NEEDS_CHANGES`: Work can continue locally; list concrete missing evidence, failed checks, scope drift, or artifact hygiene issues.
- `BLOCKED`: Progress requires operator input, missing external state, approval, or an unavailable dependency.

Each output must include exact evidence paths or command names, such as
`GOAL.md`, `<runtime-dir>/current/verify-result.json`, `git status --short`,
`git diff --cached --name-only`, or a target PR URL.

## Constraints

- Do not rerun the whole implementation workflow.
- Do not edit files while reviewing unless the operator explicitly asks for fixes.
- Do not replace human PR review or approval.
- Do not claim hard security, production proof, or hook trust.
- Do not treat local evidence as production evidence.
- Do not add feature scope while auditing.
