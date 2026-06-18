# Audit Consolidation Goal 2026-06-18

Continuation ledger:
`docs/product/audit-consolidation-continuation.md`.

## Mission

Convert the two original external audits in `docs/audits/01-audit.md.txt` and
`docs/audits/02-audit.txt` into one repo-verified execution goal, and keep any
later raw audit inputs classified before they influence the active roadmap.

The goal is not to add product surface. The goal is to make the current KRN
Harness direction sharper: `krn run -> run-result -> run-bundle` remains the
primary operator workflow, proof claims stay honest, and every improvement maps
to actual repo truth or recorded target-adoption friction.

## Current Baseline

- Original consolidation baseline inspected: `b8ee7e1` on `main`.
- Worktree is dirty. Source-owned audit consolidation changes currently span
  build-time skills, product docs, specs, CLI/task-contract code, and docs
  regression tests.
- Root `GOAL.md` is a pointer only. Historical root-level inputs are quarantined
  in `docs/audit/raw/`.
- `docs/audits/*`, `docs/audit/new-audit-*.md`, and `docs/audit/raw/*` are raw
  audit inputs, not active product truth by themselves.
- No active `.agents/skills/grill-with-docs/` directory is present in the
  current workspace; Stage 4 resolved it by keeping `$kanon`, `$pilnuj`, and
  `$review` as the accepted replacement lanes.
- Current active docs already define KRN as a local Codex-first runtime/control
  layer, not a prompt pack, dashboard, generic multi-agent framework, or
  production proof system.
- Current proof state remains local only: `productionProof` is false and hook
  trust remains unproven.

## Non-Negotiable Rules

- Keep `krn run --task-spec ... --execute-verify --bundle` as the primary
  workflow.
- Do not add new top-level CLI commands.
- Do not add new bundle variants or bundle commands.
- Do not build dashboard, MCP server, vector DB, embeddings, autonomous
  subagents, publishing, GitHub Action, browser evidence, production runner, or
  hook-trust features inside this goal.
- Do not claim production proof from local evidence.
- Do not claim hook trust without a separate approved non-bypass proof goal.
- Do not commit `.krn` runtime artifacts.
- Do not touch protected data or protected target paths.
- Do not push or merge target repositories unless a later goal carries explicit
  approval.
- Do not convert raw audit prose directly into canon. First classify each claim
  against current repo truth.
- Do not turn root-level operator scratch files into active truth. Keep root
  `GOAL.md` as a pointer; put local scratch in ignored `GOAL.local.md` or
  historical raw input under `docs/audit/raw/` only after explicit approval.
- Prefer docs/spec/tests around existing workflows before any runtime code.
- Every accepted change must have a validation command and a residual-risk note.

## Audit Claim Matrix

Sources:
- `A1`: `docs/audits/01-audit.md.txt`
- `A2`: `docs/audits/02-audit.txt`

Stage 1 classification status values:
`ACTIVE_TRUE`, `MOSTLY_DONE`, `CONFIRMED_GAP`, `DIRTY_WORKTREE_DECISION`,
`GATED`, `REJECTED`, `OUTDATED`.

