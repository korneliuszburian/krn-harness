# Memory Schema

## Purpose

Memory is governed local recall, not automatic truth.

KRN memory is a product artifact under `.krn/memory/*`. It is not Codex
personal memory, not `~/.codex/MEMORY.md`, not `AGENTS.md`, and not active
canon. Official Codex docs treat `AGENTS.md` and Memories as complementary:
`AGENTS.md` carries durable project guidance, while Memories carry useful
context forward. KRN preserves that separation by making memory reference-only
until a separate canon/spec/ADR update promotes a decision.

Sources:

- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/memories
- https://developers.openai.com/codex/skills

## Local Stores

- `.krn/memory/pending.json`
- `.krn/memory/approved.json`
- `.krn/memory/deprecated.json`

Each store uses:

- `schemaVersion`: `1`.
- `status`: the store status.
- `records`: memory records for that status only.

## Record Fields

- `id`: memory id.
- `summary`: concise memory content.
- `status`: `pending`, `approved`, or `deprecated`.
- `evidencePath`: optional source evidence.
- `createdAt`: ISO timestamp.
- `updatedAt`: ISO timestamp.
- `approvedAt`: required only after manual approval.
- `deprecatedAt`: required only after manual deprecation.
- `deprecationReason`: optional deprecation reason.
- `source`: `manual`.

## Manual Workflow

- `krn memory propose "<summary>" [--evidence <path>]` writes pending memory only.
- `krn memory approve <memory_id>` moves a record to approved memory.
- `krn memory deprecate <memory_id> [reason]` moves a record to deprecated memory.
- `krn memory list` reports deterministic local counts and records.

## Rule

P0 never auto-approves memory. Pending and deprecated records are not active memory.

Approved memory is still gated. `krn context` may surface approved records only as `referenceOnly` items, only when explicitly requested or task-relevant, and only with memory id, approval timestamp, summary, and evidence provenance. Task relevance requires at least two non-broad matched terms; English and Polish explicit opt-out phrases suppress approved memory.

P0 Polish handling is deterministic phrase matching for operator safety, not semantic retrieval or morphology. Supported opt-outs include `bez pamięci`, `nie używaj pamięci`, `nie używaj poprzednich decyzji`, and `bez wcześniejszych ustaleń`. Supported Polish explicit request phrases are limited to approved-memory wording such as `użyj zatwierdzonej pamięci`.

Store writes are dirty-only in P0: memory operations rewrite only the status stores whose records changed. If memory gains TTLs, tags, or larger indexing metadata, add explicit store-level change tests before broadening the write path.

## Usefulness Evidence

Memory usefulness is not proven by store existence, passing fixtures, Codex
personal memory, or an agent self-report. A memory record is useful only when it
changes a later task outcome without poisoning project truth.

A usefulness packet must record:

- `memoryId`;
- approval reference and approval timestamp;
- summary;
- evidence path;
- scope/use case;
- why the record belongs in governed memory instead of `AGENTS.md`, a spec, an
  ADR, or the active goal;
- reference-only behavior observed in context;
- opt-out phrase used or available;
- deprecation or opt-out expectation;
- task before/after effect, such as avoided repeated mistake, less irrelevant
  reading, clearer validation, or faster review;
- decision: `useful`, `notUseful`, or `unclear`.

Candidate example shape:

```json
{
  "memoryId": "mem-goal-docs-no-wording-tests",
  "approvalRef": "<literal operator approval required before active use>",
  "summary": "For docs-only audit consolidation, do not add tests that assert documentation wording; validate with rg evidence, git diff --check, and lint unless code or schema behavior changes.",
  "evidencePath": "docs/product/audit-consolidation-goal-2026-06-18.md",
  "scope": "KRN audit-consolidation docs-only slices",
  "whyMemoryInsteadOfCanon": "This is operator workflow preference for a repeated task shape. The durable canon remains in AGENTS.md and product specs.",
  "contextBehavior": "referenceOnly only; never must-read or should-read",
  "optOut": "bez pamięci",
  "deprecationExpectation": "Deprecate when docs-only validation policy changes or a closer AGENTS.md rule supersedes it.",
  "decision": "unclear"
}
```

This candidate is not active memory until the operator explicitly approves it
through the governed memory workflow. If approved and later selected, it must
appear only as `referenceOnly` context with the memory id, approval timestamp,
summary, evidence path, and matched terms. If the operator opts out or the task
does not match narrowly enough, it must not appear at all.

Forbidden:

- semantic memory;
- vector memory;
- automatic approval;
- protected-data memory;
- memory as canon;
- memory sourced from Codex personal `MEMORY.md`;
- memory promoted from raw audit text without condensation.
