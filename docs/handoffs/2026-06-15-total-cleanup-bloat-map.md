# 2026-06-15 Total Cleanup Complete File Audit

## Scope

- Baseline source floor: `21feafa5002901498f8beef7af07ec328c0bd543` or newer; current checkout was already newer during Stage 0.
- Audited tracked files: `372`; each tracked path was opened/read by the audit scanner and classified below.
- Observed untracked files: `6`; protected scratch was listed from git status only and not edited/staged.
- Audit status vocabulary is intentionally binary: `FLAGGED` means cleanup/scope/risk follow-up is needed or the file is protected/dirty; `OK` means inspected with no current cleanup flag.

## Inspection Method

- Inventory: `git ls-files`, `git ls-files -o --exclude-standard`, `git status --short --branch`.
- Metadata: line counts, kind grouping, dirty status, generated/fixture/source/doc classification.
- Content scan: every tracked file was read; flagged candidates were deep-read manually for exact findings.
- Keyword/risk scan: duplicated artifact readers/copy helpers, memory writes, task acceptance/proof strings, compact hook events, config ownership hints, forbidden product-surface terms, production/hook-trust wording.

## Summary

- Tracked OK: `339`.
- Tracked FLAGGED: `33`.
- Observed untracked/protected FLAGGED: `6`.
- Cleanup plan remains capped to the GOAL areas: shared artifact/proof utilities, memory dirty writes, task-contract normalization helpers, compact hook/config ownership coverage, and docs condensation.
- Large doctor/context/eval files are flagged as bloat hotspots but intentionally deferred unless characterization tests and a later explicit goal approve extraction.

## Flagged Tracked Files

| Path | Kind | Lines | Status | Finding |
| --- | --- | ---: | --- | --- |
| `.gitignore` | other | 7 | FLAGGED | dirty tracked scratch: GOAL.md ignore rule was removed; protected by GOAL boundary, leave untouched |
| `README.md` | doc | 220 | FLAGGED | docs condensation target: repeats current v0.1 operating truth and proof limits also present in product/release docs |
| `docs/product/evidence-matrix.md` | product-doc | 59 | FLAGGED | docs condensation target: current evidence matrix overlaps README, mvp-state, release note, and stage scorecard |
| `docs/product/mvp-state.md` | product-doc | 90 | FLAGGED | docs condensation target: current operating truth overlaps README/evidence/release docs |
| `docs/product/next-implementation-backlog.md` | product-doc | 83 | FLAGGED | docs condensation target: current next-move truth overlaps release note and P0/P1 docs |
| `docs/product/operator-console.md` | product-doc | 110 | FLAGGED | scope-risk doc: console/dashboard-adjacent lane exists; current GOAL forbids dashboard work |
| `docs/product/subagent-contracts.md` | product-doc | 53 | FLAGGED | scope-risk doc: subagent lane exists; current GOAL forbids subagent work |
| `docs/releases/v0.1-local-tool-candidate.md` | release-doc | 98 | FLAGGED | docs condensation target: release proof summary overlaps README/product docs |
| `docs/specs/hooks-pack.md` | spec-doc | 90 | FLAGGED | GOAL target doc: compact guardrail and config ownership coverage need update |
| `docs/specs/memory.schema.md` | spec-doc | 45 | FLAGGED | GOAL target doc: dirty-write behavior and future TTL/tag growth note need update |
| `docs/specs/task-contract.schema.md` | spec-doc | 24 | FLAGGED | GOAL target doc: acceptance/proof need normalized structured helper semantics |
| `packages/cli/src/commands/release-check.ts` | source | 819 | FLAGGED | GOAL target: duplicated bundle copy/normalize helpers; current-artifact reader/copy utility candidate |
| `packages/cli/src/commands/report.ts` | source | 263 | FLAGGED | GOAL target adjacency: report should consume shared artifact/current path helpers instead of drifting locally |
| `packages/cli/src/commands/review.ts` | source | 692 | FLAGGED | GOAL target: duplicated readJson/readText/exists helpers |
| `packages/cli/src/commands/run.ts` | source | 748 | FLAGGED | GOAL target: duplicated bundle copy/normalize helpers and run artifact constants |
| `packages/cli/src/index.test.ts` | test | 4964 | FLAGGED | large omnibus CLI test file (4964 lines); intentionally broad but a future characterization split candidate |
| `packages/cli/src/operator-report.ts` | source | 515 | FLAGGED | adjacent duplicate helper logic: unique/markdownList/current summary readers/report rendering helpers |
| `packages/cli/src/operator-summary.ts` | source | 976 | FLAGGED | GOAL target: duplicated current artifact readers/status helpers plus large summary renderer |
| `packages/context/src/build-context-package.test.ts` | test | 1259 | FLAGGED | large context characterization test (1259 lines); intentional current safety net, not immediate cleanup target |
| `packages/context/src/build-context-package.ts` | source | 1090 | FLAGGED | large context selection/ranking module (1090 lines); intentional but future refactor-backlog hotspot |
| `packages/doctor/src/doctor.test.ts` | test | 1239 | FLAGGED | large doctor characterization test (1239 lines); intentional current safety net, not immediate cleanup target |
| `packages/doctor/src/doctor.ts` | source | 1401 | FLAGGED | large doctor implementation (1401 lines); intentional but future refactor-backlog hotspot |
| `packages/evals/src/run-eval.ts` | source | 1042 | FLAGGED | large eval runner (1042 lines); intentional but future refactor-backlog hotspot |
| `packages/hooks/src/codex-hook-entry.test.ts` | test | 619 | FLAGGED | GOAL target tests: add compact guardrail/config ownership coverage |
| `packages/hooks/src/codex-hook-entry.ts` | source | 1023 | FLAGGED | GOAL target: PreCompact/PostCompact warnings and config ownership hints are under-covered |
| `packages/memory/src/memory-store.test.ts` | test | 113 | FLAGGED | GOAL target tests: no unchanged-store write assertion yet |
| `packages/memory/src/memory-store.ts` | source | 176 | FLAGGED | GOAL target: putRecord writes pending/approved/deprecated stores every time |
| `packages/task-contract/src/build-contract.test.ts` | test | 110 | FLAGGED | GOAL target tests: acceptance/proof remain plain string arrays only |
| `packages/task-contract/src/build-contract.ts` | source | 61 | FLAGGED | GOAL target: default acceptance/proof strings lack normalized structured helpers |
| `packages/task-contract/src/index.ts` | source | 5 | FLAGGED | GOAL target export point for normalized acceptance/proof helpers |
| `packages/task-contract/src/schema.ts` | source | 33 | FLAGGED | GOAL target: acceptance/proof remain unstructured string arrays; add optional helper types/functions |
| `pnpm-lock.yaml` | yaml | 1186 | FLAGGED | large generated dependency lockfile; inspected for size only, do not hand-edit |
| `scripts/krn-real-repo-execution-report.sh` | script | 396 | FLAGGED | legacy script duplicates JSON/text reading and real-repo reporting outside primary krn run workflow |

