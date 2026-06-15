# Next Implementation Backlog

## Purpose

This is the v0.1 post-cut backlog. KRN v0.1 local proof threshold is crossed:
`krn run` is the primary operator path, real target product-code proof exists as
local isolated-worktree evidence, `productionProof` remains false, and
`hookTrust` remains unproven.

Do not add product surfaces before these items. Target commit/push remains
separate from KRN source proof.

GOAL-8H hardening work is tracked separately in
`docs/product/goal-8h-roadmap.md`; use that roadmap for schema, trace, hook,
eval, graph, and downstream-template hardening order.

## Priority 1: Review Target Config PR

Status: PR #78 exists in `krn-llm-wiki` from
`krn-adopt-harness-config-20260615` to `main`. It commits only
`krn.config.json` and remains unmerged.

Goal: review the safe `krn.config.json` target PR and decide whether to merge
it into target `main`.

Acceptance:

- Target owner approves the config.
- Verify command is local, deterministic, and allowed by KRN policy.
- Target PR excludes `.krn` artifacts and protected data.
- No direct push to target `main`.
- KRN source remains unchanged unless a target finding requires a focused fix.

## Priority 2: Repeat `krn run` On A Second Real Repo

Goal: repeat `krn run --task-spec ... --execute-verify --bundle` on a second
non-protected real repository.

Acceptance:

- Clean isolated worktree.
- Preflight passes or warnings are explicitly accepted.
- Run status is `verified` or the exact blocker is documented.
- No target push and no production or hook-trust claim.

## Priority 3: Harden Context Selection From Real Target Findings

Goal: turn observed real-target context/report noise into focused fixes.

Acceptance:

- Every fix maps to a recorded real-target finding.
- Tests cover the finding.
- No broad graph rewrite, AST/dataflow engine, or new retrieval layer.

## Priority 4: Add Minimal v0.1 Release Note/Tag Process

Goal: define the smallest local tag/release-note process for v0.1 handoff.

Acceptance:

- Release note records shipped surfaces, proof evidence, validation commands,
  non-goals, and risks.
- Tag process is local/repo-only until publishing is explicitly designed.
- No package publishing automation is added.

## Priority 5: Later Hook Trust Investigation

Goal: investigate hook trust only if Codex project hook loading becomes relevant
to an approved target workflow.

Acceptance:

- Separate goal and explicit approval.
- Disposable non-protected target.
- No bypass-based trust claim.
- No production proof claim.

## Not Before v0.2

- MCP server or action tools.
- Vector DB or embeddings dependency.
- Dashboard server or hosted UI.
- Autonomous subagent framework.
- Additional report/release bundle variants.
- More proof schemas without a real target finding.
- Package publishing pipeline.