| ID | Source | Audit claim | Status | Current repo evidence | Stage 1 decision / next action |
| --- | --- | --- | --- | --- | --- |
| AC-001 | A1, A2 | KRN should stay a Codex-first local runtime/control layer, not a prompt pack, dashboard-first product, generic multi-agent framework, or production system. | ACTIVE_TRUE | `AGENTS.md`; `docs/product/mvp-state.md`; `docs/product/p0-p1-decision.md`; `docs/product/p1-entry-contract.md`; `docs/product/evidence-matrix.md`. | Preserve as active product identity. No extra doc change needed outside this matrix. |
| AC-002 | A1, A2 | The product center should remain `krn run -> run-result -> run-bundle`; supporting/plumbing commands must not become the operator ritual. | ACTIVE_TRUE | `docs/product/mvp-state.md`; `docs/specs/run-result.schema.md`; `docs/product/target-adoption-playbook.md`; `docs/product/evidence-matrix.md`. | Future goals must strengthen `krn run` or its evidence semantics, not add side surfaces. |
| AC-003 | A1, A2 | Proof taxonomy is a core strength: fixture proof, local target proof, config adoption proof, product-code proof, Codex exec proof, no production proof, and hook trust unproven must stay distinct. | ACTIVE_TRUE | `docs/product/evidence-matrix.md`; `docs/product/mvp-state.md`; `docs/specs/run-result.schema.md`; `packages/cli/src/run-result-builder.ts`; `docs/specs/codex-exec-evidence-pack.md`. | Preserve taxonomy. Reject wording that upgrades local evidence into production proof or hook trust. |
| AC-004 | A1, A2 | KRN v0.1 local proof threshold is crossed, but it is not a production runtime or market/category breakthrough yet. | ACTIVE_TRUE | `docs/product/mvp-state.md`; `docs/product/p0-p1-decision.md`; `docs/product/evidence-matrix.md`. | Keep release language at local tool candidate level until stronger external proof exists. |
| AC-005 | A1, A2 | Supporting artifacts can become theater; review, summary, report, release-check, and bundle may overproject the value of a run. | MOSTLY_DONE | `docs/product/evidence-matrix.md`; `docs/specs/run-result.schema.md`; `packages/cli/src/run-result-builder.ts`; `packages/cli/src/run-command.test.ts`. | Stage 7 tightened run-core semantics and supporting projection wording. Keep report/release-check as supporting evidence only; no report/bundle variants were added. |
| AC-006 | A1 | CLI surface is larger than the product center, but current docs frame non-run commands as diagnostics/plumbing. | ACTIVE_TRUE | `docs/product/mvp-state.md`; `docs/specs/run-result.schema.md`; `README.md`. | No new top-level commands in this consolidation goal. Examples should continue to route through `krn run`. |
| AC-007 | A1, A2 | Task-spec boundaries are still partly prose: validation authority, rollback, no-push, no-merge, and target approval need clearer structure. | MOSTLY_DONE | `packages/task-contract/src/schema.ts`; `docs/specs/task-contract.schema.md`; `packages/cli/src/commands/review.ts`; `packages/task-contract/src/build-contract.test.ts`; `packages/cli/src/real-repo-review-summary.test.ts`. | Stage 6 added structured target-run boundaries and deterministic review checks. Future boundary additions require a new target finding. |
| AC-008 | A1, A2 | Verify allowlist is safer than shell execution, but it creates Python/native target wrapper friction and can turn wrappers into proof theater. | MOSTLY_DONE | `docs/adr/ADR-0017-verify-execute-policy.md`; `docs/product/adoption-friction-register.md`; `docs/product/target-adoption-playbook.md`; `docs/specs/task-contract.schema.md`. | Stage 5 added Target Validation Contract v0 and wrapper limits without broadening verify policy, shell execution, or arbitrary target commands. |
| AC-009 | A1, A2 | Existing product-owned `.krn/` directories can collide with KRN runtime storage. | MOSTLY_DONE | `docs/product/mvp-state.md`; `docs/product/adoption-friction-register.md`; `docs/product/target-adoption-playbook.md`; runtime-dir evidence in `docs/product/evidence-matrix.md`. | Keep `runtime.dir` and adoption playbook guidance. No Stage 1 code or target repo work. |
| AC-010 | A1, A2 | Protected-looking paths listed as do-not-use boundaries must not be misread as active protected context. | MOSTLY_DONE | `docs/product/adoption-friction-register.md`; `docs/specs/task-contract.schema.md`; `docs/product/target-adoption-playbook.md`; `docs/specs/graph-lite.md`. | Preserve declared-exclusion vs active-context distinction in future review/task-spec work. |
| AC-011 | A1, A2 | Graph-lite/context package can be overread as full repo understanding; it is shallow deterministic assistance only. | ACTIVE_TRUE | `docs/specs/graph-lite.md`; `docs/product/evidence-matrix.md`; `docs/product/p0-p1-decision.md`. | Context hardening must come only from recorded real-target findings. Vector, embeddings, AST, callgraph, and dataflow remain out of scope. |
| AC-012 | A1, A2 | `$review` can become ritual unless it catches real missing evidence or overclaim risk. | MOSTLY_DONE | `docs/product/reviewers.md`; `.agents/skills/review/SKILL.md`; `packages/cli/src/commands/review.ts`; `packages/cli/src/real-repo-review-summary.test.ts`. | Stage 2 narrowed `$review` to deterministic local-artifact closeout and added missing-boundary/overclaim checks; no model reviewer or auto-fixer was added. |
| AC-013 | A1, A2 | Build-time skills help only if each has a distinct job; overlapping skills become ceremony. | MOSTLY_DONE | `.agents/skills/README.md`; `.agents/skills/{buduj,kanon,pilnuj,wycinek,handoff,review}/SKILL.md`; `docs/product/next-implementation-backlog.md`. | Stage 3 tightened required skill scopes and stop conditions. No new build-time skill was added by hand. |
| AC-014 | A1, A2 | `grill-with-docs` needs a decision before it becomes hidden canon. | MOSTLY_DONE | `git status --short --branch`; no active `.agents/skills/grill-with-docs/` directory; `.agents/skills/README.md`; `docs/product/next-implementation-backlog.md`. | Stage 4 resolved this by keeping `$kanon`, `$pilnuj`, and `$review` as replacement lanes instead of promoting a new overlapping skill. |
| AC-015 | A1, A2 | Raw Codex exec evidence retention trades privacy for reproducibility; committed packs must stay sanitized and labeled. | ACTIVE_TRUE | `docs/specs/codex-exec-evidence-pack.md`; `docs/product/evidence-matrix.md`. | Keep raw JSONL/stderr out of committed evidence and keep reproducibility limits explicit. |
| AC-016 | A1, A2 | More real product-code repeats are needed before broader adoption claims. | CONFIRMED_GAP | `docs/product/mvp-state.md`; `docs/product/evidence-matrix.md`; `docs/product/next-implementation-backlog.md`; `docs/product/target-adoption-playbook.md`. | Route to Stage 9 after friction hardening. No target repos are touched in Stage 1. |
| AC-017 | A1, A2 | KRN needs measured outcome delta against a simpler baseline such as Codex/Claude plus worktree discipline and target-native tests. | CONFIRMED_GAP | `docs/product/next-implementation-backlog.md`; `docs/product/evidence-matrix.md`. | Route to Stage 10. Do not build a dashboard or marketing benchmark to answer this. |
| AC-018 | A1, A2 | Adoption should be measured by targets, repeats, wrapper count, false positives, and whether bundles changed operator decisions. | CONFIRMED_GAP | `docs/product/adoption-friction-register.md`; `docs/product/evidence-matrix.md`; `docs/product/next-implementation-backlog.md`. | Treat as part of Stage 10 delta measurement and later adoption reports, not a new CLI surface. |
| AC-019 | A1, A2 | Protected-data and prompt-injection boundaries matter because local tools, private data, untrusted content, and egress can combine unsafely. | ACTIVE_TRUE | `docs/product/target-adoption-playbook.md`; `docs/product/p1-entry-contract.md`; `docs/specs/graph-lite.md`; `docs/adr/ADR-0017-verify-execute-policy.md`. | Preserve no protected-data, no network verify, and safe target-selection rules. No protected target paths are touched. |
| AC-020 | A1, A2 | Build dashboard, MCP server, vector DB, embeddings, autonomous subagents, publishing, browser evidence, production runner, or extra bundle variants now. | REJECTED | `AGENTS.md`; `docs/product/mvp-state.md`; `docs/product/p0-p1-decision.md`; `docs/product/p1-entry-contract.md`; `docs/product/evidence-matrix.md`. | Rule violated by building them now: P0/P1 non-goals and this goal's non-negotiables. Keep ADR/contract-only lanes where already accepted. |
| AC-021 | A1, A2 | Claim hook templates or manual hook probes as hook enforcement/trust. | REJECTED | `docs/specs/hooks-pack.md`; `docs/product/p1-entry-contract.md`; `docs/product/mvp-state.md`; `docs/product/evidence-matrix.md`. | Rule violated by claiming trust now: hook trust requires a separate approved non-bypass proof goal. |
| AC-022 | A1, A2 | Claim local target runs, config adoption, Codex exec packs, reports, or release-checks as production proof. | REJECTED | `docs/product/mvp-state.md`; `docs/specs/run-result.schema.md`; `packages/cli/src/run-result-builder.ts`; `docs/specs/codex-exec-evidence-pack.md`. | Rule violated by claiming production proof now: current evidence is local only and `productionProof` remains false. |
| AC-023 | A1, A2 | Broaden verify with shell mode, network commands, destructive commands, broad allowlists, or arbitrary target commands. | REJECTED | `docs/adr/ADR-0017-verify-execute-policy.md`; `packages/verify/src/command-policy.ts`; `docs/product/target-adoption-playbook.md`. | Rule violated by adding them now: verify is evidence, not a sandbox. Handle target validation through a narrow contract slice. |
| AC-024 | A2 | Durable runtime semantics such as checkpointing, interrupt/resume, and Codex session ownership are not implemented and should not be overclaimed. | GATED | `docs/adr/ADR-0020-run-interrupt-resume-contract.md`; `docs/specs/run-result.schema.md`; `docs/product/mvp-state.md`. | Future implementation needs explicit approval and must stay under `krn run`; top-level `krn resume` remains unapproved. |
| AC-025 | A2 | LLM reviewer/judge, external observability, and richer eval systems may be useful later but would add model/external/dependency surface. | GATED | `docs/product/external-audit-triage-2026-06-16.md`; `docs/product/reviewers.md`; `docs/product/p1-entry-contract.md`; `docs/product/evidence-matrix.md`. | Require separate ADR/approval and deterministic local baselines first. No model-based reviewer is added here. |

Stage 1 contradiction check:

- Current active docs already agree that KRN is local evidence only, with
  `productionProof: false`, hook trust unproven, and `krn run` as the primary
  workflow.
- The only Stage 1 contradiction was inside this goal document: the matrix used
  loose decisions such as "Preserve" and "Watch" instead of the required tracked
  status values and evidence pointers.
- No other active doc was changed in Stage 1 because no accepted claim required
  a truth correction outside this matrix.

## Canonical Goal

```text
/goal Consolidate external audits into a repo-verified hardening roadmap for
KRN Harness. Start from current source HEAD or newer. Use the two raw audits as
inputs, but let current repo truth decide which claims are active, outdated,
done, gated, or rejected.

Mission:
Make the repo materially stronger as a Codex-first local control layer without
expanding product surface. Keep `krn run --task-spec ... --execute-verify
--bundle` as the primary workflow. Strengthen proof semantics, review value,
target validation boundaries, task-spec boundaries, and adoption playbooks only
where current repo truth or recorded real-target friction justifies it.

Completion:
- every major audit claim is classified against current repo truth;
- accepted work maps to a recorded adoption friction, proof gap, or active doc
  contradiction;
- no new top-level CLI command is added;
- no dashboard, MCP, vector DB, subagent framework, publishing, hook-trust claim,
  production proof claim, or bundle variant is added;
- validation passes for every source change;
- runtime artifacts and protected data are not committed;
- remaining unproven areas are explicit.
```

## Execution Order

### Stage 0: Snapshot And Ownership

Purpose: prevent dirty-worktree confusion before changing source truth.

Owned areas:
- this goal document;
- later, only the files explicitly assigned by each stage.

