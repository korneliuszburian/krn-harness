# Knowledge Condensation

## Purpose

Knowledge condensation turns scattered evidence into reviewable proposals for canon.

It does not auto-update active truth.

## Inputs

Allowed inputs are local, reviewable artifacts:

- benchmark summaries;
- handoff docs;
- ADRs;
- specs;
- README status;
- trace/eval summaries;
- repeated operator instructions;
- failed validation notes.

Do not condense protected data, `.env` contents, dumps, uploads, production credentials, or client documents.

## Levels

| Level | Use when | Output |
| --- | --- | --- |
| Note | Observation may be useful but is not policy | pending note |
| Ledger entry | Decision or status should be visible | decision ledger or handoff |
| ADR | Architecture commitment changes behavior | `docs/adr/*` |
| Spec | Contract/schema/template changes | `docs/specs/*` |
| README status | Operator-facing truth changed | `README.md` |
| Code rule/test | Drift must be prevented mechanically | test or validator |

## Workflow

1. Gather source artifacts.
2. Separate evidence from interpretation.
3. Identify stale claims and contradictions.
4. Propose concise truth updates.
5. Require operator or maintainer review before canon changes.
6. Add regression tests when wording prevents future drift.

## Future Command

A future `krn condense` may emit a Markdown proposal from local artifacts. It must be review-only, must not auto-approve memory, and must not mutate docs without explicit operator action.

## Current Status

P1 entry starts with this documented workflow and docs-regression tests. No command exists yet.
