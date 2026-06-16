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

## Completed: Second Real Repo Repeat

Status: `marketing-intelligence-studio` was validated in an isolated clone at
`811da65713a101cb374b33af12759d86caff59bf`.

Evidence:

- Direct full pytest was target-blocked, 361 passed and 3 failed in
  `tests/test_feedback_gsc_metrics_intelligence.py`.
- Target-owned `scripts/quality_gate.sh` passed with the default fast profile.
- `krn config doctor --json` passed.
- `krn run --task-spec .krn/local/second-target-repeat-task-spec.json --execute-verify --bundle`
  reached `verified`.
- Verify mode/status was `execute` / `pass`.
- Executed command was `python3 tools/krn_check_quality_gate.py`.
- Bundle manifest was generated.
- No target commit, push, PR, production proof, or hook-trust claim was made.

Result docs:

- `docs/handoffs/2026-06-16-second-real-repo-repeat-plan.md`.
- `docs/handoffs/2026-06-16-second-real-repo-repeat-result.md`.
- `docs/handoffs/2026-06-16-overnight-adoption-gauntlet-result.md`.

Adoption frictions are tracked in
`docs/product/adoption-friction-register.md`.

## Priority 1: Harden Adoption Frictions From Real Target Findings

Goal: choose one recorded adoption friction and fix it with a focused test or
docs update.

Candidate findings:

- Python targets need local `tools/*.py` wrappers under the current verify
  allowlist.
- Existing product-owned `.krn/` directories block adoption with fixed runtime
  storage.
- Protected-looking paths used as explicit do-not-use evidence can fail the
  deterministic safety reviewer.
- Target `.gitignore` should ignore `.krn/` runtime artifacts when the target
  does not own that namespace.

Acceptance:

- Every fix maps to `docs/product/adoption-friction-register.md`.
- Tests or docs regression cover the exact finding.
- No broad graph rewrite, AST/dataflow engine, runtime-dir feature, or new
  retrieval layer unless separately approved.

## Completed: Target Config PR #78

Status: PR #78 exists in `krn-llm-wiki` from
`krn-adopt-harness-config-20260615` to `main`. It commits only
`krn.config.json`, passed final 2026-06-16 validation, and was merged through PR
#78. Target `main` now contains `krn.config.json`.

Adoption note: the target currently does not ignore `.krn/`, so runtime evidence
appears as untracked files in the isolated worktree. Treat that as a target-owner
follow-up, not as a KRN source change.

## Priority 2: Harden Context Selection From Real Target Findings

Goal: turn observed real-target context/report noise into focused fixes.

Acceptance:

- Every fix maps to a recorded real-target finding.
- Tests cover the finding.
- No broad graph rewrite, AST/dataflow engine, or new retrieval layer.

## Priority 3: Add Minimal v0.1 Release Note/Tag Process

Goal: define the smallest local tag/release-note process for v0.1 handoff.

Acceptance:

- Release note records shipped surfaces, proof evidence, validation commands,
  non-goals, and risks.
- Tag process is local/repo-only until publishing is explicitly designed.
- No package publishing automation is added.

## Priority 4: Later Hook Trust Investigation

Goal: investigate hook trust only if Codex project hook loading becomes relevant
to an approved target workflow.

Acceptance:

- Separate goal and explicit approval.
- Disposable non-protected target.
- No bypass-based trust claim.
- No production proof claim.

## External Audit Triage Candidates

Tracked in `docs/product/external-audit-triage-2026-06-16.md`. The only
near-term candidates after target repeat are:

- Threat model docs without `krn hook verify`.
- Run hash evidence without `krn run --compare`.
- Golden deterministic eval corpus before any LLM judge.
- Config inheritance only if repeat target evidence shows copy/paste pain.
- Memory/eval ADR refresh in existing ADRs/specs, not duplicate docs.

## Not Before v0.2

- MCP server or action tools.
- Vector DB or embeddings dependency.
- Dashboard server or hosted UI.
- Autonomous subagent framework.
- Additional report/release bundle variants.
- More proof schemas without a real target finding.
- Package publishing pipeline.
