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
| EXT-005 Stage 10 comparison packet and target evidence | Local comparison evidence complete | `docs/product/target-adoption-playbook.md`, `docs/product/evidence-matrix.md`, `docs/handoffs/2026-06-18-stage10-raw-vs-krn-comparison.md` | Stage 10 records one approved Raw Codex vs Codex+KRN same-authority target comparison. It proves a narrow auditability/proof-discipline delta only, not production proof, hook trust, CI proof, target-main approval, memory outcome proof, faster delivery, or broad code-quality proof. |
| EXT-006 delegation worktree protocol | Source-side docs slice complete | `docs/product/subagent-contracts.md` | Safe delegation is one explicit request, one isolated checkout/worktree, one task contract, one approved run when allowed, one bundle, one review/handoff, one human decision. |
| EXT-003 governed memory usefulness | Source-side contract and first evidence packet complete | `docs/specs/memory.schema.md`, `docs/product/evidence-matrix.md`, `docs/handoffs/2026-06-18-ext003-memory-usefulness-proof.md` | One operator-approved wrapper-first target-validation memory moved pending to approved, surfaced in a later relevant context package as reference-only with provenance, and disappeared under Polish opt-out. This proves governed context recall, not Stage 9/10 target outcome. |
| EXT-007 static cockpit readiness | Source-side docs slice complete | `docs/product/operator-console.md`, `docs/product/evidence-matrix.md` | Cockpit/dashboard-lite remains a blocked local artifact-viewer contract with stable input, state-handling, protected-data, and no-source-of-truth preconditions. |
| EXT-008 codebase condensation pass | Source-side docs slice complete | This ledger | Canonical contract map points each new contract to one owner and marks raw audits/backlog references as secondary or historical. |
| EXT-009 packaging/distribution kill switch | Source-side docs slice complete | `docs/specs/release-check.schema.md`, `docs/product/evidence-matrix.md`, this ledger | Release-check, bundles, local CI, and local validation cannot authorize publishing, distribution, hosted dashboard, production runner, or hook enforcement claims. |
| EXT-010 frontend visual proof contract | Source-side schema/docs slice complete | `packages/task-contract/src/schema.ts`, `packages/cli/src/commands/start.ts`, `docs/specs/task-contract.schema.md`, `docs/product/target-adoption-playbook.md`, `docs/product/evidence-matrix.md` | UI-facing task specs can declare route/component, viewports, design constraints, a11y expectations, copy status, manual visual artifact, and target-owned visual command without creating browser/Figma/snapshot proof. |
| Stage 9 target evidence | Local target evidence complete | `docs/handoffs/2026-06-18-stage9-target-evidence-result.md` | Two approved, isolated, non-protected target product-code/test-code runs reached local verified/core verified through `krn run --task-spec ... --execute-verify --bundle`. This is not production proof, hook trust, CI proof, target-main approval, or Stage 10 comparison evidence. |
| EXT-011 build-time skill quality hardening | Source-side skill/docs slice complete | `.agents/skills/*`, `.agents/skills/README.md`, `docs/specs/build-time-skills.md` | Build-time skills now expose trigger/input/output/escalation/proof/condensation contracts as small workflow APIs grounded in official Codex skills guidance and condensed Matt Pocock skill patterns; no new skill, copied skill pack, giant router, runtime template, or XML cargo cult was added. |
| EXT-012 compaction continuation hook | Source/code slice complete | `packages/cli/src/continuation-state.ts`, `packages/cli/src/commands/hook.ts`, `packages/hooks/src/*`, `docs/specs/hooks-pack.md`, hook fixtures/tests | Official Codex `PreCompact` now writes local continuation state and `SessionStart` surfaces it as a restart anchor, while keeping hook trust unproven and `enforced: false`. |
| Stage 10 expected-file context hardening | Source/code slice complete | `packages/context/src/context-graph-selection.ts`, `packages/context/src/build-context-package.test.ts`, `docs/specs/context-package.schema.md`, `docs/product/evidence-matrix.md` | Expected-file-focused target tasks now suppress standalone graph doc-match noise while keeping task-contract expected files, explicit task paths, do-not-use paths, package-owned selectors, and base safety context. The Stage 10 isolated target context recheck dropped from 93 items/65 reference-only/high risk to 13 items/1 reference-only/medium risk. |
| Stage 10 wrapper safety boundary hardening | Source/code slice complete | `packages/cli/src/commands/review.ts`, `packages/cli/src/real-repo-review-summary.test.ts`, `docs/specs/task-contract.schema.md`, `docs/product/target-adoption-playbook.md` | Python `tools/*.py` target-validation wrappers now fail deterministic review when they omit limitations or unsafe conditions. This keeps wrapper-first adoption explicit without broadening verify allowlists. |

