# Audit Consolidation Continuation Ledger

## Purpose

This ledger is the recovery entrypoint for
`docs/product/audit-consolidation-goal-2026-06-18.md`.

Use it after context loss, compaction, or session handoff. It is not a second
roadmap and not a replacement for the goal document. It records only the current
operating state, proof boundaries, skill workflow, and next safe slice.

## First Reads After Context Loss

1. `git status --short`
2. `docs/product/audit-consolidation-goal-2026-06-18.md`
3. This ledger
4. Relevant skill files before acting:
   - `.agents/skills/buduj/SKILL.md`
   - `.agents/skills/kanon/SKILL.md`
   - `.agents/skills/pilnuj/SKILL.md`
   - `.agents/skills/wycinek/SKILL.md` for code/schema slices
   - `.agents/skills/handoff/SKILL.md` before closeout
5. The specific canonical doc/spec for the next extension task.

Do not rely on chat memory alone. Reinspect current files before editing.
Root `GOAL.md` is a pointer only; historical root-level goal and audit inputs
live under `docs/audit/raw/`.
For code creation rules, `AGENTS.md` is the canonical repo-level operating
contract. Do not duplicate or weaken those rules inside this ledger.

## Current Goal State

The active goal is still open.

Completed or source-hardened extension slices:

| Slice | Status | Canonical artifact | What it proves |
| --- | --- | --- | --- |
| EXT-001/EXT-002 product north star and daily work model | Source-side docs slice complete | `docs/product/daily-work-model.md`, `docs/product/mvp-state.md` | KRN direction is contract-backed daily Codex work while preserving `krn run -> run-result -> run-bundle`. |
| EXT-004 daily ledger projection | Source-side docs slice complete | `docs/product/operator-console.md` | A future daily ledger can project existing artifacts only. It is not a new command, DB, server, UI, or mutation path. |
| EXT-005 Stage 10 comparison packet | Source-side docs slice complete | `docs/product/target-adoption-playbook.md`, `docs/product/evidence-matrix.md` | Stage 10 comparison fields are concrete, but Stage 10 evidence is still missing until both approved target sides exist. |
| EXT-006 delegation worktree protocol | Source-side docs slice complete | `docs/product/subagent-contracts.md` | Safe delegation is one explicit request, one isolated checkout/worktree, one task contract, one approved run when allowed, one bundle, one review/handoff, one human decision. |
| EXT-003 governed memory usefulness | Source-side contract and first evidence packet complete | `docs/specs/memory.schema.md`, `docs/product/evidence-matrix.md`, `docs/handoffs/2026-06-18-ext003-memory-usefulness-proof.md` | One operator-approved wrapper-first target-validation memory moved pending to approved, surfaced in a later relevant context package as reference-only with provenance, and disappeared under Polish opt-out. This proves governed context recall, not Stage 9/10 target outcome. |
| EXT-007 static cockpit readiness | Source-side docs slice complete | `docs/product/operator-console.md`, `docs/product/evidence-matrix.md` | Cockpit/dashboard-lite remains a blocked local artifact-viewer contract with stable input, state-handling, protected-data, and no-source-of-truth preconditions. |
| EXT-008 codebase condensation pass | Source-side docs slice complete | This ledger | Canonical contract map points each new contract to one owner and marks raw audits/backlog references as secondary or historical. |
| EXT-009 packaging/distribution kill switch | Source-side docs slice complete | `docs/specs/release-check.schema.md`, `docs/product/evidence-matrix.md`, this ledger | Release-check, bundles, local CI, and local validation cannot authorize publishing, distribution, hosted dashboard, production runner, or hook enforcement claims. |
| EXT-010 frontend visual proof contract | Source-side schema/docs slice complete | `packages/task-contract/src/schema.ts`, `packages/cli/src/commands/start.ts`, `docs/specs/task-contract.schema.md`, `docs/product/target-adoption-playbook.md`, `docs/product/evidence-matrix.md` | UI-facing task specs can declare route/component, viewports, design constraints, a11y expectations, copy status, manual visual artifact, and target-owned visual command without creating browser/Figma/snapshot proof. |

