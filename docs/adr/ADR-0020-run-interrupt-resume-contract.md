# ADR-0020: Run Interrupt/Resume Contract

## Status

Accepted as a P1 contract. Implementation is deferred.

## Context

GOAL-8H TASK-003 asks for an interrupt/resume pattern in `krn run`. The raw
audit proposal named `--interrupt-on <hook-decision>` and a future `krn resume`
command, but current KRN constraints keep `krn run` as the primary operator
workflow and require explicit approval before adding new CLI surface.

Current `krn run` is a deterministic local workflow over `start`, `graph`,
`context`, `verify`, `handoff`, `review`, `summary`, `report`, and optional
bundle/release-check evidence. It does not launch Codex and does not own Codex
session state.

Codex itself exposes interactive and non-interactive resume commands. KRN must
not confuse Codex session resume with KRN run resume until ADR-0012 is replaced
or accepted with concrete Codex execution policy.

Hooks also cannot be the first resume authority. ADR-0004 says hooks are
guardrails and trace points, not a sandbox, and KRN still records hook trust as
unproven unless trusted non-bypass hook provenance exists.

## Decision

Accept an interrupt/resume contract as local KRN run state, not as Codex session
state and not as hook trust proof.

A future implementation may write a local interrupt checkpoint at
`.krn/current/interrupt.json` and, for task-scoped runs,
`.krn/runs/<task_id>/interrupt.json`. The checkpoint must be rebuildable from
current run artifacts where possible and must never become production proof.

Keep `krn run` as the primary workflow. Do not add a top-level `krn resume`
command in this ADR slice. A later implementation slice may add resume behavior
only after explicit CLI-surface approval. The preferred future shape is an
extension of `krn run`, such as `krn run --resume <interrupt.json>`, unless a
later ADR explicitly accepts a top-level command.

The first implementation must not treat hook `warn` or `block` decisions as
trusted resume gates until real non-bypass hook trust is proven. Manual hook
probes remain diagnostics only.

Resume must not bypass:

- task-spec validation;
- context STOP state;
- verify execute policy;
- forbidden/protected path boundaries;
- no-push and no-production-proof boundaries;
- report, summary, and bundle honesty.

## Drivers

- Operator continuity: some blocked local runs should preserve enough state for
  a reviewed continuation.
- Scope control: resume needs state, policy, and CLI semantics; it should not be
  hidden inside current `run.ts`.
- Trust boundaries: Codex session resume, hook continuation, and KRN run resume
  are different mechanisms.
- Auditability: interrupts should be inspectable local artifacts with explicit
  reasons and required operator decisions.
- Safety: resume must not turn a warning or hook diagnostic into authorization.

## Consequences

TASK-003 can move forward as a documented contract without adding a new command,
new option, Codex wrapper, hook behavior, or mutation path.

The future implementation has to decide exact CLI syntax, operator approval
shape, stale interrupt handling, and whether resumed runs append to the same
run-scoped trace or start a linked run. Those are implementation decisions, not
accepted by this ADR.

Any future `krn resume` top-level command remains unapproved until a separate
ADR or explicit implementation request accepts the extra CLI surface.

## Alternatives Considered

- Add `krn resume` immediately: rejected because it is a new top-level command
  and would break the current `krn run` primary-workflow constraint.
- Add `--interrupt-on <hook-decision>` immediately: rejected because hook trust
  remains unproven and hook decisions are guardrail evidence, not operator
  approval.
- Use Codex `resume` or `codex exec resume` as KRN resume state: rejected for
  now because ADR-0012 does not accept a Codex execution wrapper.
- Treat every blocked run as resumable: rejected because protected-data,
  forbidden-path, and verification-policy blockers may require a fresh task
  instead of continuation.

## Evidence/Source References

- `packages/cli/src/commands/run.ts`
- `packages/cli/src/index.ts`
- `docs/specs/run-result.schema.md`
- `docs/specs/run-interrupt-resume.md`
- `docs/specs/codex-noninteractive-feasibility.md`
- `docs/adr/ADR-0004-codex-hooks-as-guardrails.md`
- `docs/adr/ADR-0012-future-codex-exec-wrapper.md`
- `docs/adr/ADR-0017-verify-execute-policy.md`
- Codex non-interactive docs: https://developers.openai.com/codex/noninteractive
- Codex hooks docs: https://developers.openai.com/codex/hooks

## Revisit When

Revisit when TASK-003 implementation is explicitly approved, when ADR-0012 is
replaced by an accepted Codex execution policy, or when trusted non-bypass hook
evidence changes what can safely be used as an interrupt signal.