Still open:

- Stage 10 findings hardening: residual wrapper/config overhead remains open.
  Target-run release-check/report noise, expected-file context over-inclusion,
  and missing wrapper safety metadata have first source fixes.

## Evidence Request Queue

The remaining work is approval-gated evidence, not more source-side product
surface. After context loss, use this queue before creating new docs, commands,
tests, dashboards, browser proof, memory artifacts, or target runs.

| Gate | Required operator input before action | Canonical contract | Evidence that can close it | Do not do |
| --- | --- | --- | --- | --- |
| EXT-003 governed memory usefulness | Satisfied by 2026-06-18 operator approval for `memory-9ea13b133ba2`. | `docs/specs/memory.schema.md` | `docs/handoffs/2026-06-18-ext003-memory-usefulness-proof.md` records id, evidence path, pending-to-approved transition, relevant reference-only context, opt-out suppression, and `useful` decision for context recall. | Do not upgrade this to Stage 9/10 target outcome proof, production proof, hook trust, auto-approved memory, or semantic/vector memory. |
| Stage 9 target repeats | Satisfied by 2026-06-18 operator-approved isolated target runs. | `docs/product/target-adoption-playbook.md` | `docs/handoffs/2026-06-18-stage9-target-evidence-result.md` records both target runs, task specs, validation, changed files, proof boundaries, residual risks, and local-only status. | Do not upgrade Stage 9 to Stage 10 comparison evidence, production proof, hook trust, CI proof, target-main approval, or general adoption proof. |
| Stage 10 same-authority comparison | Satisfied by 2026-06-18 operator-approved raw-vs-KRN sibling target tasks. | `docs/product/target-adoption-playbook.md` | `docs/handoffs/2026-06-18-stage10-raw-vs-krn-comparison.md` records baseline actor/result/interventions/changed files, KRN run-result/bundle/review paths, outcome dimensions, `meaningfulDelta: true`, warnings, and proof boundaries. | Do not upgrade the narrow auditability/proof-discipline delta to productivity proof, code-quality proof, memory outcome proof, production proof, hook trust, CI proof, target-main approval, or market proof. |

If no owned source-hardening slice is justified by the recorded Stage 10
findings or EXT-011, keep the goal active and report the exact missing decision.
Do not create placeholder evidence or rerun Stage 9/10 just to make progress.

## Stage 9 Result

Stage 9 is closed only as local target evidence. The canonical closeout is
`docs/handoffs/2026-06-18-stage9-target-evidence-result.md`.

Recorded targets:

- `korneliuszburian/krn-llm-wiki` in isolated `/tmp` clone with
  `python3 tools/check_all_readonly.py` as target-owned full-suite validation.
- `korneliuszburian/marketing-intelligence-studio` in isolated `/tmp` clone
  with `python3 tools/krn_stage9_check_brief_templates.py` as target-owned
  fast-quality-gate validation.

This proves two approved local target runs only. It does not prove production
readiness, hook trust, CI, target-main approval, general adoption, memory
outcome impact, or Raw Codex vs Codex+KRN delta.

## Stage 10 Result

Stage 10 is closed only as local comparison evidence. The canonical closeout is
`docs/handoffs/2026-06-18-stage10-raw-vs-krn-comparison.md`.