Still open:

- Stage 9: two approved isolated target product-code/test-code repeats.
- Stage 10: same-authority simpler-baseline comparison on an approved target.

## Evidence Request Queue

The remaining work is approval-gated evidence, not more source-side product
surface. After context loss, use this queue before creating new docs, commands,
tests, dashboards, browser proof, memory artifacts, or target runs.

| Gate | Required operator input before action | Canonical contract | Evidence that can close it | Do not do |
| --- | --- | --- | --- | --- |
| EXT-003 governed memory usefulness | Satisfied by 2026-06-18 operator approval for `memory-9ea13b133ba2`. | `docs/specs/memory.schema.md` | `docs/handoffs/2026-06-18-ext003-memory-usefulness-proof.md` records id, evidence path, pending-to-approved transition, relevant reference-only context, opt-out suppression, and `useful` decision for context recall. | Do not upgrade this to Stage 9/10 target outcome proof, production proof, hook trust, auto-approved memory, or semantic/vector memory. |
| Stage 9 target repeats | Explicit target selection and approval for two tiny isolated non-protected product-code/test-code tasks. | `docs/product/target-adoption-playbook.md` | Two approved `krn run --task-spec ... --execute-verify --bundle` target runs with expected/forbidden touched files, target validation, rollback, no-push, no-merge, target isolation, target approval reference, protected-data exclusion, run-result, bundle manifest, changed files, and residual risk. | Do not mutate target repos, push, merge, touch protected data, claim production proof, claim hook trust, or count readiness packets as Stage 9 evidence. |
| Stage 10 same-authority comparison | Explicit approval for a comparable simpler-baseline target run and a KRN run on the same task class/validation authority. | `docs/product/target-adoption-playbook.md` | A comparison packet with baseline actor/result/interventions/changed files, KRN run-result/bundle/review paths, memory references if any, outcome dimensions, `meaningfulDelta`, and any scope-narrowing decision. | Do not use fixture-only benchmarks, dashboards, marketing claims, CI-only signals, target-main approval, production proof, or hook trust as Stage 10 evidence. |

If none of these operator inputs exists in the current turn, keep the goal
active and report the exact missing approvals. Do not mark the goal complete,
and do not create placeholder evidence.

## Stage 9 Evidence Request Packet

This packet is an operator request template, not approval and not evidence.
Do not fill target-specific task specs or mutate target repositories until the
operator supplies the missing target names, isolated paths, and approval refs.

Recommended approval text:

```text
APPROVED: Stage 9 target-evidence preparation and execution for exactly two
non-protected isolated target product-code/test-code tasks.

You may prepare one Stage 9/10 pre-run approval packet per target using
docs/product/target-adoption-playbook.md, then run each approved task through
krn run --task-spec ... --execute-verify --bundle.

Approved targets:
1. <target repo>, isolated path <path>, base commit <sha>,
   approvalRef <operator-provided-ref>.
2. <target repo>, isolated path <path>, base commit <sha>,
   approvalRef <operator-provided-ref>.

Constraints:
- Do not use the active source checkout as a target checkout.
- Do not touch protected data or protected-looking paths.
- Do not push, merge, open PRs, or mutate target main.
- Do not run Stage 10.
- Do not claim production proof, hook trust, CI proof, or target-main approval.
- Do not broaden verify allowlists.
- Do not generate screenshots, appshots, browser captures, dashboards, vectors,
  MCP surfaces, subagent runs, publishing artifacts, or placeholder evidence.
- Use `memory-9ea13b133ba2` only as reference-only context when task-relevant.
- Use target-owned validation wrappers only when authority, coverage,
  limitations, and unsafe conditions are explicit.

Required closeout:
- Show each target approval packet.
- Show each task spec path.
- Show changed target files and forbidden-path check.
- Show target validation authority and command.
- Show run-result and run-bundle manifest paths.
- Show `productionProof` remains false.
- Show `hookTrustStatus` remains unproven unless separately approved and proven.
- Show no pending/deprecated memory became active context.
- Show exact target rollback or discard plan.
- Run `git diff --check` and `pnpm lint` in KRN Harness after source doc updates.
```

