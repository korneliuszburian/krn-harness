# 2026-06-15 Total Cleanup Complete File Audit

## Scope

- Baseline source floor: `de38cd06b09cd7a2a684a82cd3710919ba74dc55` or newer.
- Source files inspected: `398` (tracked: `377`, new source-intended untracked: `21`).
- Protected scratch observed but not content-read or staged: `5`.
- Audit status vocabulary is binary: `FLAGGED` means active burn-down risk/intentional quarantine; `NOT FLAGGED` means inspected with no active burn-down flag.
- Runtime `.krn/**`, `node_modules/**`, and protected scratch files are excluded from content inspection.

## Inspection Method

- Inventory: `git ls-files`, `git ls-files --others --exclude-standard`, and `git status --short --branch`.
- Content: every source file listed in the complete ledger was opened and read by the audit generator.
- Classification: line count, path role, tracked/source-untracked source, prior bloat-map membership, and current P0 scope risk.
- Manual review: all `FLAGGED` files and all split CLI/doc/script clusters were reviewed directly during the burn-down.

## Summary

- Inspected source files `398`.
- `FLAGGED`: `9`.
- `NOT FLAGGED`: `389`.
- Target met: active tracked/source flagged count is `<= 10`.
- Remaining flags are intentional quarantines or protected/generated ownership boundaries.

## Active Flagged Files

| Path | Source | Kind | Lines | Status | Finding |
| --- | --- | --- | ---: | --- | --- |
| `.gitignore` | tracked | other | 7 | FLAGGED | protected scratch: dirty operator-owned ignore state; leave unstaged |
| `packages/context/src/build-context-package.test.ts` | tracked | test | 1259 | FLAGGED | quarantined context characterization safety net paired with source monolith |
| `packages/context/src/build-context-package.ts` | tracked | source | 1090 | FLAGGED | quarantined context algorithm monolith; future characterization-backed extraction |
| `packages/doctor/src/doctor.test.ts` | tracked | test | 1239 | FLAGGED | quarantined doctor characterization safety net paired with source monolith |
| `packages/doctor/src/doctor.ts` | tracked | source | 1401 | FLAGGED | quarantined doctor implementation monolith; future characterization-backed extraction |
| `packages/evals/src/run-eval.ts` | tracked | source | 1042 | FLAGGED | quarantined eval runner monolith; future fixture/status extraction |
| `packages/hooks/src/codex-hook-entry.test.ts` | tracked | test | 708 | FLAGGED | quarantined hook characterization safety net paired with source monolith |
| `packages/hooks/src/codex-hook-entry.ts` | tracked | source | 1119 | FLAGGED | quarantined hook semantics monolith; hook-trust work remains out of scope |
| `pnpm-lock.yaml` | tracked | yaml | 1186 | FLAGGED | generated lockfile; inspect for size/ownership but do not hand-edit |

## Protected Scratch Inventory

| Path | Status | Note |
| --- | --- | --- |
| `ARCHITECTURE-AUDIT.md` | FLAGGED | protected scratch observed from git inventory only; content not read, not edited, not staged |
| `GOAL-8H.md` | FLAGGED | protected scratch observed from git inventory only; content not read, not edited, not staged |
| `GOAL.md` | FLAGGED | protected scratch observed from git inventory only; content not read, not edited, not staged |
| `docs/audit/documentation-audit-2026-06-14.md` | FLAGGED | protected scratch observed from git inventory only; content not read, not edited, not staged |
| `docs/audit/krn-harness-comprehensive-audit-2026-06-14.md` | FLAGGED | protected scratch observed from git inventory only; content not read, not edited, not staged |

## Complete File Ledger

