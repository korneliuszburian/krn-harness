# Reviewer Contracts

## Decision

KRN does not implement an autonomous subagent framework in the current product
layer. The only accepted near-term role is a deterministic reviewer that reads
local artifacts and emits JSON/Markdown records.

This means KRN starts reviewer work as contracts, not as an autonomous execution framework.

Official Codex source anchors:

- Subagents are explicit, parallel workflows and are not spawned automatically:
  `https://developers.openai.com/codex/subagents`.
- Subagents inherit sandbox and approval controls:
  `https://developers.openai.com/codex/subagents`.
- Codex app worktrees are Git worktrees used for independent background work,
  and Codex-managed worktrees can save snapshots before deletion:
  `https://developers.openai.com/codex/app/worktrees`.

## Shared Contract

Any future reviewer-like role must name:

- input artifacts;
- output artifact;
- allowed reads and writes;
- stop conditions;
- validation evidence;
- protected-data boundary;
- escalation path.

It must stop when protected data, missing required artifacts, uncontrolled
parallel edits, or unapproved model calls would be required.

Reviewers must not edit files, spawn agents, approve memory, or call models by default.

## Delegation Worktree Protocol

This protocol is contract-only. It describes the shape of a future delegated
task, but KRN does not spawn Codex agents, create worktrees, route model work,
or merge results in the current product layer.

One delegated task means:

- one explicit operator request for delegation;
- one isolated checkout or worktree, never the dirty source checkout;
- one task contract with owned files, expected touched files, forbidden paths,
  target validation, rollback, no-push, no-merge, target approval, protected
  data exclusion, and target-isolation boundaries when target mutation is in
  scope;
- one `krn run --task-spec ... --execute-verify --bundle` result when execution
  is approved;
- one run-result and one run bundle;
- one review/handoff that names the exact artifacts and residual risks;
- one human decision about whether the output can be promoted, copied, merged,
  or discarded.

Allowed delegation shapes:

- read-only exploration that returns a compact summary with file references;
- deterministic reviewer passes that read local artifacts;
- approved target work in an isolated checkout with task-spec boundaries and
  target-owned validation.

Forbidden delegation shapes in this product layer:

- KRN-owned subagent spawning or recursive agent fan-out;
- write-heavy parallel edits in the same checkout;
- model calls by reviewer contracts unless a later ADR accepts them;
- automatic memory approval, target push, target merge, or canon mutation;
- Codex-managed snapshots, screenshots, appshots, or subagent self-reports as
  KRN proof;
- production-proof, CI-proof, hook-trust, or target-main approval claims from
  delegated work alone.

Delegated summaries are decision support. They are not active truth until
checked against repo artifacts, target validation, review, and an explicit
operator decision.

## Deferred Work

Planner/implementer/safety-checker execution roles require a later ADR,
isolated worktree policy, conflict handling, and explicit operator approval.