Minimum target data required before execution:

- two target repos and isolated checkout/worktree paths;
- base commit for each isolated target checkout;
- one tiny product-code/test-code task prompt per target;
- expected touched files and forbidden touched files for each task;
- protected-data exclusions with `protectedData.allowed: false`;
- target-owned validation command, authority, coverage, limitations, and unsafe
  conditions;
- exact `approvalRef` values for each target run.

If any minimum target data is missing, the next move is to request that data,
not to invent targets or run a weaker proof.

## Non-Negotiable Proof Boundaries

- Before code changes, follow `AGENTS.md` code creation rules as the active
  repo-level implementation contract.
- No generated screenshots, appshots, browser captures, Codex-managed worktree
  snapshots, or visual snapshots as proof in this goal.
- No string-level tests for docs-only wording.
- Docs-only proof is `rg` evidence, `git diff --check`, `git ls-files .krn
  .krn-harness`, and `pnpm lint`.
- Add focused tests only when code, schemas, parser behavior, or generated
  operator artifacts change.
- Do not mutate target repos without explicit operator approval and a target
  selection.
- Do not claim production proof, CI proof, hook trust, target-main approval, or
  Stage 9/10 completion from local source docs.
- Do not confuse Codex personal memory or `~/.codex/MEMORY.md` with KRN
  `.krn/memory/*`.

## Source Discipline

Use official Codex docs for Codex behavior:

- https://developers.openai.com/codex/guides/agents-md
- https://developers.openai.com/codex/skills
- https://developers.openai.com/codex/memories
- https://developers.openai.com/codex/subagents
- https://developers.openai.com/codex/app/worktrees
- https://developers.openai.com/codex/appshots
- https://developers.openai.com/codex/hooks
- https://developers.openai.com/codex/noninteractive

Use repo docs/specs/ADRs or recorded target findings for KRN behavior. Raw audit
text in `docs/audit/` and `docs/audits/` is input, not active truth, until it is
condensed into a canon/spec/ADR/product doc.

## Canonical Contract Map

Use this table to avoid growing duplicate truth while this goal is active.

| Contract / Truth | Canonical file | Secondary or historical files | Condensation rule |
| --- | --- | --- | --- |
| Goal status and recovery | `docs/product/audit-consolidation-goal-2026-06-18.md`; this ledger | Chat context and temporary summaries | Reinspect files before acting; do not treat chat memory as current proof. |
| Raw audit intake | `docs/product/audit-consolidation-goal-2026-06-18.md` | `docs/audits/*`, `docs/audit/new-audit-*.md`, `docs/audit/raw/*`; root `GOAL.md` is a pointer only | Raw audits and historical root inputs stay historical until condensed into a canon/spec/ADR/product doc. |
| Product north star and daily flows | `docs/product/daily-work-model.md`; concise status in `docs/product/mvp-state.md` | Backlog references | Do not duplicate flow contracts elsewhere; link to the model. |
| Governed memory | `docs/specs/memory.schema.md` | `docs/product/evidence-matrix.md` for proof status; Codex personal `MEMORY.md` is outside KRN truth | First governed context-recall usefulness proof exists; Stage 9 reused the approved wrapper-first memory only as reference-only workflow guidance; comparative target-workflow outcome impact remains Stage 10 work. |
| Daily ledger and static cockpit readiness | `docs/product/operator-console.md`; ADR-0014 for dashboard-lite boundary | Operator-summary/report specs as input contracts | Keep cockpit as artifact-viewer readiness, not implementation. |
| Stage 9/10 target adoption and comparison | `docs/product/target-adoption-playbook.md` | `docs/product/evidence-matrix.md` for proof status; `docs/handoffs/2026-06-18-stage9-target-evidence-result.md` | Stage 9 approved target artifacts exist; Stage 10 approval packets remain readiness only until same-authority baseline artifacts exist. |
| Frontend visual proof metadata | `docs/specs/task-contract.schema.md`; `packages/task-contract/src/schema.ts` | `docs/product/target-adoption-playbook.md` for target-owned visual gates; `docs/product/evidence-matrix.md` for proof status | Visual metadata is contract/readiness only; never promote it to rendered proof, screenshot proof, Stage 9/10 evidence, or production proof without approved target artifacts. |
| Delegation/worktree protocol | `docs/product/subagent-contracts.md` | Official Codex subagent/worktree docs | Delegation remains human-approved isolated work, not a KRN swarm. |
| Evidence status | `docs/product/evidence-matrix.md` | Handoffs and raw run artifacts | Matrix records current proof status; do not promote local evidence to production proof. |
| Release-check and packaging boundary | `docs/specs/release-check.schema.md` | README and release-check artifacts | Release-check is local handoff evidence only, not package publication, plugin distribution, production readiness, or hook enforcement approval. |
| Extension backlog during this goal | This ledger; `docs/product/audit-consolidation-goal-2026-06-18.md` | `docs/product/next-implementation-backlog.md` | Keep EXT-001 through EXT-010 out of the general backlog until this goal closes. |