Recorded comparison:

- target: `korneliuszburian/marketing-intelligence-studio`
- base commit: `24197d255adaf8493887b2f6cb345990d1cc268d`
- comparisonId: `stage10-marketing-brief-template-metadata-20260618-204345`
- raw path: `/tmp/krn-20260618-stage10-204345/raw-codex`
- KRN path: `/tmp/krn-20260618-stage10-204345/krn-codex`
- raw baseline: deterministic `template_content_type` metadata plus focused
  test, no KRN artifacts, target-owned ruff/pytest validation passed
- Codex+KRN: deterministic `template_recommended_action` metadata plus focused
  test, local wrapper/config overhead, `krn run --task-spec ... --execute-verify
  --bundle` reached `verified`
- KRN proof boundary: `productionProof: false`, `hookTrustStatus: unproven`,
  config/productCode proof scopes `verified-local`, fixture proof
  `not-indicated`
- meaningfulDelta: `true` only for auditability/proof discipline

Follow-up findings:

- current verify policy creates wrapper/config overhead for Python targets;
- review correctly warned on fast-quality-gate rather than full-suite coverage;
- context package over-inclusion risk was high; a follow-up source fix now
  suppresses standalone graph doc-match noise for expected-file target tasks and
  reduced the Stage 10 isolated target context recheck from high to medium risk;
- release-check/report output was noisy in non-source target runs; a follow-up
  source fix now classifies approved isolated target runs as source-release
  not-applicable warning evidence instead of source-release blockers;
- wrapper commands can become proof theater if they omit limitations or unsafe
  conditions; a follow-up source fix now makes deterministic review fail
  `python3 tools/*.py` target-validation wrappers that omit either field;
- no governed memory item appeared in the target context package, so memory
  outcome impact remains unproven.

This does not prove faster delivery, better code quality, broad adoption,
production readiness, hook trust, CI trust, target-main approval, memory outcome
impact, or market/category superiority.

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
- https://developers.openai.com/codex/learn/best-practices
- https://developers.openai.com/codex/use-cases/reusable-codex-skills

Use external skill-engineering references only after condensation. Current
inspiration for EXT-011 is Matt Pocock's public skills repo, especially its
small/composable workflow shape and user-invoked versus model-invoked split:
https://github.com/mattpocock/skills. Do not copy those skills wholesale and do
not add XML/tagged structures unless they make a KRN skill contract clearer.

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
| Governed memory | `docs/specs/memory.schema.md` | `docs/product/evidence-matrix.md` for proof status; Codex personal `MEMORY.md` is outside KRN truth | First governed context-recall usefulness proof exists; Stage 9 reused the approved wrapper-first memory only as reference-only workflow guidance; Stage 10 target context had `memoryItems: 0`, so target-workflow outcome impact remains unproven. |
| Daily ledger and static cockpit readiness | `docs/product/operator-console.md`; ADR-0014 for dashboard-lite boundary | Operator-summary/report specs as input contracts | Keep cockpit as artifact-viewer readiness, not implementation. |
| Stage 9/10 target adoption and comparison | `docs/product/target-adoption-playbook.md` | `docs/product/evidence-matrix.md` for proof status; `docs/handoffs/2026-06-18-stage9-target-evidence-result.md`; `docs/handoffs/2026-06-18-stage10-raw-vs-krn-comparison.md` | Stage 9 approved target artifacts exist; Stage 10 local comparison evidence exists with narrow delta and follow-up findings. |
| Frontend visual proof metadata | `docs/specs/task-contract.schema.md`; `packages/task-contract/src/schema.ts` | `docs/product/target-adoption-playbook.md` for target-owned visual gates; `docs/product/evidence-matrix.md` for proof status | Visual metadata is contract/readiness only; never promote it to rendered proof, screenshot proof, Stage 9/10 evidence, or production proof without approved target artifacts. |
| Delegation/worktree protocol | `docs/product/subagent-contracts.md` | Official Codex subagent/worktree docs | Delegation remains human-approved isolated work, not a KRN swarm. |
| Build-time skills | `.agents/skills/*`; `.agents/skills/README.md` | Official Codex skills docs; Matt Pocock skills repo as historical/external inspiration only | Keep skills small, triggerable, scoped, and proof-oriented. Improve them from observed KRN failure modes, not broad taste. |
| Compaction continuation | `packages/cli/src/continuation-state.ts`; `packages/cli/src/commands/hook.ts`; `packages/hooks/src/*`; `docs/specs/hooks-pack.md`; hook fixtures/tests; this ledger | Official Codex hooks docs for `PreCompact` and `SessionStart`; `.krn/current/continuation-state.*` as runtime-local artifact | Persist restart state before compaction and surface it on session start without claiming hook trust or security enforcement. |
| Evidence status | `docs/product/evidence-matrix.md` | Handoffs and raw run artifacts | Matrix records current proof status; do not promote local evidence to production proof. |
| Release-check and packaging boundary | `docs/specs/release-check.schema.md` | README and release-check artifacts | Release-check is local handoff evidence only, not package publication, plugin distribution, production readiness, or hook enforcement approval. |
| Extension backlog during this goal | This ledger; `docs/product/audit-consolidation-goal-2026-06-18.md` | `docs/product/next-implementation-backlog.md` | Keep EXT-001 through EXT-012 out of the general backlog until this goal closes. |