Required checks:
- `git status --short --branch`;
- current `HEAD`;
- list untracked audit/goal/skill files.

Acceptance:
- dirty files are classified as source-owned, operator scratch, or blocked;
- no existing dirty file is reformatted or absorbed silently.

Stop if:
- a dirty file is required but cannot be safely owned;
- the user has conflicting local changes in the same target file.

Stage 0 result:

- Current HEAD is `b8ee7e1` on `main`.
- Dirty source-owned areas are the audit consolidation slices already listed in
  `git status`; operator scratch files remain unowned unless explicitly
  assigned.
- No runtime artifacts are tracked under `.krn/` or `.krn-harness/`.

### Stage 1: Audit Claim Triage

Purpose: turn the two raw audits into a tracked claim matrix, not a prose dump.

Owned areas:
- `docs/product/audit-consolidation-goal-2026-06-18.md`;
- optionally a future concise triage file if this goal becomes too long.

Acceptance:
- every important audit claim is classified as one of:
  `ACTIVE_TRUE`, `MOSTLY_DONE`, `CONFIRMED_GAP`, `DIRTY_WORKTREE_DECISION`,
  `GATED`, `REJECTED`, or `OUTDATED`;
- each accepted claim points to current repo evidence;
- rejected claims state the rule they violate.

Validation:
- `pnpm lint`;
- `pnpm --silent vitest run packages/evals/src/docs-regression.test.ts`;
- `git diff --check`.

Stage 1 result:

- The raw audits are represented by the claim matrix above.
- Accepted, rejected, gated, and mostly-done claims point at current repo
  evidence instead of raw audit prose.
- Raw audit files remain inputs, not active canon by themselves.

### Stage 2: Review Closeout Value Proof

Purpose: make `$review` useful or reduce its ceremony.

Owned areas:
- `.agents/skills/review/SKILL.md`;
- `docs/product/reviewers.md`;
- focused CLI review tests only if needed.

Acceptance:
- `$review` is used on one real KRN source slice before completion;
- output cites exact task, verify, git, and artifact paths;
- it catches a real missing-evidence or overclaim risk, or records that no added
  value was observed;
- review remains deterministic and local-artifact-only.

Forbidden:
- no model-based reviewer;
- no auto-fixer;
- no replacement for human PR review;
- no production or hook trust claim.

Validation:
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- one `krn run --task-spec ... --execute-verify --bundle` smoke if runtime
  behavior changes.

Stage 2 result:

- `$review` is scoped as deterministic local-artifact review, not human PR
  review replacement, model judge, auto-fixer, production proof, or hook trust.
- Deterministic review now catches target-run missing-evidence risks such as
  missing touched-file, rollback, no-push, no-merge, target-approval,
  approval-reference, target-isolation, and protected-data boundaries.
- Review remains a closeout check on recorded artifacts rather than a new
  product surface.

### Stage 3: Core Skill Scope Tightening

Purpose: reduce overlapping build-time skill triggers.

Owned areas:
- `.agents/skills/{buduj,kanon,pilnuj,wycinek,handoff,review}/SKILL.md`;
- `.agents/skills/README.md`.

Acceptance:
- each core skill has one job-to-be-done;
- each has explicit "use when", "do not use when", expected output, and stop
  condition;
- no skill becomes a product manual;
- no new build-time skill is added by hand.

Forbidden:
- no runtime/downstream skill changes unless separately approved;
- no large skill pack;
- no broad rewrite of existing skill language.

Validation:
- `$skill-creator` validation if available;
- `pnpm lint`;
- `git diff --check`.

Stage 3 result:

- Core build-time skills now have explicit job boundaries, negative scope, stop
  conditions, and expected output shapes.
- No runtime/downstream skill template was changed by this stage.
- No new build-time skill was added by hand.

### Stage 4: Decide `grill-with-docs`

Purpose: document the decision for the former scratch skill before it becomes
hidden canon.

Owned areas:
- `.agents/skills/grill-with-docs/` only if explicitly owned by this stage;
- `.agents/skills/README.md`;
- `docs/product/next-implementation-backlog.md`.

Allowed outcomes:
- merge the useful adversarial-docs checks into `$review`;
- quarantine it as research/non-core inspiration;
- rewrite it as a KRN-specific planning grill with no missing references;
- delete it from source if it only duplicates `$review + $kanon + $pilnuj`.

Acceptance:
- exactly one outcome is chosen;
- source truth no longer contradicts the dirty worktree;
- no new workflow is promoted without a unique trigger and output contract.

Forbidden:
- no new ritual skill with overlapping scope;
- no generic domain-model template copied into KRN as active truth;
- no references to missing support files.

Stage 4 result:

- `grill-with-docs` was removed from active build-time skill discovery instead
  of being promoted as hidden canon.
- The decision was not that the adversarial-docs idea was bad. The decision was
  that a separate active skill duplicated existing KRN lanes and referenced
  missing support formats.
- Useful pressure from that idea is covered by `$kanon` for canon/spec/ADR
  distillation, `$pilnuj` for scope classification, and `$review` for evidence
  closeout.
- No active `.agents/skills/grill-with-docs/` directory is present in the
  current workspace.

### Stage 5: Target Validation Contract v0

Purpose: address the highest-value adoption friction without unsafe execution.

Owned areas:
- `docs/product/target-adoption-playbook.md`;
- `docs/product/adoption-friction-register.md`;
- docs/spec or tests only if the slice requires them.

Minimal model:

```text
targetValidation:
  authority: target-owned
  command: <allowlisted command or wrapper>
  coverage: full-suite | fast-quality-gate | smoke | lint-only
  reason: <why this gate is authoritative for this task>
  limitations: [...]
  unsafeIf: [...]
```

Acceptance:
- Python wrapper use is either explicitly accepted with limits or flagged as an
  evidence smell;
- full-suite failure vs fast gate pass is represented honestly;
- `run-result` and review wording cannot imply full-suite proof when only a
  fast gate ran.

Forbidden:
- no shell mode;
- no broad allowlist;
- no arbitrary `python3 -m pytest` approval without policy;
- no network/destructive commands;
- no target push/merge.

Validation:
- `pnpm lint`;
- `pnpm test` if schema/runtime behavior changes;
- targeted tests for any policy change.

Stage 5 result:

- `boundaries.targetValidation` carries validation authority, command,
  coverage, rationale, limitations, and unsafe conditions for target-run proof.
- Python wrapper use is accepted only as a narrow target-owned adapter with
  explicit coverage and limitations.
- No shell mode, broad allowlist, arbitrary target command approval, target
  push, or target merge was added.

### Stage 6: Task-Spec Boundary Hardening

Purpose: move critical operational boundaries out of prose where justified.

Candidate structured boundaries:
- validation command and coverage;
- rollback boundary;
- no-push boundary;
- no-merge boundary;
- target approval boundary;
- protected data boundary;
- expected touched files and forbidden paths.

Acceptance:
- task specs can express the boundaries needed by real target adoption proof;
- review can detect overclaim or boundary violation;
- invalid specs produce path-aware failures;
- docs distinguish "required now" from "future schema candidate".

Forbidden:
- no auto-rollback;
- no GitHub merge bot;
- no target mutation without approval;
- no new CLI command;
- no bundle variant.

