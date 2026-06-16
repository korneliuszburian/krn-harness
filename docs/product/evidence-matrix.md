# Evidence Matrix

## Purpose

This matrix records surface-level evidence for KRN Harness. It should stay a
ledger, not a second narrative copy of `docs/product/mvp-state.md`.

It is local evidence only. It is not production proof.

| Surface / Lane | Implementation Status | Evidence Artifact | Tests | Validation | Risk | Next Proof |
| --- | --- | --- | --- | --- | --- | --- |
| CLI identity | executable | `krn doctor cli` | CLI tests | `pnpm test`, dogfood preflight | global `krn` collision | keep pinned shim evidence in dogfood |
| Condensed run workflow | executable primary operator path; v0.1 local proof threshold crossed | `.krn/current/run-result.json`, `.krn/current/run-result.md`, `.krn/current/run-bundle/manifest.json` | CLI tests, docs regression, real target proof handoff | `pnpm test`, `krn run --task`, `krn run --task-spec`, `krn run --execute-verify`, `krn run --bundle`, isolated target `krn run --task-spec ... --execute-verify --bundle` | can be mistaken for Codex execution; report warnings can be overread as production proof | freeze v0.1 before adding new surfaces |
| Task contract | executable | `.krn/current/task-contract.json` | CLI tests | `pnpm test` | weak task intent can still pass schema | richer task-spec fixtures |
| Graph-lite | executable with local import-string evidence | `.krn/graph/repo-graph.json` | graph and CLI tests | `pnpm test` | shallow detectors only; no runtime dependency inference | real repo graph noise review |
| Context package | executable; verify-profile doc-match noise narrowed from real-repo finding and rechecked during approved `krn-llm-wiki` Codex run | `.krn/current/context-package.json` | context and CLI tests | `pnpm test`, isolated `krn-llm-wiki` before/after context comparison, approved manual Codex run context check | broad tasks can still over-include shallow graph docs | repeat on broader non-doc target |
| Verify | executable, ADR-0017 governed; safe Python readonly target profile proven locally with beta 360s timeout | `.krn/current/verify-result.json` | verify and CLI tests | `pnpm test`, `pnpm verify:local`, isolated `krn-llm-wiki` `krn verify --execute` | local command evidence only | repeat on approved target with committed target config |
| Handoff | executable | `.krn/current/handoff.md` | CLI tests | `pnpm test` | generated summary may miss nuance | compare against human review |
| Doctor | executable | `.krn/current/doctor-result.json` | doctor and CLI tests | `pnpm test` | local checks only | add checks after real dogfood findings |
| Eval | executable fixture gate with rolling local regression baseline | `.krn/current/eval-result.json`, `.krn/current/eval-baseline.json`, `.krn/evals/baseline.json` | eval tests | `pnpm test`, `pnpm --silent krn eval` | fixture coverage and rolling-last-run baseline only | expand fixtures after real failures; define CLI flag semantics before compare flags |
| Product-code fixture dogfood | executable fixture proof for code/test/stale-doc loops, including multi-source localization | `fixtures/repos/product-code-dogfood`, `fixtures/dogfood/tasks/product-code-test-dogfood.json`, `fixtures/dogfood/tasks/product-code-tax-dogfood.json`, `.krn/current/verify-result.json` | CLI, context, and eval tests | `pnpm test`, fixture smokes with `krn verify --execute` and `krn verify --profile tax --execute` | synthetic fixture only; not real target mutation | repeat on approved non-protected target repo |
| Memory | executable governed store | `.krn/memory/*.json` | memory and CLI tests | `pnpm test` | usefulness unproven | operator-approved memory examples |
| Hooks | executable trace receiver; manual diagnostics separated from trusted evidence; real loading remains unproven unless a scoped non-bypass marker appears | `.krn/traces/trace.jsonl` | hook and summary tests | `pnpm test`, hook trust probe attempts | real Codex project hook loading/trust can remain blocked by Codex project/hook trust review | non-bypass hook trust probe through reviewed project hooks |
| Install lifecycle | executable downstream scaffold plus dry-run plan | `AGENTS.md`, `.codex/hooks.json`, `.krn/bin/krn`, runtime skill template, `.krn/current/install-result.json` | CLI tests | `pnpm test`, dogfood preflight, `krn install --dry-run` | downstream trust assumptions; existing user files are preserved | approved real repo install review |
| Uninstall lifecycle | executable marker-gated dry-run/confirm | `.krn/current/uninstall-result.json` | CLI tests | `pnpm test`, `krn uninstall --dry-run` | markerless old installs are refused and preserved | roundtrip in broader target dogfood |
| Config doctor/init | executable config validation and starter generation; readonly-python timeout tuned from live `krn-llm-wiki` smoke; target PR #78 merged committed `krn.config.json` to target `main` after final validation | `.krn/current/config-doctor.json`, `.krn/current/config-init-result.json`, target PR #78 | CLI tests | `pnpm test`, `krn config doctor`, isolated target install/config smoke, PR #78 `krn config doctor --json`, target main `krn.config.json` check | command policy can reject future target-specific commands until profile is tuned | repeat config adoption on another target |
| Real-repo workflow | preflight/scaffold executable; first-class manual execution-result artifact captured; approved manual Codex README-only run completed on isolated `krn-llm-wiki` worktree; isolated non-doc `krn.config.json` adoption run passed executable readonly verify; beta install/config lifecycle smoke passed in detached `krn-llm-wiki` worktree; 2026-06-15 isolated `krn-llm-wiki` product-code/checker mutation passed `krn run --task-spec ... --execute-verify --bundle`; PR #78 merged minimal target config adoption to target `main` after final `krn run --task-spec ... --execute-verify --bundle` | `.krn/dogfood/**/summary.json`, target `.krn/current/*`, target PR #78, `docs/handoffs/2026-06-15-real-target-krn-run-product-code-proof.md`, `docs/handoffs/2026-06-16-pr78-merge-result.md` | script and CLI tests | `pnpm test`, `pnpm verify:local`, approved manual `krn-llm-wiki` Codex runs, isolated `krn verify --execute`, isolated target `krn run --task-spec ... --execute-verify --bundle`, PR #78 final target run and merge | skipped/readiness/preflight can be overclaimed; hook trust remains unproven; target-main config adoption is local-tool evidence only, not production proof | repeat `krn run` on a second real repo |
| Deterministic reviewers | executable | `.krn/current/review-summary.json` | CLI tests | `pnpm test` | usefulness beyond first records unproven | compare reviewer output to human review |
| Operator summary | executable | `.krn/current/operator-summary.json` | CLI tests | `pnpm test` | summary prioritization unproven | run summary after real dogfood and review |
| Operator report | executable static local report plus bundle; supporting surface for `krn run` | `.krn/current/operator-report.md`, `.krn/current/operator-report.json`, `.krn/current/operator-report.html`, `.krn/current/report-bundle/manifest.json` | CLI tests | `pnpm test`, `krn report --write`, `krn report --bundle`, `krn run --bundle` | report can over-compress caveats | keep report as evidence projection under run-result |
| Artifact lifecycle | executable list/archive plan | `.krn/archive/<timestamp>/` | CLI tests | `pnpm test`, `krn artifacts list`, `krn artifacts archive --dry-run` | archiving could hide useful history if overused | operator-confirmed archive only |
| Release check | executable local handoff gate; internal/supporting gate for run bundles | `.krn/current/release-check.json`, `.krn/current/release-check.md` | CLI tests, docs regression | `pnpm test`, `krn release-check --write`, `krn run --bundle` | can be mistaken for validation execution | pair with actual validation command output and CI metadata |
| Dashboard-lite | ADR-only | ADR-0014 | docs regression | `pnpm test` | UI before stable data | consume `operator-summary.json` only |
| MCP | ADR-only | ADR-0015 | docs regression | `pnpm test` | server before resource contract matures | fake adapter/schema tests only |
| Retrieval/vector | ADR-only | ADR-0016 | docs regression | `pnpm test` | embeddings before eval | synthetic retrieval eval harness |
| Subagents | contract-only | `docs/product/subagent-contracts.md` | docs regression | `pnpm test` | autonomous framework creep | keep reviewers deterministic first |
| CI | minimal local-validation workflow | `.github/workflows/verify.yml` | docs regression | GitHub Actions when pushed; local commands remain source proof | false confidence from CI-only proof | keep no-model/no-publish gate only |
| Publishing | absent | release checklist | docs regression | `pnpm test` | premature package boundary | no publish from current P1 |

## Current Decision

v0.1 product value is now:

```txt
krn run -> run-result -> run-bundle -> report/release-check as supporting evidence
```

Dashboard-lite, MCP, vector retrieval, autonomous subagents, protected-data
workflows, and package publishing remain intentionally unbuilt.

## Open Proof Gaps

- Second real target repeat beyond `krn-llm-wiki`.
- Real non-bypass Codex hook loading/trust.
- Noisy large repo context behavior.
- Production WordPress/ACF behavior.
- Reviewer usefulness beyond deterministic local records.
- Operator summary usefulness beyond first deterministic artifact.
- Remote CI has a workflow file, but a current remote run is not local proof until checked in GitHub.