| Path | Source | Kind | Lines | Status | What was inspected |
| --- | --- | --- | ---: | --- | --- |
| `.agents/skills/buduj/SKILL.md` | tracked | build-skill | 40 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/buduj/agents/openai.yaml` | tracked | build-skill | 4 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/handoff/SKILL.md` | tracked | build-skill | 27 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/handoff/agents/openai.yaml` | tracked | build-skill | 4 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/kanon/SKILL.md` | tracked | build-skill | 30 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/kanon/agents/openai.yaml` | tracked | build-skill | 4 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/pilnuj/SKILL.md` | tracked | build-skill | 42 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/pilnuj/agents/openai.yaml` | tracked | build-skill | 4 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/wycinek/SKILL.md` | tracked | build-skill | 37 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.agents/skills/wycinek/agents/openai.yaml` | tracked | build-skill | 4 | NOT FLAGGED | full text read; build-skill role checked, no active burn-down flag |
| `.editorconfig` | tracked | other | 11 | NOT FLAGGED | full text read; other role checked, no active burn-down flag |
| `.github/workflows/verify.yml` | tracked | yaml | 54 | NOT FLAGGED | full text read; yaml role checked, no active burn-down flag |
| `.gitignore` | tracked | other | 7 | FLAGGED | protected scratch: dirty operator-owned ignore state; leave unstaged |
| `AGENTS.md` | tracked | doc | 185 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `README.md` | tracked | doc | 220 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `biome.json` | tracked | json | 23 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `docs/adr/ADR-0001-codex-first-harness.md` | tracked | adr | 31 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0002-runtime-layout.md` | tracked | adr | 31 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0003-task-contract-and-context-package.md` | tracked | adr | 32 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0004-codex-hooks-as-guardrails.md` | tracked | adr | 30 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0005-graph-lite-before-ast.md` | tracked | adr | 31 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0006-governed-memory.md` | tracked | adr | 40 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0007-trace-based-evals.md` | tracked | adr | 31 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0008-build-time-skills-vs-runtime-skills.md` | tracked | adr | 30 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0009-krn-search-skills-as-inspiration.md` | tracked | adr | 31 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0010-skills-created-through-skill-creator.md` | tracked | adr | 31 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0011-local-current-evidence.md` | tracked | adr | 37 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0012-future-codex-exec-wrapper.md` | tracked | adr | 45 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0013-dogfood-cli-identity-and-real-repo-preflight.md` | tracked | adr | 52 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0014-dashboard-lite-read-only-report-viewer.md` | tracked | adr | 55 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0015-mcp-read-only-contract-spike.md` | tracked | adr | 57 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0016-retrieval-vector-experiment-harness.md` | tracked | adr | 47 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/ADR-0017-verify-execute-policy.md` | tracked | adr | 91 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/adr/README.md` | tracked | adr | 21 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/architecture/architecture-spec-v0.1.md` | tracked | doc | 91 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/architecture/glossary.md` | tracked | doc | 10 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/architecture/non-goals.md` | tracked | doc | 18 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/architecture/research-baseline-v0.1.md` | tracked | doc | 67 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/demo/codex-dogfood.md` | tracked | demo-doc | 214 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/demo/downstream-basic-demo.md` | tracked | demo-doc | 75 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/demo/hook-trust-probe-example.json` | tracked | demo-doc | 15 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/demo/real-repo-dogfood.md` | tracked | demo-doc | 329 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/handoffs/2026-06-13-goal-8h-readiness-slice.md` | tracked | handoff | 60 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-13-wp-acf-dogfood-evidence.md` | tracked | handoff | 134 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-approved-krn-llm-wiki-manual-codex.md` | tracked | handoff | 277 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-first-real-repo-codex-execution.md` | tracked | handoff | 158 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-hook-trust-probe.md` | tracked | handoff | 219 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-non-doc-krn-llm-wiki-config-dogfood.md` | tracked | handoff | 130 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-p0-p1-entry-decision.md` | tracked | handoff | 58 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-real-repo-codex-execution-verify-context.md` | tracked | handoff | 280 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-real-repo-dogfood-skipped.md` | tracked | handoff | 59 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-real-repo-executable-verify.md` | tracked | handoff | 265 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-14-real-repo-execution-result-schema.md` | tracked | handoff | 130 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-15-krn-llm-wiki-beta-install-config-smoke.md` | tracked | handoff | 39 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-15-product-code-dogfood-fixture.md` | tracked | handoff | 42 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-15-real-target-krn-run-product-code-proof.md` | tracked | handoff | 66 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-15-total-bloat-burn-down-plan.md` | source-untracked | handoff | 61 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-15-total-bloat-burn-down-result.md` | source-untracked | handoff | 80 | NOT FLAGGED | full text read; historical/current handoff evidence artifact, no active burn-down flag |
| `docs/handoffs/2026-06-15-total-cleanup-bloat-map.md` | tracked | handoff | 451 | NOT FLAGGED | full text read; complete generated audit artifact required by current goal |
| `docs/product/evidence-matrix.md` | tracked | product-doc | 60 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/knowledge-condensation.md` | tracked | product-doc | 50 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/mvp-state.md` | tracked | product-doc | 94 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/next-implementation-backlog.md` | tracked | product-doc | 83 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/operator-console.md` | tracked | product-doc | 43 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/p0-exit-criteria.md` | tracked | product-doc | 45 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/p0-p1-decision.md` | tracked | product-doc | 84 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/p1-entry-contract.md` | tracked | product-doc | 45 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/refactor-backlog.md` | tracked | product-doc | 118 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/research-backed-architecture.md` | tracked | product-doc | 98 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/reviewers.md` | tracked | product-doc | 93 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/stage-scorecard.md` | tracked | product-doc | 49 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/subagent-contracts.md` | tracked | product-doc | 31 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/target-adoption/krn-llm-wiki-krn-config-proposal.md` | tracked | product-doc | 222 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/product/target-adoption/krn-llm-wiki-product-code-dogfood-decision.md` | tracked | product-doc | 124 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/release/checklist.md` | tracked | release-doc | 113 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/releases/v0.1-local-tool-candidate.md` | tracked | release-doc | 91 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/research/agentic-coding-principles.md` | tracked | research-doc | 27 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/security/context-poisoning.md` | tracked | security-doc | 18 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/security/mcp-later.md` | tracked | security-doc | 15 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/security/trust-boundaries.md` | tracked | security-doc | 18 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/build-time-skills.md` | tracked | spec-doc | 21 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/codex-noninteractive-feasibility.md` | tracked | spec-doc | 30 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/config-doctor.schema.md` | tracked | spec-doc | 63 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/context-package.schema.md` | tracked | spec-doc | 56 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/doctor-result.schema.md` | tracked | spec-doc | 42 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/dogfood-result.schema.md` | tracked | spec-doc | 68 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/downstream-acceptance.md` | tracked | spec-doc | 60 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/eval-result.schema.md` | tracked | spec-doc | 54 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/graph-lite.md` | tracked | spec-doc | 74 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/handoff.md` | tracked | spec-doc | 26 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/hooks-pack.md` | tracked | spec-doc | 92 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/install-result.schema.md` | tracked | spec-doc | 51 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/krn-config.schema.md` | tracked | spec-doc | 53 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/memory.schema.md` | tracked | spec-doc | 47 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/onboarding.md` | tracked | spec-doc | 40 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/operator-report.schema.md` | tracked | spec-doc | 94 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/operator-summary.schema.md` | tracked | spec-doc | 247 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/real-repo-execution-result.schema.md` | tracked | spec-doc | 179 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/release-check.schema.md` | tracked | spec-doc | 142 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/reviewer-result.schema.md` | tracked | spec-doc | 168 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/run-result.schema.md` | tracked | spec-doc | 108 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/runtime-skill-adapter.md` | tracked | spec-doc | 27 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/task-contract.schema.md` | tracked | spec-doc | 28 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/trace.schema.md` | tracked | spec-doc | 62 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/uninstall-result.schema.md` | tracked | spec-doc | 50 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/verify-result.schema.md` | tracked | spec-doc | 52 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `docs/specs/wordpress-acf-detector.md` | tracked | spec-doc | 24 | NOT FLAGGED | full text read; documentation/canon role checked, no active burn-down flag |
| `examples/README.md` | tracked | example | 3 | NOT FLAGGED | full text read; example role checked, no active burn-down flag |
| `examples/wordpress-bedrock-acf/.agents/skills/krn-harness/SKILL.md` | tracked | example | 8 | NOT FLAGGED | full text read; example role checked, no active burn-down flag |
| `examples/wordpress-bedrock-acf/AGENTS.md` | tracked | example | 8 | NOT FLAGGED | full text read; example role checked, no active burn-down flag |
| `examples/wordpress-bedrock-acf/krn.config.json` | tracked | example | 9 | NOT FLAGGED | full text read; example role checked, no active burn-down flag |
| `fixtures/README.md` | tracked | fixture | 6 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/skills/explicit-krn-skill.md` | tracked | fixture | 20 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/skills/implicit-krn-skill.md` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/skills/no-skill-baseline.md` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/skills/wp-acf-baseline.md` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/skills/wp-acf-explicit-krn-skill.md` | tracked | fixture | 25 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/skills/wp-acf-implicit-krn-skill.md` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/do-not-use-trap.json` | tracked | fixture | 12 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/handoff-required-task.json` | tracked | fixture | 17 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/missing-context-stop.json` | tracked | fixture | 12 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/package-owned-source-test.json` | tracked | fixture | 17 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/product-code-tax-dogfood.json` | tracked | fixture | 36 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/product-code-test-dogfood.json` | tracked | fixture | 25 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/simple-source-edit.json` | tracked | fixture | 12 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/stale-doc-trap.json` | tracked | fixture | 12 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/test-required-edit.json` | tracked | fixture | 16 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/verify-required-task.json` | tracked | fixture | 16 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-acf-field-mapping.json` | tracked | fixture | 48 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-acf-hero-copy.json` | tracked | fixture | 45 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-acf-theme-index.json` | tracked | fixture | 13 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-css-token-change.json` | tracked | fixture | 32 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-handoff-required.json` | tracked | fixture | 43 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-js-data-attribute.json` | tracked | fixture | 47 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-missing-context-stop.json` | tracked | fixture | 29 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-package-owned-source-test.json` | tracked | fixture | 29 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/dogfood/tasks/wp-stale-doc-trap.json` | tracked | fixture | 31 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/hooks/guardrail-matrix.json` | tracked | fixture | 441 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/hooks/remediation-taxonomy.json` | tracked | fixture | 119 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/docs-heavy-stale/README.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/docs-heavy-stale/docs/old-plan.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/downstream-basic/README.md` | tracked | fixture | 37 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/downstream-basic/docs/overview.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/downstream-basic/docs/stale.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/downstream-basic/krn.config.json` | tracked | fixture | 25 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/downstream-basic/package.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/downstream-basic/src/index.test.ts` | tracked | fixture | 5 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/downstream-basic/src/index.ts` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/frontend-section-context/README.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/frontend-section-context/acf-json/section.json` | tracked | fixture | 12 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/frontend-section-context/theme/assets/section.css` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/frontend-section-context/theme/templates/section.php` | tracked | fixture | 6 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/missing-context-stop/README.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/missing-context-stop/src/index.ts` | tracked | fixture | 1 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/README.md` | tracked | fixture | 42 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/docs/current-pricing.md` | tracked | fixture | 6 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/docs/current-tax.md` | tracked | fixture | 7 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/docs/stale-pricing.md` | tracked | fixture | 6 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/docs/stale-tax.md` | tracked | fixture | 7 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/krn.config.json` | tracked | fixture | 36 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/package.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/src/index.test.ts` | tracked | fixture | 11 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/src/index.ts` | tracked | fixture | 5 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/src/regional-tax.test.ts` | tracked | fixture | 11 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/product-code-dogfood/src/regional-tax.ts` | tracked | fixture | 10 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/runtime-skill-harness-basic/.agents/skills/krn-harness/SKILL.md` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/runtime-skill-harness-basic/README.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-basic/README.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-basic/acf-json/group-basic.json` | tracked | fixture | 5 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-basic/composer.json` | tracked | fixture | 7 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-stale-docs/README.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-stale-docs/docs/field-map.md` | tracked | fixture | 3 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/README.md` | tracked | fixture | 12 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/acf/group_hero.json` | tracked | fixture | 18 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/acf/legacy_group.json` | tracked | fixture | 13 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/docs/current-architecture.md` | tracked | fixture | 10 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/docs/do-not-use.md` | tracked | fixture | 5 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/docs/legacy-css-notes.md` | tracked | fixture | 5 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/docs/stale-acf-notes.md` | tracked | fixture | 5 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/docs/visual-requirements.md` | tracked | fixture | 11 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/krn.config.json` | tracked | fixture | 25 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/package.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/src/theme/acf-fields.php` | tracked | fixture | 11 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/src/theme/assets/hero.css` | tracked | fixture | 22 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/src/theme/assets/hero.js` | tracked | fixture | 6 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/src/theme/functions.php` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/src/theme/inc/helpers.php` | tracked | fixture | 5 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/src/theme/template-parts/card-grid.php` | tracked | fixture | 9 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/src/theme/template-parts/hero.php` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/repos/wordpress-acf-theme/tests/theme.test.js` | tracked | fixture | 24 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/downstream-basic-package-context.json` | tracked | fixture | 9 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/frontend-section-context.json` | tracked | fixture | 14 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/memory-broad-term-negative.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/memory-explicit-opt-out.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/memory-polish-explicit-request.json` | tracked | fixture | 7 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/memory-polish-opt-out.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/memory-polish-prior-decisions-opt-out.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/missing-context-stop.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/product-code-tax-dogfood.json` | tracked | fixture | 14 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/product-code-test-dogfood.json` | tracked | fixture | 14 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/research-only-no-edit.json` | tracked | fixture | 7 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/runtime-skill-adapter-required.json` | tracked | fixture | 7 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/tasks/stale-doc-trap.json` | tracked | fixture | 8 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `fixtures/verify/pass.cjs` | tracked | fixture | 1 | NOT FLAGGED | full text read; deterministic fixture/test data, no active burn-down flag |
| `krn.config.json` | tracked | json | 19 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `package.json` | tracked | json | 22 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/cli/package.json` | tracked | json | 10 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/cli/src/artifact-scope.ts` | tracked | source | 202 | NOT FLAGGED | full text read; TypeScript/JavaScript source (202 lines), no active burn-down flag |
| `packages/cli/src/bin.js` | tracked | source | 34 | NOT FLAGGED | full text read; TypeScript/JavaScript source (34 lines), no active burn-down flag |
| `packages/cli/src/cli-test-utils.ts` | source-untracked | source | 452 | NOT FLAGGED | full text read; new split CLI source (452 lines); no active burn-down flag |
| `packages/cli/src/commands/artifacts.ts` | tracked | source | 310 | NOT FLAGGED | full text read; TypeScript/JavaScript source (310 lines), no active burn-down flag |
| `packages/cli/src/commands/config.ts` | tracked | source | 332 | NOT FLAGGED | full text read; TypeScript/JavaScript source (332 lines), no active burn-down flag |
| `packages/cli/src/commands/context.ts` | tracked | source | 36 | NOT FLAGGED | full text read; TypeScript/JavaScript source (36 lines), no active burn-down flag |
| `packages/cli/src/commands/doctor.ts` | tracked | source | 38 | NOT FLAGGED | full text read; TypeScript/JavaScript source (38 lines), no active burn-down flag |
| `packages/cli/src/commands/eval.ts` | tracked | source | 39 | NOT FLAGGED | full text read; TypeScript/JavaScript source (39 lines), no active burn-down flag |
| `packages/cli/src/commands/graph.ts` | tracked | source | 53 | NOT FLAGGED | full text read; TypeScript/JavaScript source (53 lines), no active burn-down flag |
| `packages/cli/src/commands/handoff.ts` | tracked | source | 349 | NOT FLAGGED | full text read; TypeScript/JavaScript source (349 lines), no active burn-down flag |
| `packages/cli/src/commands/hook.ts` | tracked | source | 78 | NOT FLAGGED | full text read; TypeScript/JavaScript source (78 lines), no active burn-down flag |
| `packages/cli/src/commands/install.ts` | tracked | source | 164 | NOT FLAGGED | full text read; TypeScript/JavaScript source (164 lines), no active burn-down flag |
| `packages/cli/src/commands/memory.ts` | tracked | source | 193 | NOT FLAGGED | full text read; TypeScript/JavaScript source (193 lines), no active burn-down flag |
| `packages/cli/src/commands/release-check.ts` | tracked | source | 391 | NOT FLAGGED | full text read; TypeScript/JavaScript source (391 lines), no active burn-down flag |
| `packages/cli/src/commands/report.ts` | tracked | source | 230 | NOT FLAGGED | full text read; TypeScript/JavaScript source (230 lines), no active burn-down flag |
| `packages/cli/src/commands/review.ts` | tracked | source | 414 | NOT FLAGGED | full text read; TypeScript/JavaScript source (414 lines), no active burn-down flag |
| `packages/cli/src/commands/run.ts` | tracked | source | 392 | NOT FLAGGED | full text read; TypeScript/JavaScript source (392 lines), no active burn-down flag |
| `packages/cli/src/commands/start.ts` | tracked | source | 262 | NOT FLAGGED | full text read; TypeScript/JavaScript source (262 lines), no active burn-down flag |
| `packages/cli/src/commands/status.ts` | tracked | source | 23 | NOT FLAGGED | full text read; TypeScript/JavaScript source (23 lines), no active burn-down flag |
| `packages/cli/src/commands/summary.ts` | tracked | source | 87 | NOT FLAGGED | full text read; TypeScript/JavaScript source (87 lines), no active burn-down flag |
| `packages/cli/src/commands/uninstall.ts` | tracked | source | 137 | NOT FLAGGED | full text read; TypeScript/JavaScript source (137 lines), no active burn-down flag |
| `packages/cli/src/commands/verify.ts` | tracked | source | 122 | NOT FLAGGED | full text read; TypeScript/JavaScript source (122 lines), no active burn-down flag |
| `packages/cli/src/current-artifacts.test.ts` | tracked | test | 82 | NOT FLAGGED | full text read; focused test shard (82 lines), no active burn-down flag |
| `packages/cli/src/current-artifacts.ts` | tracked | source | 141 | NOT FLAGGED | full text read; TypeScript/JavaScript source (141 lines), no active burn-down flag |
| `packages/cli/src/current-flow.test.ts` | source-untracked | test | 800 | NOT FLAGGED | full text read; new split CLI test (800 lines); no active burn-down flag |
| `packages/cli/src/current-state.ts` | tracked | source | 61 | NOT FLAGGED | full text read; TypeScript/JavaScript source (61 lines), no active burn-down flag |
| `packages/cli/src/downstream-install-config.test.ts` | source-untracked | test | 941 | NOT FLAGGED | full text read; new split CLI test (941 lines); no active burn-down flag |
| `packages/cli/src/hooks-memory-flow.test.ts` | source-untracked | test | 524 | NOT FLAGGED | full text read; new split CLI test (524 lines); no active burn-down flag |
| `packages/cli/src/identity.ts` | tracked | source | 99 | NOT FLAGGED | full text read; TypeScript/JavaScript source (99 lines), no active burn-down flag |
| `packages/cli/src/index.test.ts` | tracked | test | 47 | NOT FLAGGED | full text read; focused test shard (47 lines), no active burn-down flag |
| `packages/cli/src/index.ts` | tracked | source | 157 | NOT FLAGGED | full text read; TypeScript/JavaScript source (157 lines), no active burn-down flag |
| `packages/cli/src/install-lifecycle.ts` | tracked | source | 380 | NOT FLAGGED | full text read; TypeScript/JavaScript source (380 lines), no active burn-down flag |
| `packages/cli/src/memory-current-flow.test.ts` | source-untracked | test | 360 | NOT FLAGGED | full text read; new split CLI test (360 lines); no active burn-down flag |
| `packages/cli/src/operator-report-render.ts` | source-untracked | source | 201 | NOT FLAGGED | full text read; new split CLI source (201 lines); no active burn-down flag |
| `packages/cli/src/operator-report.ts` | tracked | source | 315 | NOT FLAGGED | full text read; TypeScript/JavaScript source (315 lines), no active burn-down flag |
| `packages/cli/src/operator-summary-problems.ts` | source-untracked | source | 105 | NOT FLAGGED | full text read; new split CLI source (105 lines); no active burn-down flag |
| `packages/cli/src/operator-summary-real-repo.ts` | source-untracked | source | 273 | NOT FLAGGED | full text read; new split CLI source (273 lines); no active burn-down flag |
| `packages/cli/src/operator-summary-render.ts` | source-untracked | source | 74 | NOT FLAGGED | full text read; new split CLI source (74 lines); no active burn-down flag |
| `packages/cli/src/operator-summary.ts` | tracked | source | 525 | NOT FLAGGED | full text read; TypeScript/JavaScript source (525 lines), no active burn-down flag |
| `packages/cli/src/real-repo-dogfood.test.ts` | source-untracked | test | 340 | NOT FLAGGED | full text read; new split CLI test (340 lines); no active burn-down flag |
| `packages/cli/src/real-repo-review-summary.test.ts` | source-untracked | test | 696 | NOT FLAGGED | full text read; new split CLI test (696 lines); no active burn-down flag |
| `packages/cli/src/release-check-bundle.ts` | source-untracked | source | 374 | NOT FLAGGED | full text read; new split CLI source (374 lines); no active burn-down flag |
| `packages/cli/src/report-release.test.ts` | source-untracked | test | 586 | NOT FLAGGED | full text read; new split CLI test (586 lines); no active burn-down flag |
| `packages/cli/src/review-args.ts` | source-untracked | source | 39 | NOT FLAGGED | full text read; new split CLI source (39 lines); no active burn-down flag |
| `packages/cli/src/review-dogfood.ts` | source-untracked | source | 178 | NOT FLAGGED | full text read; new split CLI source (178 lines); no active burn-down flag |
| `packages/cli/src/review-render.ts` | source-untracked | source | 51 | NOT FLAGGED | full text read; new split CLI source (51 lines); no active burn-down flag |
| `packages/cli/src/run-artifacts.ts` | source-untracked | source | 137 | NOT FLAGGED | full text read; new split CLI source (137 lines); no active burn-down flag |
| `packages/cli/src/run-command.test.ts` | source-untracked | test | 342 | NOT FLAGGED | full text read; new split CLI test (342 lines); no active burn-down flag |
| `packages/cli/src/run-result-builder.ts` | source-untracked | source | 194 | NOT FLAGGED | full text read; new split CLI source (194 lines); no active burn-down flag |
| `packages/cli/src/run-result.ts` | tracked | source | 134 | NOT FLAGGED | full text read; TypeScript/JavaScript source (134 lines), no active burn-down flag |
| `packages/cli/src/run-trace.ts` | tracked | source | 217 | NOT FLAGGED | full text read; TypeScript/JavaScript source (217 lines), no active burn-down flag |
| `packages/cli/src/runtime.ts` | tracked | source | 31 | NOT FLAGGED | full text read; TypeScript/JavaScript source (31 lines), no active burn-down flag |
| `packages/codex-adapter/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/codex-adapter/src/generate-adapter.test.ts` | tracked | test | 92 | NOT FLAGGED | full text read; focused test shard (92 lines), no active burn-down flag |
| `packages/codex-adapter/src/generate-agents.ts` | tracked | source | 8 | NOT FLAGGED | full text read; TypeScript/JavaScript source (8 lines), no active burn-down flag |
| `packages/codex-adapter/src/generate-hooks.ts` | tracked | source | 8 | NOT FLAGGED | full text read; TypeScript/JavaScript source (8 lines), no active burn-down flag |
| `packages/codex-adapter/src/generate-runtime-skill.ts` | tracked | source | 12 | NOT FLAGGED | full text read; TypeScript/JavaScript source (12 lines), no active burn-down flag |
| `packages/codex-adapter/src/index.ts` | tracked | source | 3 | NOT FLAGGED | full text read; TypeScript/JavaScript source (3 lines), no active burn-down flag |
| `packages/codex-adapter/src/read-template.ts` | tracked | source | 5 | NOT FLAGGED | full text read; TypeScript/JavaScript source (5 lines), no active burn-down flag |
| `packages/codex-adapter/src/templates/AGENTS.md.tmpl` | tracked | other | 22 | NOT FLAGGED | full text read; other role checked, no active burn-down flag |
| `packages/codex-adapter/src/templates/hooks.json.tmpl` | tracked | other | 86 | NOT FLAGGED | full text read; other role checked, no active burn-down flag |
| `packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl` | tracked | other | 27 | NOT FLAGGED | full text read; other role checked, no active burn-down flag |
| `packages/config/fixtures/invalid-shape/krn.config.json` | tracked | json | 6 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/config/fixtures/valid/krn.config.json` | tracked | json | 12 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/config/fixtures/verify-profile-invalid/krn.config.json` | tracked | json | 17 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/config/fixtures/verify-profile-unsafe/krn.config.json` | tracked | json | 11 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/config/fixtures/verify-profile-valid/krn.config.json` | tracked | json | 23 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/config/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/config/src/detect-config.ts` | tracked | source | 15 | NOT FLAGGED | full text read; TypeScript/JavaScript source (15 lines), no active burn-down flag |
| `packages/config/src/index.ts` | tracked | source | 3 | NOT FLAGGED | full text read; TypeScript/JavaScript source (3 lines), no active burn-down flag |
| `packages/config/src/load-config.test.ts` | tracked | test | 121 | NOT FLAGGED | full text read; focused test shard (121 lines), no active burn-down flag |
| `packages/config/src/load-config.ts` | tracked | source | 50 | NOT FLAGGED | full text read; TypeScript/JavaScript source (50 lines), no active burn-down flag |
| `packages/config/src/schemas.ts` | tracked | source | 190 | NOT FLAGGED | full text read; TypeScript/JavaScript source (190 lines), no active burn-down flag |
| `packages/context/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/context/src/build-context-package.test.ts` | tracked | test | 1259 | FLAGGED | quarantined context characterization safety net paired with source monolith |
| `packages/context/src/build-context-package.ts` | tracked | source | 1090 | FLAGGED | quarantined context algorithm monolith; future characterization-backed extraction |
| `packages/context/src/index.ts` | tracked | source | 6 | NOT FLAGGED | full text read; TypeScript/JavaScript source (6 lines), no active burn-down flag |
| `packages/context/src/memory-gate.test.ts` | tracked | test | 36 | NOT FLAGGED | full text read; focused test shard (36 lines), no active burn-down flag |
| `packages/context/src/memory-gate.ts` | tracked | source | 39 | NOT FLAGGED | full text read; TypeScript/JavaScript source (39 lines), no active burn-down flag |
| `packages/context/src/rank-context.ts` | tracked | source | 7 | NOT FLAGGED | full text read; TypeScript/JavaScript source (7 lines), no active burn-down flag |
| `packages/context/src/render-md.ts` | tracked | source | 88 | NOT FLAGGED | full text read; TypeScript/JavaScript source (88 lines), no active burn-down flag |
| `packages/context/src/schema.ts` | tracked | source | 99 | NOT FLAGGED | full text read; TypeScript/JavaScript source (99 lines), no active burn-down flag |
| `packages/context/src/stop-policy.ts` | tracked | source | 33 | NOT FLAGGED | full text read; TypeScript/JavaScript source (33 lines), no active burn-down flag |
| `packages/core/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/core/src/errors.ts` | tracked | source | 16 | NOT FLAGGED | full text read; TypeScript/JavaScript source (16 lines), no active burn-down flag |
| `packages/core/src/fs-utils.test.ts` | tracked | test | 28 | NOT FLAGGED | full text read; focused test shard (28 lines), no active burn-down flag |
| `packages/core/src/fs-utils.ts` | tracked | source | 18 | NOT FLAGGED | full text read; TypeScript/JavaScript source (18 lines), no active burn-down flag |
| `packages/core/src/index.ts` | tracked | source | 3 | NOT FLAGGED | full text read; TypeScript/JavaScript source (3 lines), no active burn-down flag |
| `packages/core/src/proof-taxonomy.test.ts` | tracked | test | 99 | NOT FLAGGED | full text read; focused test shard (99 lines), no active burn-down flag |
| `packages/core/src/proof-taxonomy.ts` | tracked | source | 254 | NOT FLAGGED | full text read; TypeScript/JavaScript source (254 lines), no active burn-down flag |
| `packages/doctor/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/doctor/src/doctor.test.ts` | tracked | test | 1239 | FLAGGED | quarantined doctor characterization safety net paired with source monolith |
| `packages/doctor/src/doctor.ts` | tracked | source | 1401 | FLAGGED | quarantined doctor implementation monolith; future characterization-backed extraction |
| `packages/doctor/src/index.ts` | tracked | source | 1 | NOT FLAGGED | full text read; TypeScript/JavaScript source (1 lines), no active burn-down flag |
| `packages/evals/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/evals/src/docs-regression.test.ts` | tracked | test | 431 | NOT FLAGGED | full text read; focused test shard (431 lines), no active burn-down flag |
| `packages/evals/src/dogfood.test.ts` | tracked | test | 651 | NOT FLAGGED | full text read; focused test shard (651 lines), no active burn-down flag |
| `packages/evals/src/dogfood.ts` | tracked | source | 713 | NOT FLAGGED | full text read; TypeScript/JavaScript source (713 lines), no active burn-down flag |
| `packages/evals/src/fixtures.ts` | tracked | source | 63 | NOT FLAGGED | full text read; TypeScript/JavaScript source (63 lines), no active burn-down flag |
| `packages/evals/src/graders/context-coverage.ts` | tracked | source | 47 | NOT FLAGGED | full text read; TypeScript/JavaScript source (47 lines), no active burn-down flag |
| `packages/evals/src/graders/over-inclusion.ts` | tracked | source | 3 | NOT FLAGGED | full text read; TypeScript/JavaScript source (3 lines), no active burn-down flag |
| `packages/evals/src/graders/runtime-skill-adapter-usage.ts` | tracked | source | 3 | NOT FLAGGED | full text read; TypeScript/JavaScript source (3 lines), no active burn-down flag |
| `packages/evals/src/graders/stale-doc-leakage.ts` | tracked | source | 45 | NOT FLAGGED | full text read; TypeScript/JavaScript source (45 lines), no active burn-down flag |
| `packages/evals/src/graders/stop-precision.ts` | tracked | source | 34 | NOT FLAGGED | full text read; TypeScript/JavaScript source (34 lines), no active burn-down flag |
| `packages/evals/src/graders/trace-completeness.ts` | tracked | source | 25 | NOT FLAGGED | full text read; TypeScript/JavaScript source (25 lines), no active burn-down flag |
| `packages/evals/src/graders/types.ts` | tracked | source | 6 | NOT FLAGGED | full text read; TypeScript/JavaScript source (6 lines), no active burn-down flag |
| `packages/evals/src/harness-only.ts` | tracked | source | 5 | NOT FLAGGED | full text read; TypeScript/JavaScript source (5 lines), no active burn-down flag |
| `packages/evals/src/index.ts` | tracked | source | 12 | NOT FLAGGED | full text read; TypeScript/JavaScript source (12 lines), no active burn-down flag |
| `packages/evals/src/run-eval.test.ts` | tracked | test | 210 | NOT FLAGGED | full text read; focused test shard (210 lines), no active burn-down flag |
| `packages/evals/src/run-eval.ts` | tracked | source | 1042 | FLAGGED | quarantined eval runner monolith; future fixture/status extraction |
| `packages/evals/src/wp-acf-index-benchmark.test.ts` | tracked | test | 87 | NOT FLAGGED | full text read; focused test shard (87 lines), no active burn-down flag |
| `packages/evals/src/wp-acf-index-benchmark.ts` | tracked | source | 862 | NOT FLAGGED | full text read; TypeScript/JavaScript source (862 lines), no active burn-down flag |
| `packages/graph/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/graph/src/build-graph.test.ts` | tracked | test | 200 | NOT FLAGGED | full text read; focused test shard (200 lines), no active burn-down flag |
| `packages/graph/src/build-graph.ts` | tracked | source | 52 | NOT FLAGGED | full text read; TypeScript/JavaScript source (52 lines), no active burn-down flag |
| `packages/graph/src/detectors/acf-json.ts` | tracked | source | 61 | NOT FLAGGED | full text read; TypeScript/JavaScript source (61 lines), no active burn-down flag |
| `packages/graph/src/detectors/composer-json.ts` | tracked | source | 76 | NOT FLAGGED | full text read; TypeScript/JavaScript source (76 lines), no active burn-down flag |
| `packages/graph/src/detectors/css-class.ts` | tracked | source | 78 | NOT FLAGGED | full text read; TypeScript/JavaScript source (78 lines), no active burn-down flag |
| `packages/graph/src/detectors/docs-links.ts` | tracked | source | 51 | NOT FLAGGED | full text read; TypeScript/JavaScript source (51 lines), no active burn-down flag |
| `packages/graph/src/detectors/filesystem.ts` | tracked | source | 29 | NOT FLAGGED | full text read; TypeScript/JavaScript source (29 lines), no active burn-down flag |
| `packages/graph/src/detectors/git-diff.ts` | tracked | source | 8 | NOT FLAGGED | full text read; TypeScript/JavaScript source (8 lines), no active burn-down flag |
| `packages/graph/src/detectors/js-selector.ts` | tracked | source | 8 | NOT FLAGGED | full text read; TypeScript/JavaScript source (8 lines), no active burn-down flag |
| `packages/graph/src/detectors/package-conventions.ts` | tracked | source | 227 | NOT FLAGGED | full text read; TypeScript/JavaScript source (227 lines), no active burn-down flag |
| `packages/graph/src/detectors/package-json.ts` | tracked | source | 59 | NOT FLAGGED | full text read; TypeScript/JavaScript source (59 lines), no active burn-down flag |
| `packages/graph/src/detectors/php-template-part.ts` | tracked | source | 8 | NOT FLAGGED | full text read; TypeScript/JavaScript source (8 lines), no active burn-down flag |
| `packages/graph/src/detectors/wordpress-bedrock.ts` | tracked | source | 73 | NOT FLAGGED | full text read; TypeScript/JavaScript source (73 lines), no active burn-down flag |
| `packages/graph/src/graph-artifact.test.ts` | tracked | test | 181 | NOT FLAGGED | full text read; focused test shard (181 lines), no active burn-down flag |
| `packages/graph/src/graph-artifact.ts` | tracked | source | 160 | NOT FLAGGED | full text read; TypeScript/JavaScript source (160 lines), no active burn-down flag |
| `packages/graph/src/graph-types.ts` | tracked | source | 29 | NOT FLAGGED | full text read; TypeScript/JavaScript source (29 lines), no active burn-down flag |
| `packages/graph/src/index.ts` | tracked | source | 14 | NOT FLAGGED | full text read; TypeScript/JavaScript source (14 lines), no active burn-down flag |
| `packages/graph/src/path-utils.ts` | tracked | source | 45 | NOT FLAGGED | full text read; TypeScript/JavaScript source (45 lines), no active burn-down flag |
| `packages/hooks/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/hooks/src/codex-hook-entry.test.ts` | tracked | test | 708 | FLAGGED | quarantined hook characterization safety net paired with source monolith |
| `packages/hooks/src/codex-hook-entry.ts` | tracked | source | 1119 | FLAGGED | quarantined hook semantics monolith; hook-trust work remains out of scope |
| `packages/hooks/src/events/post-compact.ts` | tracked | source | 1 | NOT FLAGGED | full text read; TypeScript/JavaScript source (1 lines), no active burn-down flag |
| `packages/hooks/src/events/post-tool-use.ts` | tracked | source | 1 | NOT FLAGGED | full text read; TypeScript/JavaScript source (1 lines), no active burn-down flag |
| `packages/hooks/src/events/pre-compact.ts` | tracked | source | 1 | NOT FLAGGED | full text read; TypeScript/JavaScript source (1 lines), no active burn-down flag |
| `packages/hooks/src/events/pre-tool-use.ts` | tracked | source | 1 | NOT FLAGGED | full text read; TypeScript/JavaScript source (1 lines), no active burn-down flag |
| `packages/hooks/src/events/session-start.ts` | tracked | source | 1 | NOT FLAGGED | full text read; TypeScript/JavaScript source (1 lines), no active burn-down flag |
| `packages/hooks/src/events/stop.ts` | tracked | source | 1 | NOT FLAGGED | full text read; TypeScript/JavaScript source (1 lines), no active burn-down flag |
| `packages/hooks/src/events/user-prompt-submit.ts` | tracked | source | 1 | NOT FLAGGED | full text read; TypeScript/JavaScript source (1 lines), no active burn-down flag |
| `packages/hooks/src/guardrail-fixtures.ts` | tracked | source | 252 | NOT FLAGGED | full text read; TypeScript/JavaScript source (252 lines), no active burn-down flag |
| `packages/hooks/src/index.ts` | tracked | source | 8 | NOT FLAGGED | full text read; TypeScript/JavaScript source (8 lines), no active burn-down flag |
| `packages/memory/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/memory/src/approve.ts` | tracked | source | 17 | NOT FLAGGED | full text read; TypeScript/JavaScript source (17 lines), no active burn-down flag |
| `packages/memory/src/compact.ts` | tracked | source | 5 | NOT FLAGGED | full text read; TypeScript/JavaScript source (5 lines), no active burn-down flag |
| `packages/memory/src/deprecate.ts` | tracked | source | 20 | NOT FLAGGED | full text read; TypeScript/JavaScript source (20 lines), no active burn-down flag |
| `packages/memory/src/index.ts` | tracked | source | 7 | NOT FLAGGED | full text read; TypeScript/JavaScript source (7 lines), no active burn-down flag |
| `packages/memory/src/memory-store.test.ts` | tracked | test | 163 | NOT FLAGGED | full text read; focused test shard (163 lines), no active burn-down flag |
| `packages/memory/src/memory-store.ts` | tracked | source | 196 | NOT FLAGGED | full text read; TypeScript/JavaScript source (196 lines), no active burn-down flag |
| `packages/memory/src/pending.ts` | tracked | source | 37 | NOT FLAGGED | full text read; TypeScript/JavaScript source (37 lines), no active burn-down flag |
| `packages/memory/src/schema.ts` | tracked | source | 23 | NOT FLAGGED | full text read; TypeScript/JavaScript source (23 lines), no active burn-down flag |
| `packages/memory/src/snapshot.ts` | tracked | source | 5 | NOT FLAGGED | full text read; TypeScript/JavaScript source (5 lines), no active burn-down flag |
| `packages/task-contract/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/task-contract/src/build-contract.test.ts` | tracked | test | 110 | NOT FLAGGED | full text read; focused test shard (110 lines), no active burn-down flag |
| `packages/task-contract/src/build-contract.ts` | tracked | source | 61 | NOT FLAGGED | full text read; TypeScript/JavaScript source (61 lines), no active burn-down flag |
| `packages/task-contract/src/classify-task.ts` | tracked | source | 54 | NOT FLAGGED | full text read; TypeScript/JavaScript source (54 lines), no active burn-down flag |
| `packages/task-contract/src/index.ts` | tracked | source | 6 | NOT FLAGGED | full text read; TypeScript/JavaScript source (6 lines), no active burn-down flag |
| `packages/task-contract/src/intent-quality.ts` | tracked | source | 84 | NOT FLAGGED | full text read; TypeScript/JavaScript source (84 lines), no active burn-down flag |
| `packages/task-contract/src/normalize.test.ts` | tracked | test | 80 | NOT FLAGGED | full text read; focused test shard (80 lines), no active burn-down flag |
| `packages/task-contract/src/normalize.ts` | tracked | source | 65 | NOT FLAGGED | full text read; TypeScript/JavaScript source (65 lines), no active burn-down flag |
| `packages/task-contract/src/schema.ts` | tracked | source | 61 | NOT FLAGGED | full text read; TypeScript/JavaScript source (61 lines), no active burn-down flag |
| `packages/task-contract/src/validate-contract.ts` | tracked | source | 43 | NOT FLAGGED | full text read; TypeScript/JavaScript source (43 lines), no active burn-down flag |
| `packages/trace/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/trace/src/index.ts` | tracked | source | 4 | NOT FLAGGED | full text read; TypeScript/JavaScript source (4 lines), no active burn-down flag |
| `packages/trace/src/schema.ts` | tracked | source | 36 | NOT FLAGGED | full text read; TypeScript/JavaScript source (36 lines), no active burn-down flag |
| `packages/trace/src/task-id.ts` | tracked | source | 10 | NOT FLAGGED | full text read; TypeScript/JavaScript source (10 lines), no active burn-down flag |
| `packages/trace/src/trace-docs.test.ts` | tracked | test | 17 | NOT FLAGGED | full text read; focused test shard (17 lines), no active burn-down flag |
| `packages/trace/src/trace-events.ts` | tracked | source | 27 | NOT FLAGGED | full text read; TypeScript/JavaScript source (27 lines), no active burn-down flag |
| `packages/trace/src/trace-writer.test.ts` | tracked | test | 93 | NOT FLAGGED | full text read; focused test shard (93 lines), no active burn-down flag |
| `packages/trace/src/trace-writer.ts` | tracked | source | 27 | NOT FLAGGED | full text read; TypeScript/JavaScript source (27 lines), no active burn-down flag |
| `packages/verify/package.json` | tracked | json | 7 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `packages/verify/src/command-policy.ts` | tracked | source | 124 | NOT FLAGGED | full text read; TypeScript/JavaScript source (124 lines), no active burn-down flag |
| `packages/verify/src/index.ts` | tracked | source | 6 | NOT FLAGGED | full text read; TypeScript/JavaScript source (6 lines), no active burn-down flag |
| `packages/verify/src/profiles/docs.ts` | tracked | source | 6 | NOT FLAGGED | full text read; TypeScript/JavaScript source (6 lines), no active burn-down flag |
| `packages/verify/src/profiles/frontend.ts` | tracked | source | 6 | NOT FLAGGED | full text read; TypeScript/JavaScript source (6 lines), no active burn-down flag |
| `packages/verify/src/profiles/generic.ts` | tracked | source | 6 | NOT FLAGGED | full text read; TypeScript/JavaScript source (6 lines), no active burn-down flag |
| `packages/verify/src/profiles/wordpress.ts` | tracked | source | 6 | NOT FLAGGED | full text read; TypeScript/JavaScript source (6 lines), no active burn-down flag |
| `packages/verify/src/verify.test.ts` | tracked | test | 511 | NOT FLAGGED | full text read; focused test shard (511 lines), no active burn-down flag |
| `packages/verify/src/verify.ts` | tracked | source | 682 | NOT FLAGGED | full text read; TypeScript/JavaScript source (682 lines), no active burn-down flag |
| `pnpm-lock.yaml` | tracked | yaml | 1186 | FLAGGED | generated lockfile; inspect for size/ownership but do not hand-edit |
| `pnpm-workspace.yaml` | tracked | yaml | 2 | NOT FLAGGED | full text read; yaml role checked, no active burn-down flag |
| `scripts/codex-dogfood-smoke.sh` | tracked | script | 95 | NOT FLAGGED | full text read; script role checked, no active burn-down flag |
| `scripts/codex-hook-trust-probe.sh` | tracked | script | 53 | NOT FLAGGED | full text read; script role checked, no active burn-down flag |
| `scripts/krn-dogfood-preflight.sh` | tracked | script | 101 | NOT FLAGGED | full text read; script role checked, no active burn-down flag |
| `scripts/krn-local-shim.sh` | tracked | script | 24 | NOT FLAGGED | full text read; script role checked, no active burn-down flag |
| `scripts/krn-real-repo-dogfood.sh` | tracked | script | 263 | NOT FLAGGED | full text read; script role checked, no active burn-down flag |
| `scripts/krn-real-repo-execution-report.sh` | tracked | script | 401 | NOT FLAGGED | full text read; script role checked, no active burn-down flag |
| `scripts/krn-real-repo-preflight.sh` | tracked | script | 460 | NOT FLAGGED | full text read; script role checked, no active burn-down flag |
| `tsconfig.json` | tracked | json | 17 | NOT FLAGGED | full text read; json role checked, no active burn-down flag |
| `vitest.config.ts` | tracked | source | 8 | NOT FLAGGED | full text read; TypeScript/JavaScript source (8 lines), no active burn-down flag |