Validation:
- task-contract schema tests if code changes;
- CLI current-flow tests if `krn run` parsing changes;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`.

Stage 6 result:

- Task specs can carry expected touched files, forbidden touched files,
  rollback, no-push, no-merge, target approval, approval reference,
  target isolation, protected-data exclusion, and target-validation boundaries.
- Deterministic review fails target-validation proof specs that omit required
  target-run boundaries.
- Boundary automation remains out of scope: no auto-rollback, push, merge, or
  target mutation approval was added.

### Stage 7: Run-Core Semantics Tightening

Purpose: keep supporting surfaces from becoming the hidden verdict.

Owned areas:
- `docs/specs/run-result.schema.md`;
- `packages/cli/src/run-result-builder.ts`;
- run-result/report/release-check tests only if needed.

Acceptance:
- core verdict fields are distinguishable from supporting projection fields;
- warning/blocker propagation has tests;
- downstream source release-check failure stays explicitly non-blocking for
  target runs where appropriate;
- operator-facing text cannot overread report/release-check as production
  release readiness.

Forbidden:
- no dashboard;
- no new report mode;
- no bundle variant;
- no weakening of verify status semantics.

Stage 7 result:

- `run-result` now separates aggregate `status` from `coreStatus`.
- `supportingProjection` records report and release-check projection metadata.
- Downstream source release-check failure can stay visible and non-blocking
  while core target verification remains `verified`.
- Operator-facing run/report text says report and release-check are local
  projection evidence, not production release readiness.

### Stage 8: Context Noise From Real Targets

Purpose: improve context selection only from observed failures.

Owned areas:
- `docs/product/adoption-friction-register.md`;
- context selection code/tests only for a recorded finding.

Acceptance:
- each context fix maps to a real target finding;
- tests cover under-selection, over-selection, or stale-doc leakage;
- graph-lite remains explicitly shallow.

Forbidden:
- no vector DB;
- no embeddings dependency;
- no AST/callgraph/dataflow engine;
- no Tree-sitter rewrite;
- no semantic ranking without ADR and evidence.

Stage 8 result:

- No new selector or ranking logic was added.
- `docs/product/adoption-friction-register.md` records the real
  `krn-llm-wiki` raw/wiki-governance noise pattern.
- Existing context regressions cover stale-doc leakage, context-poisoning
  suspect docs, raw/wiki do-not-use boundaries, and product-code source/test
  localization.
- Graph-lite remains shallow deterministic evidence.

### Stage 9: More Real Product-Code Repeats

Purpose: increase real target confidence after friction hardening.

Acceptance:
- at least two additional tiny isolated real target product-code/test-code tasks
  are run through `krn run --task-spec ... --execute-verify --bundle`;
- target repos are non-protected and isolated;
- each task has expected touched files, forbidden paths, validation, rollback,
  no-push, no-merge, target isolation, target approval,
  approval-reference, and protected-data exclusion boundaries;
- each result states fixture/config/product-code proof status;
- no target push, target merge, production proof, or hook trust claim is made.

Forbidden:
- no protected data;
- no target main push;
- no direct production claim;
- no hook trust claim.

Current Stage 9 audit:

- Existing evidence proves one isolated real target product-code/checker run:
  `docs/handoffs/2026-06-15-real-target-krn-run-product-code-proof.md`.
- Existing evidence also proves one `marketing-intelligence-studio` fast
  quality-gate repeat and one `krn-ai-os` runtime-dir proof, but those are not
  two additional post-hardening product-code/test-code mutation tasks.
- 2026-06-18 update: Stage 9 is now satisfied by two approved, non-protected,
  isolated target product-code/test-code tasks run with structured boundaries
  and `krn run --task-spec ... --execute-verify --bundle`.
- Evidence lives in
  `docs/handoffs/2026-06-18-stage9-target-evidence-result.md`.
- Target A: `korneliuszburian/krn-llm-wiki`, isolated path
  `/tmp/krn-stage9-llm-wiki-20260618-214155`, base commit
  `19e6f220b8d05fcf3e2947a8d48116c5d953e8ca`, task spec
  `.krn/local/stage9-llm-wiki-status-safety-boundaries.json`, run status
  `verified`, verify `pass`/`execute`, target validation
  `python3 tools/check_all_readonly.py`, coverage `full-suite`.
- Target B: `korneliuszburian/marketing-intelligence-studio`, isolated path
  `/tmp/krn-stage9-marketing-intelligence-studio-20260618-214155`, base commit
  `24197d255adaf8493887b2f6cb345990d1cc268d`, task spec
  `.krn-harness/local/stage9-marketing-brief-review-gate.json`, run status
  `verified`, verify `pass`/`execute`, target validation
  `python3 tools/krn_stage9_check_brief_templates.py`, coverage
  `fast-quality-gate`.
- Both runs kept `productionProof: false` and `hookTrustStatus: unproven`; no
  target push, merge, PR, protected-data access, browser evidence, screenshot,
  appshot, dashboard, vector, MCP, subagent, publishing, or Stage 10 baseline
  run was performed.
- Source-side preflight hardening is in place: deterministic review fails
  `boundaries.targetValidation` task specs that omit expected touched files,
  forbidden touched files, rollback, no-push, no-merge, target approval, an
  approval reference, target isolation, or protected-data exclusion.
- Source-side proof-scope hardening is in place: `run-result` now states
  fixture, config, and product-code local proof-scope status, without promoting
  local evidence to production proof, hook trust, CI, or target-main approval.

### Stage 10: Delta Measurement Against Simpler Baseline

Purpose: answer whether KRN improves outcomes, not just artifacts.

Baseline:
- Codex or Claude Code with isolated worktree;
- target-native validation;
- minimal repo instructions;
- no KRN artifact pipeline.

KRN comparison:
- same task class where feasible;
- `krn run --task-spec ... --execute-verify --bundle`;
- same target validation authority.

Measured dimensions:
- success/failure;
- verify pass/fail;
- retry burden;
- operator interventions;
- missing-context incidents;
- scope violations;
- protected-path incidents;
- false done or overclaim events;
- validation clarity;
- operator confidence;
- review time/usefulness;
- artifact auditability;
- memory reuse;
- repeated mistakes avoided or repeated;
- frontend defects found or missed when UI-facing;
- time to auditable proof.

Acceptance:
- if KRN shows meaningful delta, record the exact dimension;
- if not, narrow product scope instead of adding surfaces.

Forbidden:
- no marketing benchmark;
- no contaminated fixture-only result;
- no dashboard for comparison;
- no external publishing claim.

Current Stage 10 audit:

- Existing comparison evidence is useful but insufficient: the strongest
  recorded baseline-vs-KRN delta is fixture-based, so it cannot satisfy the
  "no contaminated fixture-only result" rule for this stage.
- Stage 10 remains incomplete until an approved target run has a comparable
  simpler-baseline run, same task class where feasible, same target validation
  authority, and measured outcomes across the listed dimensions.
- Source-side comparison guidance is now in
  `docs/product/target-adoption-playbook.md` and the evidence matrix, including
  a pre-run approval packet, packet template, comparison packet fields, and
  outcome dimensions. This is only a readiness checklist, not Stage 10 evidence
  until an approved target run records both the simpler baseline and the KRN
  comparison.
- If that comparison shows no meaningful delta, product scope should narrow
  instead of adding surfaces.

## Repository-Wide Operating Principles

1. Repo truth beats audit truth.
2. Raw research and raw audits are inputs, not active canon.
3. One primary workflow beats many impressive surfaces.
4. Every artifact must say what it proves and what it does not prove.
5. Local proof stays local proof.
6. Hook templates are not hook trust.
7. Config adoption is not product-code adoption.
8. Product-code proof is not production proof.
9. Review is valuable only if it changes operator decisions or catches real
   risks.
10. Target validation must be target-owned and honestly scoped.
11. Wrapper validation is acceptable only when its authority and limitations are
    explicit.
12. Context packages are assistance, not full repo understanding.
13. Do not solve context noise with vector/embeddings before a real finding
    proves the need.
14. Do not solve adoption friction by weakening safety policy silently.
15. Do not broaden CLI surface when a docs/spec/test improvement will do.
16. Do not add an abstraction until repeated evidence shows duplicated pain.
17. Do not treat dirty worktree files as source truth.
18. Do not commit runtime artifacts.
19. Do not edit protected data.
20. Do not clean up unrelated files while pursuing an audit goal.
21. Each changed line must map to an accepted audit claim or recorded friction.
22. Each non-trivial decision needs docs, official docs, research, or ADR
    rationale.
23. Each implementation slice must name owned files, acceptance, validation, and
    residual risk before edits.
24. If validation fails, report it exactly and stop overclaiming.
25. If a proposed improvement does not strengthen real target evidence,
    boundary clarity, or operator decision quality, do not build it now.

## Completion Standard

The repo is in a stronger state when all of the following are true:

- the two original audits are represented by a tracked claim matrix;
- later raw audit inputs are classified as bounded intake before they affect
  active roadmap language;
- current active docs no longer contradict the audit classification;
- `grill-with-docs` is resolved instead of floating as untracked quasi-canon;
- `$review` has proven closeout value or a narrower documented role;
- target validation boundaries are explicit enough to avoid wrapper theater;
- task specs can carry the critical boundaries required by real target proof;
- run-result semantics clearly separate core verdict from supporting projection;
- at least one later hardening slice is validated with source tests;
- later real target repeats still use `krn run` as the primary workflow;
- production proof and hook trust remain unclaimed unless separately proven.

## Current Completion Audit

This audit is a current-state check, not a completion claim. Source-side
hardening plus Stage 9 target evidence have made the goal materially stronger,
but Stage 10 still needs explicit operator-approved same-authority comparison
evidence before the full goal can close. EXT-003 now has first governed
context-recall usefulness evidence; Stage 9 reused the wrapper-first memory as
reference-only workflow guidance, but comparative target-workflow outcome impact
remains open until Stage 10.

| Requirement | Current status | Evidence | Remaining work |
| --- | --- | --- | --- |
| Original external audits are represented by a claim matrix. | Satisfied | Audit Claim Matrix in this document covers `A1` and `A2`. | Keep future raw audit notes out of active canon until distilled. |
| Later raw audit inputs are bounded before they affect roadmap language. | Satisfied for `docs/audit/new-audit-001.md` and `docs/audit/new-audit-002.md`. | New Audit Intake 2026-06-18 records them as raw strategic audit input, condensed audit data, strict implementation rules, and current-goal extension tasks only. | Do not treat later audit prose as active canon or Stage 9/10 proof without a new classified intake. |
| New audit extension tasks are executed under strict anti-slop rules. | Source-side extension work satisfied; EXT-003 first evidence packet satisfied; Stage 9 target evidence satisfied; Stage 10 remains open. | EXT-001 and EXT-002 have a docs-only slice in `docs/product/daily-work-model.md`, EXT-003 has `memory-9ea13b133ba2` usefulness proof in `docs/handoffs/2026-06-18-ext003-memory-usefulness-proof.md`, EXT-004 has a daily-ledger projection in `docs/product/operator-console.md`, EXT-005 has Stage 10 comparison packet hardening in `docs/product/target-adoption-playbook.md` and `docs/product/evidence-matrix.md`, EXT-006 has a delegation/worktree protocol in `docs/product/subagent-contracts.md`, EXT-007 has static cockpit readiness preconditions in `docs/product/operator-console.md`, EXT-008 has a canonical contract map in `docs/product/audit-consolidation-continuation.md`, EXT-009 has a packaging/distribution kill switch in `docs/specs/release-check.schema.md`, EXT-010 has frontend visual proof metadata in task-contract schema/start output, `docs/handoffs/2026-06-18-stage9-target-evidence-result.md` records the two approved isolated target runs, and `docs/product/mvp-state.md` carries the north-star wording. | Finish Stage 10 approved same-authority comparison evidence. Do not treat source-side visual metadata, memory context recall, or Stage 9 local target evidence as rendered proof, production proof, hook trust, CI proof, or comparative outcome proof. |
| Active docs no longer contradict the audit classification. | Satisfied for source-side claims. | Stage 0-8 results; `docs/product/evidence-matrix.md`; `docs/product/target-adoption-playbook.md`; `docs/specs/task-contract.schema.md`; `docs/specs/run-result.schema.md`. | Recheck after Stage 9/10 target evidence changes source truth. |
| `grill-with-docs` is resolved. | Satisfied. | Stage 4 result; no active `.agents/skills/grill-with-docs/` directory. | None unless a future goal explicitly creates a new build-time skill through `$skill-creator`. |
| `$review` has proven closeout value or a narrower documented role. | Satisfied. | `docs/product/reviewers.md`; `.agents/skills/review/SKILL.md`; deterministic review tests. | Re-evaluate usefulness after real target repeats. |
| Target validation boundaries are explicit enough to avoid wrapper theater. | Satisfied for source contract and Stage 9 target evidence. | `boundaries.targetValidation`; adoption playbook wrapper limits; deterministic review checks; `docs/handoffs/2026-06-18-stage9-target-evidence-result.md`. | Re-audit after Stage 10 comparison, especially wrapper cost/noise. |
| Task specs can carry critical target-proof boundaries. | Satisfied for source contract. | Task-contract schema/docs and review checks for touched files, rollback, no-push, no-merge, target approval, approval reference, target isolation, and protected-data exclusion. | Future additions require a new target finding. |
| Run-result semantics separate core verdict from supporting projection. | Satisfied. | `coreStatus`, `supportingProjection`, proof-scope fields, and run-command tests. | Keep report/release-check language from becoming production readiness. |
| At least one later hardening slice is validated with source tests. | Satisfied. | Docs regression plus CLI/task-contract tests for Stages 5-8. | Continue reporting exact validation in handoffs. |
| Later real target repeats still use `krn run` as the primary workflow. | Satisfied for Stage 9. | `docs/handoffs/2026-06-18-stage9-target-evidence-result.md`; target run-results and run-bundle manifests in isolated `.krn/current/*` and `.krn-harness/current/*`. | Stage 10 still needs a same-authority baseline comparison; do not treat Stage 9 as comparative outcome proof. |
| Stage 10 measures KRN against a simpler same-authority baseline. | Incomplete. | Current Stage 10 audit says fixture-only baseline evidence is insufficient; the baseline packet fields are documented but no approved target baseline is recorded. | Record an approved target-run baseline with the same task class and target validation authority. |
| Production proof and hook trust remain unclaimed. | Satisfied as a boundary. | `productionProof: false`; hook trust unproven in evidence docs and run-result schema. | Do not upgrade either claim without a separate approved proof goal. |
| Runtime artifacts and protected data are not committed. | Satisfied for the current source slice. | `git ls-files .krn .krn-harness` check; protected-data exclusion boundaries. | Re-run before any closeout or commit. |

## New Audit Intake 2026-06-18

Sources:
- `N1`: `docs/audit/new-audit-001.md`;
- `N2`: `docs/audit/new-audit-002.md`.

Status: raw strategic audit input, not active canon by itself.

These two audits are useful, but they are much broader than this consolidation
goal. They argue for a future "KRN Work OS" direction: governed memory, daily
operating layer, frontend visual proof, delegation contracts, and a static
artifact-backed cockpit. That direction is compatible with current product
identity only if it stays artifact-first and keeps `krn run -> run-result ->
run-bundle` as the product center.

Current-goal conclusion:

- Do not absorb the full Work OS roadmap into this goal. Doing so would turn a
  proof-hardening goal into an unbounded product roadmap.
- Do not let the audits weaken Stage 9 or Stage 10. More product direction does
  not replace the need for two approved isolated product-code/test-code target
  repeats and a same-authority simpler-baseline comparison.
- Treat claims that rely on current Codex behavior or external research as
  candidates for a later `$kanon` source refresh before they become active
  architecture truth.
- Do not add architectural claims without a source. Each claim must point to
  official docs, an accepted ADR/spec, a current repo artifact, a recorded
  target finding, or a research link. Otherwise it remains an explicit
  hypothesis, not active architecture.
- Keep current non-goals intact: no dashboard server, hosted UI, MCP server,
  vector DB, embeddings, autonomous subagent framework, browser evidence layer,
  production runner, publishing pipeline, broad shell verify mode, or
  auto-approved memory.

Official Codex docs check 2026-06-18:

| Official Codex docs signal | KRN implication |
| --- | --- |
| Codex best practices recommend giving Codex goal, context, constraints, and done-when structure for reliable work in larger repositories. Source: `https://developers.openai.com/codex/learn/best-practices`. | Keep task-contract and daily-work tasks centered on goal/context/constraints/done/proof. |
| `AGENTS.md` is loaded as layered project guidance with size limits. Source: `https://developers.openai.com/codex/guides/agents-md`. | Keep AGENTS short; do not dump product manuals, raw audits, or long roadmap prose into always-on instructions. |
| Skills use progressive disclosure and should stay focused on one job. Source: `https://developers.openai.com/codex/skills`. | Preserve small build-time skills; do not revive `grill-with-docs` as an overlapping ritual skill unless it has a unique trigger/output contract. |
| MCP is for external context and tools, and docs advise adding tools only when they remove a real repeated manual loop. Source: `https://developers.openai.com/codex/learn/best-practices`. | Keep MCP out of this goal; record MCP only as future evidence-backed integration, not default architecture. |
| Codex memories carry useful context across threads and can be disabled or gated by user settings. Source: `https://developers.openai.com/codex/memories`. | KRN memory must remain repo/runtime governed, evidence-backed, manual-approved, and independent of Codex personal memory. |
| Subagents run only when explicitly requested, consume extra model/tool work, and inherit sandbox controls. Source: `https://developers.openai.com/codex/subagents`. | KRN may define delegation contracts, but must not build an autonomous subagent framework or treat subagent output as proof. |
| Codex app worktrees are useful background environments, and Codex-managed worktrees may save snapshots before deletion. Source: `https://developers.openai.com/codex/app/worktrees`. | KRN target proof must use explicit isolated checkouts/worktrees and recorded artifacts. Do not use Codex-managed snapshots as KRN evidence. |
| Appshots capture the frontmost app window and behave like Codex attachments. Source: `https://developers.openai.com/codex/appshots`. | Appshots may be user context, but they are not KRN proof in this goal and must not become generated visual evidence. |
| Hooks can run lifecycle commands but non-managed command hooks require review/trust. Source: `https://developers.openai.com/codex/hooks`. | Keep hook-trust claims separate from local trace or review artifacts; do not claim hook enforcement without a scoped non-bypass proof. |
| `codex exec --json` can emit JSONL for programmatic flows. Source: `https://developers.openai.com/codex/noninteractive`. | JSONL is trajectory evidence only; correctness still comes from target-owned verify, run-result, review, and bundle artifacts. |

Condensed audit data:

| ID | Audit data | Current repo truth | Condensed decision |
| --- | --- | --- | --- |
| N-001 | KRN should become a local Work OS around Codex work: accountable, cumulative, reviewable, reusable, and less dependent on chat memory. | Current identity is already Codex-first local runtime/control layer. Daily operator usefulness is still under-proven. | Accept as product direction inside this goal, but keep product center as `krn run -> run-result -> run-bundle`. Do not rename proof semantics or imply a dashboard/platform. |
| N-002 | The daily loop should connect idea, goal card, task contract, context package, approved memory references, Codex execution, trace, target-owned verify, review, memory candidates, daily ledger, static cockpit, and next work. | The executable center exists; goal-card, daily ledger, visual proof, and delegation ledger are not first-class contracts. | Add strict current-goal tasks to define the missing contracts before runtime/UI work. |
| N-003 | Codex-native memory, AGENTS, skills, hooks, worktrees, subagents, and `codex exec` are useful but not project truth by themselves. | Repo already separates AGENTS, build-time skills, governed memory, hooks, Codex exec evidence, and local proof claims. | Use these as source leads for later `$kanon` refresh where needed; do not treat raw audit citations as active architecture truth until checked against current official docs. |
| N-004 | Contract-first work is the wedge: goal/context/constraints/done/proof boundaries make Codex work auditable. | Task contract and target boundaries now exist, including target validation, approval, isolation, protected data, no-push, and no-merge. | Continue strengthening task-spec boundaries only from real friction; reject broad new commands or generic workflow engines. |
| N-005 | Memory can be a breakthrough only if it is governed: claim, provenance, status, scope, approval, deprecation, conflict, and opt-out. | P0 memory has pending/approved/deprecated stores, manual approval, reference-only context injection, evidence provenance, and opt-out gates. Usefulness is unproven. | Add current-goal task for memory usefulness and condensation, not semantic memory, vector memory, or auto approval. |
| N-006 | Daily ledger is the missing layer between CLI artifacts and dashboard. It should show active goals, tasks, runs needing review, blockers, memory candidates, frictions, delegated work, stale decisions, and next action. | `operator-summary` and `operator-report` aggregate local artifacts, but no daily work contract exists. | Add current-goal task to define a projection from existing artifacts first; no new top-level `krn daily` command unless later explicitly justified. |
| N-007 | Frontend/product work needs visual acceptance: route/component scope, viewports, design constraints, a11y expectations, copy status, manual notes/artifact references, and target-owned visual gates. | `metadata.visualProof` now exists as task-spec contract metadata. It is not a KRN browser/Playwright/Figma engine and does not create rendered visual proof. | Use visual metadata as readiness/acceptance only. Actual UI proof still needs approved target artifacts later, and no mandatory browser automation, Figma, external service, generated screenshot/appshot, or visual-correctness claim from build output is allowed in this goal. |
| N-008 | Delegation should be one task, one worktree, one contract, one run-result, one bundle, one review; not an autonomous swarm. | `docs/product/subagent-contracts.md` defers execution roles and keeps reviewers deterministic. | Add current-goal task for delegation contract only; no KRN-owned agent spawning or uncontrolled parallel writes. |
| N-009 | Dashboard/cockpit can help daily work only after data contracts are stable. It must read artifacts, not create truth. | ADR-0014 accepts only a generated local static HTML report viewer; `operator-console.md` forbids server/database/mutation/source-of-truth behavior. | Keep dashboard-lite as readiness/contract work inside this goal; do not implement UI before daily-ledger and summary schemas are stable. |
| N-010 | Raw Codex vs Codex+KRN comparison is the real breakthrough test. Metrics include completion, verify pass, interventions, scope violations, false done, review time, artifact usefulness, memory reuse, repeated mistakes, frontend defects, and time to auditable proof. | Stage 10 already requires a same-authority target baseline; current fixture-only baseline is insufficient. | Fold comparison into Stage 10, not a marketing benchmark or dashboard. |
| N-011 | Packaging/distribution is premature until real target classes, memory usefulness, review usefulness, dashboard-lite usefulness, zero claim regressions, and hook-trust boundaries are proven. | Evidence matrix still has open target, hook, review, summary, and Stage 10 gaps. | Reject packaging and publishing in this goal. Add an explicit packaging kill-switch task to prevent accidental creep. |
| N-012 | Strategic risks: dashboard before truth, memory poisoning, agent-swarm fantasy, proof inflation, and feature envy relative to Codex. | Existing non-goals already block most of these, but the new audits create pressure to broaden scope. | Add anti-slop implementation rules and codebase-condensation task before any new surface. |
| N-013 | Daily usage needs practical task-type flows: morning orientation, new task, after Codex, end-of-day, new app slice, frontend, refactor, bugfix, and multi-project work. | Existing docs have run/report/adoption flows but not a compact daily work model. | Add current-goal task to document daily flows as contracts and artifact inputs, not as a new app surface. |
| N-014 | Useful inspiration includes type-safe contracts, product UX discipline, evidence-first counterweight to vibe coding, human-in-loop durable state, prompt-injection skepticism, and AI engineering eval practice. | Some claims are product inspiration rather than official or research proof. | Keep as directional notes only; require source refresh and ADR/spec rationale before implementation. |

Strict implementation rules for the extended current goal:

1. Condense before adding: if a task adds a contract, schema, or doc, it must
   remove, merge, or clearly supersede duplicate prose where practical.
2. Prefer existing surfaces: use `krn run`, task specs, run-result,
   operator-summary, operator-report, review, memory, and docs/specs before any
   new command, bundle, schema family, or UI.
3. No slop surfaces: no dashboard server, hosted UI, MCP server, vector DB,
   embeddings, autonomous subagent runtime, browser evidence layer, production
   runner, publishing pipeline, broad shell verify mode, arbitrary command
   allowlist, or auto-approved memory.
4. No generated snapshots as proof: do not create or rely on snapshot artifacts,
   Codex-managed worktree snapshots, screenshots, appshots, or browser captures
   as KRN evidence in this goal. Use explicit task contracts, run-result,
   verify, review, bundle, git status, and handoff artifacts.
5. No proof inflation: every output must keep fixture, config, product-code,
   local target, hook trust, CI, and production proof claims separate.
6. No target mutation without explicit operator approval and target selection.
   Stage 9 and Stage 10 remain incomplete until approved target evidence exists.
7. Every task must name owned files, acceptance, proof command, forbidden scope,
   and residual risk before implementation.
8. If a task depends on current Codex behavior, hooks, skills, subagents,
   worktrees, memories, or `codex exec`, verify against current official docs in
   that task before turning it into active KRN truth.
9. Do not add new string-level tests for docs-only wording. Validate docs-only
   wording with `rg`, `git diff --check`, and lint. Add focused tests only when
   code, schemas, parser behavior, or generated operator artifacts change.
10. Do not confuse Codex personal memory or `~/.codex/MEMORY.md` with KRN
    `.krn/memory/*`. KRN governed memory is a product artifact and can only be
    evidence when it has operator approval, evidence path, scope/use case,
    reference-only context behavior, opt-out/deprecation expectation, and a
    measured later-task effect.
11. If a task adds architecture, cite the source in the task artifact: official
    docs URL, accepted ADR/spec path, current repo artifact path, recorded target
    finding, or research URL. Unsourced patterns stay as hypotheses.
12. Defer rendered frontend visual proof until the core operating model is
    proven: task/daily contracts, governed-memory usefulness, ledger projection,
    delegation/worktree protocol, Stage 9 target repeats, and Stage 10
    same-authority comparison come first. Contract metadata for future visual
    proof may exist, but it is readiness only.

Current-goal extension tasks from `N1` and `N2`, ordered by execution priority:

| Task | Purpose | Owned areas | Acceptance | Proof | Forbidden scope / residual risk |
| --- | --- | --- | --- | --- | --- |
| EXT-001 Product north-star condensation | State the Work OS direction without turning KRN into a dashboard/platform claim. | This goal doc; optionally one concise product doc if an existing doc cannot absorb it. | Language says KRN makes Codex work contract-backed, remembered, verified, reviewed, and auditable while preserving `krn run -> run-result -> run-bundle`. | `rg` evidence; `git diff --check`; `pnpm lint`. | No README marketing rewrite, no production proof, no hook trust, no dashboard-first phrasing. Risk: too much product language can obscure proof gates. |
| EXT-002 Daily work model contract | Define daily flows for bugfix, frontend page, new app slice, review-only task, target adoption, and multi-project work. | Existing product docs/specs; no runtime code by default. | Each flow maps to task spec, context, verify, review, memory touchpoint, artifact input, and proof boundary. | `rg` evidence; `git diff --check`; `pnpm lint`. | No new `krn daily` command, UI, DB, server, or app surface. Risk: flow docs become ritual unless tied to artifacts. |
| EXT-003 Governed memory usefulness | Prove or falsify whether memory helps operator work without poisoning project truth. | `docs/specs/memory.schema.md`, memory tests only if examples justify code. | At least one operator-approved memory example has evidence path, scope/use case, reference-only behavior, and opt-out/deprecation expectation. | Memory/context/doctor tests if code changes; docs-only proof uses `rg`, `git diff --check`, and lint. | No semantic memory, vector memory, auto approval, protected data, or memory as canon. Risk: usefulness remains unproven after examples. |
| EXT-004 Daily ledger projection | Define daily ledger as artifact projection before implementation. | `operator-summary` / `operator-report` docs/specs first. | Ledger inputs are existing artifacts only: run-result, review, memory stores, operator-summary, adoption friction, blockers, and known risks. | Summary/report tests only if code changes; docs-only proof uses `rg`, `git diff --check`, and lint. | No new top-level command unless later approved; no hidden state, server, DB, or dashboard authority. Risk: duplicating operator-summary instead of condensing it. |
| EXT-005 Stage 10 comparative eval hardening | Make raw Codex vs Codex+KRN comparison concrete without creating a marketing benchmark. | Current Stage 10 text, target-adoption playbook, evidence matrix. | Metrics include success/failure, verify pass, interventions, scope violations, false done, review time/usefulness, artifact auditability, memory reuse, repeated mistakes, frontend defects, and time to auditable proof. | `rg` evidence; `git diff --check`; `pnpm lint`; approved target artifacts later. | No fixture-only Stage 10 claim, cherry-picking, dashboard benchmark, or external publishing claim. Risk: comparable target baseline needs operator approval. |
| EXT-006 Delegation worktree protocol | Define safe delegation without building a swarm. | `docs/product/subagent-contracts.md` or related spec docs. | One delegated task equals one isolated worktree, one task contract, one run-result, one bundle, one review/handoff, and explicit allowed actions. | `rg` evidence; `git diff --check`; `pnpm lint`. | No KRN-owned agent spawning, no write-heavy parallelism without isolation, no agent memory approval, and no Codex-managed snapshot as proof. Risk: protocol still depends on operator discipline. |
| EXT-007 Static cockpit readiness | Keep cockpit/dashboard-lite as artifact viewer readiness, not implementation. | ADR-0014, operator-console docs, report specs. | Preconditions list stable data contracts, allowed inputs, empty/error states, protected-data exclusions, and no-source-of-truth rule. | `rg` evidence; `git diff --check`; `pnpm lint`. | No UI implementation until EXT-005 stabilizes; no framework/server/external assets/mutation. Risk: cockpit pressure can distort schemas. |
| EXT-008 Codebase condensation pass | Reduce ritual and duplicate truth before adding product layers. | Current docs/specs touched by this goal. | Each new contract points to one canonical doc/spec; stale duplicate wording is removed, superseded, or explicitly left as historical evidence. | `rg` evidence; `git diff --check`; `pnpm lint`. | No broad cleanup outside owned files; no rewriting scratch files; no deleting raw audits. Risk: condensation can become unbounded refactor. |
| EXT-009 Packaging/distribution kill switch | Prevent premature publishing or product-readiness drift. | Goal doc, release-check docs if needed. | Packaging remains blocked until Stage 9/10, memory usefulness, review usefulness, dashboard-lite usefulness, and hook-trust boundaries are explicitly re-audited. | `rg` evidence; `git diff --check`; `pnpm lint`. | No publish automation, hosted dashboard, production runner, or hook enforcement claim. Risk: stale kill-switch if later proof changes. |
| EXT-010 Frontend visual proof contract | Final source-side extension only: add a first-class contract lane for frontend/product UI work without building a visual engine. | Task-contract schema/start rendering, task-contract tests, target-adoption docs if target-owned visual gates are involved. | Contract can express route/component, viewports, design constraints, a11y expectations, copy status, manual visual artifact, and target-owned visual command when present. | Focused task-contract/current-flow tests when schema/code changes; docs proof uses `rg`, `git diff --check`, and lint. | No mandatory browser automation, Playwright, Figma/MCP dependency, external visual service, generated screenshot/appshot, or visual proof from build alone. Risk: manual visual notes are weaker than rendered proof. |

Extension task progress:

- 2026-06-18 EXT-001 and EXT-002 source slice: `docs/product/daily-work-model.md`
  defines the contract-only product north star and daily flow contracts for
  bugfix, frontend page/component, new app slice, review-only task, target
  adoption, and multi-project work. `docs/product/mvp-state.md` now points to
  that contract as docs-only operating truth. This does not close Stage 9 or
  Stage 10.
- 2026-06-18 EXT-004 source slice: `docs/product/operator-console.md`
  defines the daily ledger as a projection over existing task, run-result,
  verify, review, memory, summary, report, handoff, blocker, risk, and target
  approval artifacts. It adds no `krn daily` command, schema, UI, server,
  database, scheduler, mutation path, memory approval, snapshot proof,
  production-proof claim, hook-trust claim, or target-main approval claim.
  Later bullets cover EXT-005, EXT-006, and the EXT-003 source/evidence slice.
- 2026-06-18 EXT-006 source slice: `docs/product/subagent-contracts.md`
  defines safe delegation as one explicit operator request, one isolated
  checkout/worktree, one task contract, one approved `krn run` result when
  execution is allowed, one run bundle, one review/handoff, and one human
  promotion/discard decision. It cites official Codex subagent and worktree
  docs, and rejects KRN-owned agent spawning, recursive fan-out, write-heavy
  parallel edits in one checkout, automatic memory approval, target push,
  target merge, canon mutation, Codex-managed snapshot proof, subagent
  self-report proof, production proof, CI proof, hook trust, and target-main
  approval claims. EXT-003 context-recall proof is recorded; Stage 9/10 target
  evidence remains open.
- 2026-06-18 EXT-005 source slice: `docs/product/target-adoption-playbook.md`
  and `docs/product/evidence-matrix.md` now define the Stage 10 comparison
  packet and outcome dimensions: success/failure, verify pass/fail,
  interventions, scope violations, protected-path incidents, false done or
  overclaim events, review time/usefulness, artifact auditability, memory reuse,
  repeated mistakes avoided or repeated, frontend defects when UI-facing, and
  time to auditable proof. This is source-side hardening only. Stage 10 remains
  incomplete until both sides of an approved same-authority target comparison
  exist as artifacts. EXT-003 context-recall proof is recorded; Stage 9/10
  target evidence remains open.
- 2026-06-18 EXT-003 source and evidence slice:
  `docs/specs/memory.schema.md` defines memory usefulness evidence and separates
  KRN `.krn/memory/*` from Codex personal memory, `~/.codex/MEMORY.md`, AGENTS
  guidance, and active canon. After explicit operator approval, `memory-9ea13b133ba2`
  was proposed and approved with evidence path
  `docs/product/adoption-friction-register.md`. It surfaced in a later relevant
  context package only as `reference-only` with memory id, approval timestamp,
  matched terms, and evidence path, and it disappeared under Polish opt-out
  `bez pamięci`. `docs/handoffs/2026-06-18-ext003-memory-usefulness-proof.md`
  records the proof packet and `docs/product/evidence-matrix.md` records the
  updated memory status. This proves governed context recall only. Stage 9/10
  target outcome evidence remains open.
- 2026-06-18 continuation ledger: `docs/product/audit-consolidation-continuation.md`
  records the recovery path after context loss, required skills, source/proof
  discipline, completed/source-hardened slices, open slices, and the current
  next safe slice. It is not a second roadmap and does
  not close any evidence gate.
- 2026-06-18 EXT-007 source slice: `docs/product/operator-console.md` now
  defines static cockpit/dashboard-lite readiness as a blocked artifact-viewer
  contract over existing local files. It lists required stable input contracts,
  allowed inputs, missing/skipped/readiness/blocked/fail/warn/empty/historical
  state handling, protected-data exclusions, no-source-of-truth rules, and
  implementation stop conditions. `docs/product/evidence-matrix.md` records
  dashboard-lite as contract-only readiness with no UI implementation. This adds
  no framework, server, hosted UI, database, external assets, mutation path,
  browser proof, screenshot proof, production proof, hook-trust claim, or
  target-main approval claim. EXT-003 context-recall proof is recorded; Stage
  9/10 target evidence remains open.
- 2026-06-18 EXT-008 source slice:
  `docs/product/audit-consolidation-continuation.md` now contains the canonical
  contract map for this goal. It points each active contract to one owner,
  marks raw audit files as historical input, keeps the general backlog secondary
  to this goal, and prevents cockpit, memory, delegation, Stage 9/10, and daily
  flow wording from becoming duplicate truth across docs. This does not delete
  raw audits or rewrite scratch files. EXT-003 context-recall proof is
  recorded; Stage 9/10 target evidence remains open.
- 2026-06-18 EXT-009 source slice: `docs/specs/release-check.schema.md`
  now defines release-check as a packaging kill-switch boundary: passing
  release-check, run bundles, report bundles, local CI, or local validation
  transcripts do not authorize package publication, plugin distribution, hosted
  dashboard work, production runner work, or hook enforcement claims.
  `docs/product/evidence-matrix.md` records Publishing as absent with this kill
  switch documented. No publish automation, release action, hosted service,
  production runner, package-registry command, or hook enforcement claim was
  added. EXT-003 context-recall proof is recorded; Stage 9/10 target evidence
  remains open.
- 2026-06-18 EXT-010 source slice: `packages/task-contract/src/schema.ts` and
  `packages/cli/src/commands/start.ts` now carry optional `metadata.visualProof`
  from task specs into task-contract JSON and markdown. `docs/specs/task-contract.schema.md`,
  `docs/product/target-adoption-playbook.md`, `docs/product/evidence-matrix.md`,
  `docs/product/daily-work-model.md`, and the continuation ledger define the
  boundary: route/component, viewports, design constraints, a11y expectations,
  copy status, manual visual artifact, and target-owned visual command are
  readiness metadata only. No browser automation, Playwright, Figma/MCP
  dependency, generated screenshot/appshot, external visual service, production
  proof, hook-trust claim, or Stage 9/10 evidence was added.
- 2026-06-18 continuation audit: `docs/product/audit-consolidation-continuation.md`
  now carries an evidence request queue for the remaining approval-gated work:
  Stage 9 target repeats and Stage 10 same-authority comparison. EXT-003 is
  recorded as satisfied for first governed context-recall proof. The queue adds
  no target mutation, generated visual proof, dashboard, command,
  production-proof claim, hook-trust claim, or completion claim.

This intake extends the current goal's task list. It does not close Stage 9 or
Stage 10, does not authorize target mutation, and does not permit raw audit
prose to become active canon without condensation and validation.

## Next Target-Evidence Gate

```text
Execute Stage 9 from docs/product/audit-consolidation-goal-2026-06-18.md only
after explicit operator approval for two non-protected isolated target repos.
Run two tiny product-code/test-code tasks through
krn run --task-spec ... --execute-verify --bundle with expected touched files,
forbidden paths, target validation, rollback, no-push, no-merge,
target-isolation boundaries, approval-reference boundaries, and protected-data
exclusion boundaries. Do not push, merge, touch protected data, claim
production proof, or claim hook trust. First fill the Stage 9/10 pre-run
approval packet template; treat it as readiness evidence only until the
approved run records exact run-result, bundle, validation, and residual-risk
evidence. Use the Stage 9 Evidence Request Packet in
docs/product/audit-consolidation-continuation.md as the operator approval
request shape; it is not approval and not target evidence by itself.
```