## Next Safe Slice

Recommended next slice: residual Stage 10 wrapper/config overhead measurement.

Operator may resume with:

```text
APPROVED: source hardening from residual Stage 10 wrapper/config overhead only.

Start from current HEAD. Do not rerun Stage 9 or Stage 10 unless a later
operator prompt explicitly asks for a new target comparison.

First inspect:
- docs/handoffs/2026-06-18-stage10-raw-vs-krn-comparison.md
- docs/product/audit-consolidation-goal-2026-06-18.md
- docs/product/evidence-matrix.md

Allowed slices:
1. Continue measuring Python wrapper/config overhead before broadening any
   verify policy. Do not add another source change unless a remaining overhead
   finding is concrete and testable.

Do not add dashboards, MCP, vectors, subagent runtime, browser proof,
screenshots, appshots, publishing, broad verify allowlists, production proof,
hook trust, CI proof, target-main approval, copied external skills, or a giant
skill router.
```

Owned areas:

- `docs/product/audit-consolidation-goal-2026-06-18.md` and this ledger for
  status only;
- source files directly tied to the selected Stage 10 finding;
- `.agents/skills/*` only for EXT-011;
- reuse `memory-9ea13b133ba2` only as reference-only context unless a later
  approved task explicitly re-audits target-workflow effect.

Acceptance:

- no new product surface before hardening the recorded Stage 10 findings;
- EXT-003 source and first governed context-recall evidence are complete;
- Stage 9 local target evidence is complete;
- Stage 10 local comparison evidence is complete;
- Stage 10 expected-file context high-risk over-inclusion has a first source
  fix and isolated target recheck;
- Stage 10 wrapper safety metadata has a first deterministic review fix;
- no generated screenshots, appshots, browser captures, or Codex-managed
  snapshots become proof.

Proof:

- `rg` for open evidence gates and forbidden proof claims;
- `git diff --check`;
- `git ls-files .krn .krn-harness`;
- `pnpm lint`;
- focused source tests only if code/schema changes occur.

Residual risk:

- the next real progress must reduce or explicitly bound residual Stage 10
  wrapper/config friction; local comparison evidence must not be overclaimed as
  broad product superiority.

## Completion Gate Reminder

Do not mark the active goal complete until current evidence proves every
requirement in the completion audit. Stage 10 local comparison evidence,
EXT-011 source-side skill hardening, expected-file context high-risk hardening,
and wrapper safety boundary hardening exist, but residual Stage 10
wrapper/config overhead follow-up remains open.