## Next Safe Slice

Recommended next slice: Stage 10 same-authority baseline comparison preparation.

Operator may resume with:

```text
APPROVED: Stage 10 same-authority comparison only.

Approval ref: operator-2026-06-18-stage10-raw-vs-krn-sibling-tasks.

Use korneliuszburian/marketing-intelligence-studio with two fresh isolated
clones from the same current remote main base commit.

Run one Raw Codex baseline and one Codex+KRN comparison using two equivalent
tiny non-UI sibling tasks in the same brief-template / review-gate task class.
Pre-register both task prompts, expected touched files, forbidden touched
files, target validation authority, success criteria, contamination risk, and
comparison dimensions before either run.

Raw baseline: no KRN task-spec, context package, review, report, bundle, memory,
or .krn artifact pipeline. Use repo instructions and target-owned validation
only.

KRN comparison: use krn run --task-spec ... --execute-verify --bundle with the
same target validation authority, structured boundaries, and
memory-9ea13b133ba2 only as reference-only context if task-relevant.

Do not push, merge, open PRs, mutate target main, touch protected data, broaden
verify allowlists, claim production proof/hook trust/CI proof/target-main
approval, or create screenshots, appshots, browser captures, dashboards,
vectors, MCP surfaces, subagent runs, publishing artifacts, or placeholder
evidence.
```

Owned areas:

- `docs/product/audit-consolidation-goal-2026-06-18.md` and this ledger for
  status only;
- Stage 10 baseline comparison packet drafts only after explicit operator
  approval;
- reuse `memory-9ea13b133ba2` only as reference-only context unless a later
  approved task explicitly re-audits target-workflow effect.

Acceptance:

- no new source surface before checking whether the goal can close after Stage
  10;
- EXT-003 source and first governed context-recall evidence are complete;
- Stage 9 local target evidence is complete;
- Stage 10 remains open until approved same-authority baseline artifacts exist;
- no generated screenshots, appshots, browser captures, or Codex-managed
  snapshots become proof.

Proof:

- `rg` for open evidence gates and forbidden proof claims;
- `git diff --check`;
- `git ls-files .krn .krn-harness`;
- `pnpm lint`;
- focused source tests only if code/schema changes occur.

Residual risk:

- the next real progress requires operator-approved same-authority comparison
  evidence; local source docs, memory recall proof, and Stage 9 local target
  proof cannot close Stage 10.

## Completion Gate Reminder

Do not mark the active goal complete until current evidence proves every
requirement in the completion audit. In particular, Stage 10 and comparative
target-workflow outcome evidence remain open.
