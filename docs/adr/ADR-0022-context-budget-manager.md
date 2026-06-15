# ADR-0022: Context Budget Manager

## Status

Accepted.

## Context

GOAL-8H TASK-006 asks for a context budget manager. Current KRN context
packages already rank items, bucket them, and expose over-inclusion metrics, but
they did not declare a token budget or show whether context was pruned before
operator use.

The relevant research risk is that long-context models do not reliably use all
input positions equally. KRN should therefore keep context explicit, ranked, and
bounded instead of assuming a larger context window solves relevance.

This slice must not add embeddings, semantic retrieval, vector DBs, or a new
agent runner. Budgeting is deterministic local evidence only.

## Decision

Add a deterministic context budget manager to `packages/context`.

Each context package records a `budget` object with:

- `maxTokens`;
- `estimatedTokens`;
- `retainedTokens`;
- `prunedTokens`;
- `status`;
- estimator id;
- item counts before and after pruning;
- pruned item summaries;
- retention policy id.

The P1 estimator is deliberately shallow: `chars-div-4-v1` over context item
metadata. It does not read full file contents and does not call a tokenizer or
model API.

The default max budget is 8,000 estimated tokens. Callers may pass a tighter
`maxTokens` for tests or future profiles.

Pruning keeps safety and task-owned evidence ahead of lower-priority context.
The accepted retention policy is:

`task-contract-and-safety-before-memory-before-graph`

`do-not-use` and `missing-context` safety items are retained before optional
active/reference context. Approved memory outranks graph context when a tight
budget forces pruning, but memory remains gated by existing memory policy and
never becomes active edit context.

Base repo context plus task-contract and task-policy evidence are protected
from budget pruning. If protected evidence alone exceeds the requested limit,
the package records `status: "over-budget"` instead of dropping safety or task
boundaries.

`krn context` records budget status in `context.built` trace payloads.

## Drivers

- Context reliability: important evidence should not be buried in unbounded
  context.
- Auditability: operators need to see whether context was within budget or
  pruned.
- Scope control: deterministic estimates are enough for P1; tokenizer/model
  integration is not required.
- Safety: pruning must not remove STOP, missing-context, or do-not-use evidence.

## Consequences

Context package JSON now includes a `budget` section. Markdown includes a compact
budget line.

Default fixture behavior should remain effectively unchanged because normal
context packages are under the default budget. Tight budget tests exercise
pruning behavior explicitly.

The token estimate is approximate. It is good enough for deterministic local
budget pressure and trace evidence, not for exact model-token accounting.

## Alternatives Considered

- Add a tokenizer dependency immediately: rejected because P1 does not need a
  native or model-specific dependency for deterministic guardrails.
- Use embeddings/vector retrieval for budget selection: rejected as explicit
  non-goal for this GOAL-8H slice.
- Prune only Markdown output: rejected because JSON would still hide the fact
  that optional context exceeded budget.
- Prune `do-not-use` or missing-context evidence: rejected because budget
  pressure must not remove safety boundaries.

## Evidence/Source References

- `docs/specs/context-package.schema.md`
- `packages/context/src/build-context-package.ts`
- `packages/context/src/budget-manager.ts`
- `docs/product/research-backed-architecture.md`
- Lost in the Middle: https://arxiv.org/abs/2307.03172

## Revisit When

Revisit before adding model-specific tokenizers, configurable context profiles,
history-aware budget slices, or semantic retrieval.
