# Daily Work Model

## Status

This is a contract-only product model for EXT-001 and EXT-002 from
`docs/product/audit-consolidation-goal-2026-06-18.md`.

It does not add a `krn daily` command, dashboard, server, database, scheduler,
agent runner, memory auto-approval, snapshot artifact, browser proof, or target
mutation authority.

## Product North Star

KRN Harness makes Codex work contract-backed, remembered, verified, reviewed,
and auditable while keeping the product center unchanged:

```txt
krn run -> run-result -> run-bundle
```

The terms are intentionally narrow:

- Contract-backed: a task contract records goal, context, constraints,
  boundaries, done-when, and proof expectations before meaningful edits.
- Remembered: KRN may surface governed repo/runtime memory as reference-only
  context with evidence provenance and opt-out behavior. Codex personal memory
  and `~/.codex/MEMORY.md` are operator context, not KRN project truth.
- Verified: target-owned validation remains explicit about command, coverage,
  authority, limitations, and unsafe conditions.
- Reviewed: deterministic review checks local artifacts and overclaim risks; it
  does not replace human PR review or call models by default.
- Auditable: the local evidence chain is task contract, context package, trace,
  verify result, run-result, review summary, handoff, operator summary/report,
  and run bundle.

Source anchors:

- Codex best practices: `https://developers.openai.com/codex/learn/best-practices`.
- Codex `AGENTS.md`: `https://developers.openai.com/codex/guides/agents-md`.
- Codex skills: `https://developers.openai.com/codex/skills`.
- Codex memories: `https://developers.openai.com/codex/memories`.
- Local product truth: `docs/product/mvp-state.md`,
  `docs/specs/task-contract.schema.md`, `docs/specs/run-result.schema.md`,
  `docs/product/target-adoption-playbook.md`, and
  `docs/specs/memory.schema.md`.

## Daily Artifact Loop

The daily loop is a projection over existing artifacts, not a new runtime
surface.

1. Orient from the active goal, current task contract, latest run-result,
   review summary, operator summary/report, known blockers, and pending memory
   records.
2. Narrow the next task to one contract with owned files, forbidden paths,
   target validation, rollback/no-push/no-merge boundaries where relevant, and
   explicit proof.
3. Build context from repo instructions, specs/ADRs, graph-lite hints, selected
   files, and approved reference-only memory when requested or task-relevant.
4. Execute through `krn run --task-spec ... --execute-verify --bundle` when the
   task is approved for execution.
5. Review local artifacts for missing evidence, overclaims, scope drift, and
   protected-data risk.
6. End with a handoff, exact validation commands, residual risk, and optional
   memory candidates that remain pending until operator approval.

## Flow Contracts

| Flow | Task contract | Context | Verify and review | Memory touchpoint | Proof boundary |
| --- | --- | --- | --- | --- | --- |
| Bugfix | Narrow defect, expected touched files, forbidden paths, rollback, done-when. | Relevant source/tests/specs plus known regression notes. | Target-owned unit or quality gate through `krn run`; review catches missing tests or overclaims. | Candidate memory only when the bug exposes a reusable repo rule. | Local target proof only unless a separate approved release/production gate exists. |
| Frontend page or component | Route/component, target files, copy status, design constraints, a11y expectations, and `metadata.visualProof` when UI acceptance matters. | Component source, existing design conventions, route docs, target validation docs, operator-supplied visual reference, target-owned visual command if one already exists. | Code/test/lint gates first; `visualProof` records acceptance metadata and any target-owned/manual visual artifact, but cannot infer visual correctness from build output. | Candidate memory only for durable design-system or route conventions. | No generated screenshots, browser captures, appshots, Figma dependency, external visual service, or visual-correctness claim in this goal. |
| New app slice | One vertical behavior slice, data boundaries, config assumptions, and proof command. | Existing architecture docs, schemas, package conventions, and relevant tests. | `krn run` plus target-owned verification; review checks that the slice did not create a hidden platform layer. | Candidate memory only for reusable implementation constraints. | No new top-level KRN surface unless a later accepted goal owns it. |
| Review-only task | Review target, expected artifact paths, and explicit no-edit boundary. | Changed files, task contract, run-result, review/report artifacts, and source docs. | `krn review`, `krn summary`, or `krn report` may summarize evidence but must not execute verify or mutate code. | Memory proposals remain pending and evidence-backed. | Review output is decision support, not proof by itself. |
| Target adoption | Safe target selection, approval reference, target isolation, protected-data exclusion, validation command, no-push, no-merge. | Target AGENTS/config/specs plus KRN adoption playbook and task spec boundaries. | `krn run --task-spec ... --execute-verify --bundle` only after explicit operator approval. | Target findings may become source backlog entries, not auto-approved memory. | Config/product-code/local proof stays separate from production proof and hook trust. |
| Multi-project work | One repo, one task contract, one runtime root, and one proof boundary per task. | Per-repo context only; no cross-repo memory unless explicitly approved and provenance-backed. | Verify each repo independently; review cross-repo claims as unsupported unless artifacts exist for each repo. | Shared lessons become pending memory candidates with source repo and evidence path. | No implicit global truth from one repo to another. |

## Ledger Inputs

A future daily ledger may only read existing local artifacts until EXT-004
accepts a schema:

- task contract and active goal;
- context package and graph-lite artifacts;
- run-result, verify result, trace, review summary, and handoff;
- operator summary/report and run bundle;
- governed memory stores;
- adoption friction records, blockers, known risks, and target approval packets.

The ledger must not become source of truth, mutate task contracts, approve
memory, execute commands, or hide missing artifacts.

## Hard Stops

- Do not create `krn daily` in this goal.
- Do not implement a dashboard, hosted UI, database, external service, or
  autonomous delegation runtime from this model.
- Do not use generated snapshots, appshots, screenshots, or Codex-managed
  worktree snapshots as KRN proof.
- Do not turn raw audits, Codex personal memory, or subagent self-reports into
  active project truth.
- Do not claim production proof, CI proof, hook trust, or target-main approval
  without separate artifacts that actually prove those claims.