## Observed Untracked Files

| Path | Kind | Status | Finding |
| --- | --- | --- | --- |
| `ARCHITECTURE-AUDIT.md` | doc | FLAGGED | untracked protected scratch observed by git status; not edited, staged, or content-audited in this cleanup pass |
| `GOAL-8H.md` | doc | FLAGGED | untracked protected scratch observed by git status; not edited, staged, or content-audited in this cleanup pass |
| `GOAL.md` | doc | FLAGGED | untracked protected scratch observed by git status; not edited, staged, or content-audited in this cleanup pass |
| `docs/audit/documentation-audit-2026-06-14.md` | doc | FLAGGED | untracked protected scratch observed by git status; not edited, staged, or content-audited in this cleanup pass |
| `docs/audit/krn-harness-comprehensive-audit-2026-06-14.md` | doc | FLAGGED | untracked protected scratch observed by git status; not edited, staged, or content-audited in this cleanup pass |
| `docs/handoffs/2026-06-15-total-cleanup-bloat-map.md` | handoff | FLAGGED | current generated audit artifact; untracked until intentionally staged in source cleanup work |

## Complete Tracked File Ledger

| Path | Kind | Lines | Status | Inspection note |
| --- | --- | ---: | --- | --- |
| `.agents/skills/buduj/SKILL.md` | build-skill | 40 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/buduj/agents/openai.yaml` | build-skill | 4 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/handoff/SKILL.md` | build-skill | 27 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/handoff/agents/openai.yaml` | build-skill | 4 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/kanon/SKILL.md` | build-skill | 30 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/kanon/agents/openai.yaml` | build-skill | 4 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/pilnuj/SKILL.md` | build-skill | 42 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/pilnuj/agents/openai.yaml` | build-skill | 4 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/wycinek/SKILL.md` | build-skill | 37 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.agents/skills/wycinek/agents/openai.yaml` | build-skill | 4 | OK | build-time skill instruction/metadata inspected; no scope drift found |
| `.editorconfig` | other | 11 | OK | file inspected; no cleanup issue found |
| `.github/workflows/verify.yml` | yaml | 54 | OK | YAML config inspected; no cleanup issue found |
| `.gitignore` | other | 7 | FLAGGED | dirty tracked scratch: GOAL.md ignore rule was removed; protected by GOAL boundary, leave untouched |
| `AGENTS.md` | doc | 176 | OK | doc inspected; no cleanup issue found |
| `README.md` | doc | 220 | FLAGGED | docs condensation target: repeats current v0.1 operating truth and proof limits also present in product/release docs |
| `biome.json` | json | 23 | OK | JSON config/fixture inspected; no cleanup issue found |
| `docs/adr/ADR-0001-codex-first-harness.md` | adr | 31 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0002-runtime-layout.md` | adr | 31 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0003-task-contract-and-context-package.md` | adr | 32 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0004-codex-hooks-as-guardrails.md` | adr | 30 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0005-graph-lite-before-ast.md` | adr | 31 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0006-governed-memory.md` | adr | 40 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0007-trace-based-evals.md` | adr | 31 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0008-build-time-skills-vs-runtime-skills.md` | adr | 30 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0009-krn-search-skills-as-inspiration.md` | adr | 31 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0010-skills-created-through-skill-creator.md` | adr | 31 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0011-local-current-evidence.md` | adr | 37 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0012-future-codex-exec-wrapper.md` | adr | 45 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0013-dogfood-cli-identity-and-real-repo-preflight.md` | adr | 52 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0014-dashboard-lite-read-only-report-viewer.md` | adr | 55 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0015-mcp-read-only-contract-spike.md` | adr | 57 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0016-retrieval-vector-experiment-harness.md` | adr | 47 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/ADR-0017-verify-execute-policy.md` | adr | 91 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/adr/README.md` | adr | 21 | OK | ADR/canon inspected; accepted historical/future-scope decision, no current cleanup needed |
| `docs/architecture/architecture-spec-v0.1.md` | doc | 91 | OK | doc inspected; no cleanup issue found |
| `docs/architecture/glossary.md` | doc | 10 | OK | doc inspected; no cleanup issue found |
| `docs/architecture/non-goals.md` | doc | 18 | OK | doc inspected; no cleanup issue found |
| `docs/architecture/research-baseline-v0.1.md` | doc | 67 | OK | doc inspected; no cleanup issue found |
| `docs/demo/codex-dogfood.md` | demo-doc | 214 | OK | demo doc inspected; local-only evidence wording preserved |
| `docs/demo/downstream-basic-demo.md` | demo-doc | 75 | OK | demo doc inspected; local-only evidence wording preserved |
| `docs/demo/hook-trust-probe-example.json` | demo-doc | 15 | OK | demo doc inspected; local-only evidence wording preserved |
| `docs/demo/real-repo-dogfood.md` | demo-doc | 329 | OK | demo doc inspected; local-only evidence wording preserved |
| `docs/handoffs/2026-06-13-goal-8h-readiness-slice.md` | handoff | 60 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-13-wp-acf-dogfood-evidence.md` | handoff | 134 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-approved-krn-llm-wiki-manual-codex.md` | handoff | 277 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-first-real-repo-codex-execution.md` | handoff | 158 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-hook-trust-probe.md` | handoff | 219 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-non-doc-krn-llm-wiki-config-dogfood.md` | handoff | 130 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-p0-p1-entry-decision.md` | handoff | 58 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-real-repo-codex-execution-verify-context.md` | handoff | 280 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-real-repo-dogfood-skipped.md` | handoff | 59 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-real-repo-executable-verify.md` | handoff | 265 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-14-real-repo-execution-result-schema.md` | handoff | 130 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-15-krn-llm-wiki-beta-install-config-smoke.md` | handoff | 39 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-15-product-code-dogfood-fixture.md` | handoff | 42 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/handoffs/2026-06-15-real-target-krn-run-product-code-proof.md` | handoff | 66 | OK | historical handoff inspected; evidence archive, not active cleanup target |
| `docs/product/evidence-matrix.md` | product-doc | 59 | FLAGGED | docs condensation target: current evidence matrix overlaps README, mvp-state, release note, and stage scorecard |
| `docs/product/knowledge-condensation.md` | product-doc | 50 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/mvp-state.md` | product-doc | 90 | FLAGGED | docs condensation target: current operating truth overlaps README/evidence/release docs |
| `docs/product/next-implementation-backlog.md` | product-doc | 83 | FLAGGED | docs condensation target: current next-move truth overlaps release note and P0/P1 docs |
| `docs/product/operator-console.md` | product-doc | 110 | FLAGGED | scope-risk doc: console/dashboard-adjacent lane exists; current GOAL forbids dashboard work |
| `docs/product/p0-exit-criteria.md` | product-doc | 45 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/p0-p1-decision.md` | product-doc | 84 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/p1-entry-contract.md` | product-doc | 45 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/refactor-backlog.md` | product-doc | 88 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/research-backed-architecture.md` | product-doc | 98 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/reviewers.md` | product-doc | 93 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/stage-scorecard.md` | product-doc | 49 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/subagent-contracts.md` | product-doc | 53 | FLAGGED | scope-risk doc: subagent lane exists; current GOAL forbids subagent work |
| `docs/product/target-adoption/krn-llm-wiki-krn-config-proposal.md` | product-doc | 222 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/product/target-adoption/krn-llm-wiki-product-code-dogfood-decision.md` | product-doc | 124 | OK | product doc inspected; no current cleanup flag beyond listed docs |
| `docs/release/checklist.md` | release-doc | 113 | OK | release doc inspected; no flag beyond listed v0.1 candidate overlap |
| `docs/releases/v0.1-local-tool-candidate.md` | release-doc | 98 | FLAGGED | docs condensation target: release proof summary overlaps README/product docs |
| `docs/research/agentic-coding-principles.md` | research-doc | 27 | OK | research/doctrine doc inspected; no raw-research-to-active-truth issue found |
| `docs/security/context-poisoning.md` | security-doc | 18 | OK | security doc inspected; aligns with protected-data/trust boundary constraints |
| `docs/security/mcp-later.md` | security-doc | 15 | OK | security doc inspected; aligns with protected-data/trust boundary constraints |
| `docs/security/trust-boundaries.md` | security-doc | 18 | OK | security doc inspected; aligns with protected-data/trust boundary constraints |
| `docs/specs/build-time-skills.md` | spec-doc | 21 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/codex-noninteractive-feasibility.md` | spec-doc | 30 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/config-doctor.schema.md` | spec-doc | 63 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/context-package.schema.md` | spec-doc | 56 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/doctor-result.schema.md` | spec-doc | 42 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/dogfood-result.schema.md` | spec-doc | 68 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/downstream-acceptance.md` | spec-doc | 60 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/eval-result.schema.md` | spec-doc | 54 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/graph-lite.md` | spec-doc | 74 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/handoff.md` | spec-doc | 26 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/hooks-pack.md` | spec-doc | 90 | FLAGGED | GOAL target doc: compact guardrail and config ownership coverage need update |
| `docs/specs/install-result.schema.md` | spec-doc | 51 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/krn-config.schema.md` | spec-doc | 53 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/memory.schema.md` | spec-doc | 45 | FLAGGED | GOAL target doc: dirty-write behavior and future TTL/tag growth note need update |
| `docs/specs/onboarding.md` | spec-doc | 40 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/operator-report.schema.md` | spec-doc | 94 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/operator-summary.schema.md` | spec-doc | 247 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/real-repo-execution-result.schema.md` | spec-doc | 179 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/release-check.schema.md` | spec-doc | 142 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/reviewer-result.schema.md` | spec-doc | 168 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/run-result.schema.md` | spec-doc | 108 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/runtime-skill-adapter.md` | spec-doc | 27 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/task-contract.schema.md` | spec-doc | 24 | FLAGGED | GOAL target doc: acceptance/proof need normalized structured helper semantics |
| `docs/specs/trace.schema.md` | spec-doc | 62 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/uninstall-result.schema.md` | spec-doc | 50 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/verify-result.schema.md` | spec-doc | 52 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `docs/specs/wordpress-acf-detector.md` | spec-doc | 24 | OK | spec doc inspected; no mismatch with current cleanup goal found |
| `examples/README.md` | example | 3 | OK | example downstream artifact inspected; intentional adapter/demo coverage |
| `examples/wordpress-bedrock-acf/.agents/skills/krn-harness/SKILL.md` | example | 8 | OK | example downstream artifact inspected; intentional adapter/demo coverage |
| `examples/wordpress-bedrock-acf/AGENTS.md` | example | 8 | OK | example downstream artifact inspected; intentional adapter/demo coverage |
| `examples/wordpress-bedrock-acf/krn.config.json` | example | 9 | OK | example downstream artifact inspected; intentional adapter/demo coverage |
| `fixtures/README.md` | fixture | 6 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/skills/explicit-krn-skill.md` | fixture | 20 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/skills/implicit-krn-skill.md` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/skills/no-skill-baseline.md` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/skills/wp-acf-baseline.md` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/skills/wp-acf-explicit-krn-skill.md` | fixture | 25 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/skills/wp-acf-implicit-krn-skill.md` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/do-not-use-trap.json` | fixture | 12 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/handoff-required-task.json` | fixture | 17 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/missing-context-stop.json` | fixture | 12 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/package-owned-source-test.json` | fixture | 17 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/product-code-tax-dogfood.json` | fixture | 36 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/product-code-test-dogfood.json` | fixture | 25 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/simple-source-edit.json` | fixture | 12 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/stale-doc-trap.json` | fixture | 12 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/test-required-edit.json` | fixture | 16 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/verify-required-task.json` | fixture | 16 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-acf-field-mapping.json` | fixture | 48 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-acf-hero-copy.json` | fixture | 45 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-acf-theme-index.json` | fixture | 13 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-css-token-change.json` | fixture | 32 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-handoff-required.json` | fixture | 43 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-js-data-attribute.json` | fixture | 47 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-missing-context-stop.json` | fixture | 29 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-package-owned-source-test.json` | fixture | 29 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/dogfood/tasks/wp-stale-doc-trap.json` | fixture | 31 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/hooks/guardrail-matrix.json` | fixture | 441 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/hooks/remediation-taxonomy.json` | fixture | 97 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/docs-heavy-stale/README.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/docs-heavy-stale/docs/old-plan.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/downstream-basic/README.md` | fixture | 37 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/downstream-basic/docs/overview.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/downstream-basic/docs/stale.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/downstream-basic/krn.config.json` | fixture | 25 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/downstream-basic/package.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/downstream-basic/src/index.test.ts` | test | 5 | OK | test file inspected (5 lines); no cleanup issue found |
| `fixtures/repos/downstream-basic/src/index.ts` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/frontend-section-context/README.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/frontend-section-context/acf-json/section.json` | fixture | 12 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/frontend-section-context/theme/assets/section.css` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/frontend-section-context/theme/templates/section.php` | fixture | 6 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/missing-context-stop/README.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/missing-context-stop/src/index.ts` | fixture | 1 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/README.md` | fixture | 42 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/docs/current-pricing.md` | fixture | 6 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/docs/current-tax.md` | fixture | 7 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/docs/stale-pricing.md` | fixture | 6 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/docs/stale-tax.md` | fixture | 7 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/krn.config.json` | fixture | 36 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/package.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/src/index.test.ts` | test | 11 | OK | test file inspected (11 lines); no cleanup issue found |
| `fixtures/repos/product-code-dogfood/src/index.ts` | fixture | 5 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/product-code-dogfood/src/regional-tax.test.ts` | test | 11 | OK | test file inspected (11 lines); no cleanup issue found |
| `fixtures/repos/product-code-dogfood/src/regional-tax.ts` | fixture | 10 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/runtime-skill-harness-basic/.agents/skills/krn-harness/SKILL.md` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/runtime-skill-harness-basic/README.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-basic/README.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-basic/acf-json/group-basic.json` | fixture | 5 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-basic/composer.json` | fixture | 7 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-stale-docs/README.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-stale-docs/docs/field-map.md` | fixture | 3 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/README.md` | fixture | 12 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/acf/group_hero.json` | fixture | 18 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/acf/legacy_group.json` | fixture | 13 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/docs/current-architecture.md` | fixture | 10 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/docs/do-not-use.md` | fixture | 5 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/docs/legacy-css-notes.md` | fixture | 5 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/docs/stale-acf-notes.md` | fixture | 5 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/docs/visual-requirements.md` | fixture | 11 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/krn.config.json` | fixture | 25 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/package.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/src/theme/acf-fields.php` | fixture | 11 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/src/theme/assets/hero.css` | fixture | 22 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/src/theme/assets/hero.js` | fixture | 6 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/src/theme/functions.php` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/src/theme/inc/helpers.php` | fixture | 5 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/src/theme/template-parts/card-grid.php` | fixture | 9 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/src/theme/template-parts/hero.php` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/repos/wordpress-acf-theme/tests/theme.test.js` | fixture | 24 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/downstream-basic-package-context.json` | fixture | 9 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/frontend-section-context.json` | fixture | 14 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/memory-broad-term-negative.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/memory-explicit-opt-out.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/memory-polish-explicit-request.json` | fixture | 7 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/memory-polish-opt-out.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/memory-polish-prior-decisions-opt-out.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/missing-context-stop.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/product-code-tax-dogfood.json` | fixture | 14 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/product-code-test-dogfood.json` | fixture | 14 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/research-only-no-edit.json` | fixture | 7 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/runtime-skill-adapter-required.json` | fixture | 7 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/tasks/stale-doc-trap.json` | fixture | 8 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `fixtures/verify/pass.cjs` | fixture | 1 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `krn.config.json` | json | 19 | OK | JSON config/fixture inspected; no cleanup issue found |
| `package.json` | package-json | 22 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/cli/package.json` | package-json | 10 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/cli/src/artifact-scope.ts` | source | 202 | OK | source file inspected (202 lines); no cleanup issue found |
| `packages/cli/src/bin.js` | fixture | 34 | OK | fixture/test data inspected; intentional deterministic coverage, no cleanup issue found |
| `packages/cli/src/commands/artifacts.ts` | source | 310 | OK | source file inspected (310 lines); no cleanup issue found |
| `packages/cli/src/commands/config.ts` | source | 332 | OK | source file inspected (332 lines); no cleanup issue found |
| `packages/cli/src/commands/context.ts` | source | 36 | OK | source file inspected (36 lines); no cleanup issue found |
| `packages/cli/src/commands/doctor.ts` | source | 38 | OK | source file inspected (38 lines); no cleanup issue found |
| `packages/cli/src/commands/eval.ts` | source | 39 | OK | source file inspected (39 lines); no cleanup issue found |
| `packages/cli/src/commands/graph.ts` | source | 53 | OK | source file inspected (53 lines); no cleanup issue found |
| `packages/cli/src/commands/handoff.ts` | source | 349 | OK | source file inspected (349 lines); no cleanup issue found |
| `packages/cli/src/commands/hook.ts` | source | 68 | OK | source file inspected (68 lines); no cleanup issue found |
| `packages/cli/src/commands/install.ts` | source | 164 | OK | source file inspected (164 lines); no cleanup issue found |
| `packages/cli/src/commands/memory.ts` | source | 193 | OK | source file inspected (193 lines); no cleanup issue found |
| `packages/cli/src/commands/release-check.ts` | source | 819 | FLAGGED | GOAL target: duplicated bundle copy/normalize helpers; current-artifact reader/copy utility candidate |
| `packages/cli/src/commands/report.ts` | source | 263 | FLAGGED | GOAL target adjacency: report should consume shared artifact/current path helpers instead of drifting locally |
| `packages/cli/src/commands/review.ts` | source | 692 | FLAGGED | GOAL target: duplicated readJson/readText/exists helpers |
| `packages/cli/src/commands/run.ts` | source | 748 | FLAGGED | GOAL target: duplicated bundle copy/normalize helpers and run artifact constants |
| `packages/cli/src/commands/start.ts` | source | 262 | OK | source file inspected (262 lines); no cleanup issue found |
| `packages/cli/src/commands/status.ts` | source | 23 | OK | source file inspected (23 lines); no cleanup issue found |
| `packages/cli/src/commands/summary.ts` | source | 86 | OK | source file inspected (86 lines); no cleanup issue found |
| `packages/cli/src/commands/uninstall.ts` | source | 137 | OK | source file inspected (137 lines); no cleanup issue found |
| `packages/cli/src/commands/verify.ts` | source | 122 | OK | source file inspected (122 lines); no cleanup issue found |
| `packages/cli/src/current-state.ts` | source | 61 | OK | source file inspected (61 lines); no cleanup issue found |
| `packages/cli/src/identity.ts` | source | 99 | OK | source file inspected (99 lines); no cleanup issue found |
| `packages/cli/src/index.test.ts` | test | 4964 | FLAGGED | large omnibus CLI test file (4964 lines); intentionally broad but a future characterization split candidate |
| `packages/cli/src/index.ts` | source | 157 | OK | source file inspected (157 lines); no cleanup issue found |
| `packages/cli/src/install-lifecycle.ts` | source | 380 | OK | source file inspected (380 lines); no cleanup issue found |
| `packages/cli/src/operator-report.ts` | source | 515 | FLAGGED | adjacent duplicate helper logic: unique/markdownList/current summary readers/report rendering helpers |
| `packages/cli/src/operator-summary.ts` | source | 976 | FLAGGED | GOAL target: duplicated current artifact readers/status helpers plus large summary renderer |
| `packages/cli/src/run-result.ts` | source | 134 | OK | source file inspected (134 lines); no cleanup issue found |
| `packages/cli/src/run-trace.ts` | source | 217 | OK | source file inspected (217 lines); no cleanup issue found |
| `packages/cli/src/runtime.ts` | source | 31 | OK | source file inspected (31 lines); no cleanup issue found |
| `packages/codex-adapter/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/codex-adapter/src/generate-adapter.test.ts` | test | 92 | OK | test file inspected (92 lines); no cleanup issue found |
| `packages/codex-adapter/src/generate-agents.ts` | source | 8 | OK | source file inspected (8 lines); no cleanup issue found |
| `packages/codex-adapter/src/generate-hooks.ts` | source | 8 | OK | source file inspected (8 lines); no cleanup issue found |
| `packages/codex-adapter/src/generate-runtime-skill.ts` | source | 12 | OK | source file inspected (12 lines); no cleanup issue found |
| `packages/codex-adapter/src/index.ts` | source | 3 | OK | source file inspected (3 lines); no cleanup issue found |
| `packages/codex-adapter/src/read-template.ts` | source | 5 | OK | source file inspected (5 lines); no cleanup issue found |
| `packages/codex-adapter/src/templates/AGENTS.md.tmpl` | template | 22 | OK | runtime template inspected; no cleanup issue found |
| `packages/codex-adapter/src/templates/hooks.json.tmpl` | template | 86 | OK | runtime template inspected; no cleanup issue found |
| `packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl` | template | 27 | OK | runtime template inspected; no cleanup issue found |
| `packages/config/fixtures/invalid-shape/krn.config.json` | json | 6 | OK | JSON config/fixture inspected; no cleanup issue found |
| `packages/config/fixtures/valid/krn.config.json` | json | 12 | OK | JSON config/fixture inspected; no cleanup issue found |
| `packages/config/fixtures/verify-profile-invalid/krn.config.json` | json | 17 | OK | JSON config/fixture inspected; no cleanup issue found |
| `packages/config/fixtures/verify-profile-unsafe/krn.config.json` | json | 11 | OK | JSON config/fixture inspected; no cleanup issue found |
| `packages/config/fixtures/verify-profile-valid/krn.config.json` | json | 23 | OK | JSON config/fixture inspected; no cleanup issue found |
| `packages/config/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/config/src/detect-config.ts` | source | 15 | OK | source file inspected (15 lines); no cleanup issue found |
| `packages/config/src/index.ts` | source | 3 | OK | source file inspected (3 lines); no cleanup issue found |
| `packages/config/src/load-config.test.ts` | test | 121 | OK | test file inspected (121 lines); no cleanup issue found |
| `packages/config/src/load-config.ts` | source | 50 | OK | source file inspected (50 lines); no cleanup issue found |
| `packages/config/src/schemas.ts` | source | 190 | OK | source file inspected (190 lines); no cleanup issue found |
| `packages/context/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/context/src/build-context-package.test.ts` | test | 1259 | FLAGGED | large context characterization test (1259 lines); intentional current safety net, not immediate cleanup target |
| `packages/context/src/build-context-package.ts` | source | 1090 | FLAGGED | large context selection/ranking module (1090 lines); intentional but future refactor-backlog hotspot |
| `packages/context/src/index.ts` | source | 6 | OK | source file inspected (6 lines); no cleanup issue found |
| `packages/context/src/memory-gate.test.ts` | test | 36 | OK | test file inspected (36 lines); no cleanup issue found |
| `packages/context/src/memory-gate.ts` | source | 39 | OK | source file inspected (39 lines); no cleanup issue found |
| `packages/context/src/rank-context.ts` | source | 7 | OK | source file inspected (7 lines); no cleanup issue found |
| `packages/context/src/render-md.ts` | source | 88 | OK | source file inspected (88 lines); no cleanup issue found |
| `packages/context/src/schema.ts` | source | 99 | OK | source file inspected (99 lines); no cleanup issue found |
| `packages/context/src/stop-policy.ts` | source | 33 | OK | source file inspected (33 lines); no cleanup issue found |
| `packages/core/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/core/src/errors.ts` | source | 16 | OK | source file inspected (16 lines); no cleanup issue found |
| `packages/core/src/fs-utils.test.ts` | test | 28 | OK | test file inspected (28 lines); no cleanup issue found |
| `packages/core/src/fs-utils.ts` | source | 18 | OK | source file inspected (18 lines); no cleanup issue found |
| `packages/core/src/index.ts` | source | 3 | OK | source file inspected (3 lines); no cleanup issue found |
| `packages/core/src/proof-taxonomy.test.ts` | test | 99 | OK | test file inspected (99 lines); no cleanup issue found |
| `packages/core/src/proof-taxonomy.ts` | source | 254 | OK | source file inspected (254 lines); no cleanup issue found |
| `packages/doctor/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/doctor/src/doctor.test.ts` | test | 1239 | FLAGGED | large doctor characterization test (1239 lines); intentional current safety net, not immediate cleanup target |
| `packages/doctor/src/doctor.ts` | source | 1401 | FLAGGED | large doctor implementation (1401 lines); intentional but future refactor-backlog hotspot |
| `packages/doctor/src/index.ts` | source | 1 | OK | source file inspected (1 lines); no cleanup issue found |
| `packages/evals/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/evals/src/docs-regression.test.ts` | test | 431 | OK | test file inspected (431 lines); no cleanup issue found |
| `packages/evals/src/dogfood.test.ts` | test | 651 | OK | test file inspected (651 lines); no cleanup issue found |
| `packages/evals/src/dogfood.ts` | source | 713 | OK | source file inspected (713 lines); no cleanup issue found |
| `packages/evals/src/fixtures.ts` | source | 63 | OK | source file inspected (63 lines); no cleanup issue found |
| `packages/evals/src/graders/context-coverage.ts` | source | 47 | OK | source file inspected (47 lines); no cleanup issue found |
| `packages/evals/src/graders/over-inclusion.ts` | source | 3 | OK | source file inspected (3 lines); no cleanup issue found |
| `packages/evals/src/graders/runtime-skill-adapter-usage.ts` | source | 3 | OK | source file inspected (3 lines); no cleanup issue found |
| `packages/evals/src/graders/stale-doc-leakage.ts` | source | 45 | OK | source file inspected (45 lines); no cleanup issue found |
| `packages/evals/src/graders/stop-precision.ts` | source | 34 | OK | source file inspected (34 lines); no cleanup issue found |
| `packages/evals/src/graders/trace-completeness.ts` | source | 25 | OK | source file inspected (25 lines); no cleanup issue found |
| `packages/evals/src/graders/types.ts` | source | 6 | OK | source file inspected (6 lines); no cleanup issue found |
| `packages/evals/src/harness-only.ts` | source | 5 | OK | source file inspected (5 lines); no cleanup issue found |
| `packages/evals/src/index.ts` | source | 12 | OK | source file inspected (12 lines); no cleanup issue found |
| `packages/evals/src/run-eval.test.ts` | test | 210 | OK | test file inspected (210 lines); no cleanup issue found |
| `packages/evals/src/run-eval.ts` | source | 1042 | FLAGGED | large eval runner (1042 lines); intentional but future refactor-backlog hotspot |
| `packages/evals/src/wp-acf-index-benchmark.test.ts` | test | 87 | OK | test file inspected (87 lines); no cleanup issue found |
| `packages/evals/src/wp-acf-index-benchmark.ts` | source | 862 | OK | source file inspected (862 lines); no cleanup issue found |
| `packages/graph/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/graph/src/build-graph.test.ts` | test | 200 | OK | test file inspected (200 lines); no cleanup issue found |
| `packages/graph/src/build-graph.ts` | source | 52 | OK | source file inspected (52 lines); no cleanup issue found |
| `packages/graph/src/detectors/acf-json.ts` | source | 61 | OK | source file inspected (61 lines); no cleanup issue found |
| `packages/graph/src/detectors/composer-json.ts` | source | 76 | OK | source file inspected (76 lines); no cleanup issue found |
| `packages/graph/src/detectors/css-class.ts` | source | 78 | OK | source file inspected (78 lines); no cleanup issue found |
| `packages/graph/src/detectors/docs-links.ts` | source | 51 | OK | source file inspected (51 lines); no cleanup issue found |
| `packages/graph/src/detectors/filesystem.ts` | source | 29 | OK | source file inspected (29 lines); no cleanup issue found |
| `packages/graph/src/detectors/git-diff.ts` | source | 8 | OK | source file inspected (8 lines); no cleanup issue found |
| `packages/graph/src/detectors/js-selector.ts` | source | 8 | OK | source file inspected (8 lines); no cleanup issue found |
| `packages/graph/src/detectors/package-conventions.ts` | source | 227 | OK | source file inspected (227 lines); no cleanup issue found |
| `packages/graph/src/detectors/package-json.ts` | source | 59 | OK | source file inspected (59 lines); no cleanup issue found |
| `packages/graph/src/detectors/php-template-part.ts` | source | 8 | OK | source file inspected (8 lines); no cleanup issue found |
| `packages/graph/src/detectors/wordpress-bedrock.ts` | source | 73 | OK | source file inspected (73 lines); no cleanup issue found |
| `packages/graph/src/graph-artifact.test.ts` | test | 181 | OK | test file inspected (181 lines); no cleanup issue found |
| `packages/graph/src/graph-artifact.ts` | source | 160 | OK | source file inspected (160 lines); no cleanup issue found |
| `packages/graph/src/graph-types.ts` | source | 29 | OK | source file inspected (29 lines); no cleanup issue found |
| `packages/graph/src/index.ts` | source | 14 | OK | source file inspected (14 lines); no cleanup issue found |
| `packages/graph/src/path-utils.ts` | source | 45 | OK | source file inspected (45 lines); no cleanup issue found |
| `packages/hooks/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/hooks/src/codex-hook-entry.test.ts` | test | 619 | FLAGGED | GOAL target tests: add compact guardrail/config ownership coverage |
| `packages/hooks/src/codex-hook-entry.ts` | source | 1023 | FLAGGED | GOAL target: PreCompact/PostCompact warnings and config ownership hints are under-covered |
| `packages/hooks/src/events/post-compact.ts` | source | 1 | OK | source file inspected (1 lines); no cleanup issue found |
| `packages/hooks/src/events/post-tool-use.ts` | source | 1 | OK | source file inspected (1 lines); no cleanup issue found |
| `packages/hooks/src/events/pre-compact.ts` | source | 1 | OK | source file inspected (1 lines); no cleanup issue found |
| `packages/hooks/src/events/pre-tool-use.ts` | source | 1 | OK | source file inspected (1 lines); no cleanup issue found |
| `packages/hooks/src/events/session-start.ts` | source | 1 | OK | source file inspected (1 lines); no cleanup issue found |
| `packages/hooks/src/events/stop.ts` | source | 1 | OK | source file inspected (1 lines); no cleanup issue found |
| `packages/hooks/src/events/user-prompt-submit.ts` | source | 1 | OK | source file inspected (1 lines); no cleanup issue found |
| `packages/hooks/src/guardrail-fixtures.ts` | source | 252 | OK | source file inspected (252 lines); no cleanup issue found |
| `packages/hooks/src/index.ts` | source | 8 | OK | source file inspected (8 lines); no cleanup issue found |
| `packages/memory/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/memory/src/approve.ts` | source | 17 | OK | source file inspected (17 lines); no cleanup issue found |
| `packages/memory/src/compact.ts` | source | 5 | OK | source file inspected (5 lines); no cleanup issue found |
| `packages/memory/src/deprecate.ts` | source | 20 | OK | source file inspected (20 lines); no cleanup issue found |
| `packages/memory/src/index.ts` | source | 7 | OK | source file inspected (7 lines); no cleanup issue found |
| `packages/memory/src/memory-store.test.ts` | test | 113 | FLAGGED | GOAL target tests: no unchanged-store write assertion yet |
| `packages/memory/src/memory-store.ts` | source | 176 | FLAGGED | GOAL target: putRecord writes pending/approved/deprecated stores every time |
| `packages/memory/src/pending.ts` | source | 37 | OK | source file inspected (37 lines); no cleanup issue found |
| `packages/memory/src/schema.ts` | source | 23 | OK | source file inspected (23 lines); no cleanup issue found |
| `packages/memory/src/snapshot.ts` | source | 5 | OK | source file inspected (5 lines); no cleanup issue found |
| `packages/task-contract/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/task-contract/src/build-contract.test.ts` | test | 110 | FLAGGED | GOAL target tests: acceptance/proof remain plain string arrays only |
| `packages/task-contract/src/build-contract.ts` | source | 61 | FLAGGED | GOAL target: default acceptance/proof strings lack normalized structured helpers |
| `packages/task-contract/src/classify-task.ts` | source | 54 | OK | source file inspected (54 lines); no cleanup issue found |
| `packages/task-contract/src/index.ts` | source | 5 | FLAGGED | GOAL target export point for normalized acceptance/proof helpers |
| `packages/task-contract/src/intent-quality.ts` | source | 84 | OK | source file inspected (84 lines); no cleanup issue found |
| `packages/task-contract/src/schema.ts` | source | 33 | FLAGGED | GOAL target: acceptance/proof remain unstructured string arrays; add optional helper types/functions |
| `packages/task-contract/src/validate-contract.ts` | source | 43 | OK | source file inspected (43 lines); no cleanup issue found |
| `packages/trace/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/trace/src/index.ts` | source | 4 | OK | source file inspected (4 lines); no cleanup issue found |
| `packages/trace/src/schema.ts` | source | 36 | OK | source file inspected (36 lines); no cleanup issue found |
| `packages/trace/src/task-id.ts` | source | 10 | OK | source file inspected (10 lines); no cleanup issue found |
| `packages/trace/src/trace-docs.test.ts` | test | 17 | OK | test file inspected (17 lines); no cleanup issue found |
| `packages/trace/src/trace-events.ts` | source | 27 | OK | source file inspected (27 lines); no cleanup issue found |
| `packages/trace/src/trace-writer.test.ts` | test | 93 | OK | test file inspected (93 lines); no cleanup issue found |
| `packages/trace/src/trace-writer.ts` | source | 27 | OK | source file inspected (27 lines); no cleanup issue found |
| `packages/verify/package.json` | package-json | 7 | OK | package metadata inspected; no dependency/surface drift found |
| `packages/verify/src/command-policy.ts` | source | 124 | OK | source file inspected (124 lines); no cleanup issue found |
| `packages/verify/src/index.ts` | source | 6 | OK | source file inspected (6 lines); no cleanup issue found |
| `packages/verify/src/profiles/docs.ts` | source | 6 | OK | source file inspected (6 lines); no cleanup issue found |
| `packages/verify/src/profiles/frontend.ts` | source | 6 | OK | source file inspected (6 lines); no cleanup issue found |
| `packages/verify/src/profiles/generic.ts` | source | 6 | OK | source file inspected (6 lines); no cleanup issue found |
| `packages/verify/src/profiles/wordpress.ts` | source | 6 | OK | source file inspected (6 lines); no cleanup issue found |
| `packages/verify/src/verify.test.ts` | test | 511 | OK | test file inspected (511 lines); no cleanup issue found |
| `packages/verify/src/verify.ts` | source | 682 | OK | source file inspected (682 lines); no cleanup issue found |
| `pnpm-lock.yaml` | yaml | 1186 | FLAGGED | large generated dependency lockfile; inspected for size only, do not hand-edit |
| `pnpm-workspace.yaml` | yaml | 2 | OK | YAML config inspected; no cleanup issue found |
| `scripts/codex-dogfood-smoke.sh` | script | 95 | OK | script inspected; no cleanup issue found |
| `scripts/codex-hook-trust-probe.sh` | script | 53 | OK | script inspected; no cleanup issue found |
| `scripts/krn-dogfood-preflight.sh` | script | 101 | OK | script inspected; no cleanup issue found |
| `scripts/krn-local-shim.sh` | script | 24 | OK | script inspected; no cleanup issue found |
| `scripts/krn-real-repo-dogfood.sh` | script | 263 | OK | script inspected; no cleanup issue found |
| `scripts/krn-real-repo-execution-report.sh` | script | 396 | FLAGGED | legacy script duplicates JSON/text reading and real-repo reporting outside primary krn run workflow |
| `scripts/krn-real-repo-preflight.sh` | script | 460 | OK | script inspected; no cleanup issue found |
| `tsconfig.json` | json | 17 | OK | JSON config/fixture inspected; no cleanup issue found |
| `vitest.config.ts` | source | 8 | OK | source file inspected (8 lines); no cleanup issue found |

## Result

This audit supersedes the earlier five-file bloat-map draft. It does not authorize touching protected scratch, adding CLI surfaces, adding bundle commands, or working on hooks/MCP/vector/dashboard/subagents beyond the narrow GOAL-approved hook guardrail/doc updates.
