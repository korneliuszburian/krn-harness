# Evidence Matrix

## Purpose

This matrix records current repo truth for KRN Harness surfaces.

It is local evidence only. It is not production proof.

| Surface / Lane | Implementation Status | Evidence Artifact | Tests | Validation | Risk | Next Proof |
| --- | --- | --- | --- | --- | --- | --- |
| CLI identity | executable | `krn doctor cli` | CLI tests | `pnpm test`, dogfood preflight | global `krn` collision | keep pinned shim evidence in dogfood |
| Task contract | executable | `.krn/current/task-contract.json` | CLI tests | `pnpm test` | weak task intent can still pass schema | richer task-spec fixtures |
| Graph-lite | executable | `.krn/graph/repo-graph.json` | graph and CLI tests | `pnpm test` | shallow detectors only | real repo graph noise review |
| Context package | executable; verify-profile doc-match noise narrowed from real-repo finding and rechecked during approved `krn-llm-wiki` Codex run | `.krn/current/context-package.json` | context and CLI tests | `pnpm test`, isolated `krn-llm-wiki` before/after context comparison, approved manual Codex run context check | broad tasks can still over-include shallow graph docs | repeat on broader non-doc target |
| Verify | executable, ADR-0017 governed; safe Python readonly target profile proven locally | `.krn/current/verify-result.json` | verify and CLI tests | `pnpm test`, `pnpm verify:local`, isolated `krn-llm-wiki` `krn verify --execute` | local command evidence only | repeat on approved target with committed target config |
| Handoff | executable | `.krn/current/handoff.md` | CLI tests | `pnpm test` | generated summary may miss nuance | compare against human review |
| Doctor | executable | `.krn/current/doctor-result.json` | doctor and CLI tests | `pnpm test` | local checks only | add checks after real dogfood findings |
| Eval | executable fixture gate | `.krn/current/eval-result.json` | eval tests | `pnpm test` | fixture coverage only | expand fixtures after real failures |
| Memory | executable governed store | `.krn/memory/*.json` | memory and CLI tests | `pnpm test` | usefulness unproven | operator-approved memory examples |
| Hooks | executable trace receiver; manual diagnostics separated from trusted evidence; real loading remains unproven unless a scoped non-bypass marker appears | `.krn/traces/trace.jsonl` | hook and summary tests | `pnpm test`, hook trust probe attempts | real Codex project hook loading/trust can remain blocked by Codex project/hook trust review | non-bypass hook trust probe through reviewed project hooks |
| Install adapter | executable downstream scaffold | `AGENTS.md`, `.codex/hooks.json`, `.krn/bin/krn`, runtime skill template | CLI tests | `pnpm test`, dogfood preflight | downstream trust assumptions | approved real repo install review |
| Real-repo workflow | preflight/scaffold executable; first-class manual execution-result artifact captured; approved manual Codex README-only run completed on isolated `krn-llm-wiki` worktree with executable verify | `.krn/dogfood/**/summary.json`, target `.krn/current/*` | script and CLI tests | `pnpm test`, `pnpm verify:local`, approved manual `krn-llm-wiki` Codex run, isolated `krn verify --execute` | skipped/readiness/preflight can be overclaimed; hook trust remains unproven; temporary target config is not committed target proof; evidence is local only | non-bypass hook trust probe and repeat on target with committed verify profile |
| Deterministic reviewers | executable | `.krn/current/review-summary.json` | CLI tests | `pnpm test` | usefulness beyond first records unproven | compare reviewer output to human review |
| Operator summary | executable | `.krn/current/operator-summary.json` | CLI tests | `pnpm test` | summary prioritization unproven | run summary after real dogfood and review |
| Dashboard-lite | ADR-only | ADR-0014 | docs regression | `pnpm test` | UI before stable data | consume `operator-summary.json` only |
| MCP | ADR-only | ADR-0015 | docs regression | `pnpm test` | server before resource contract matures | fake adapter/schema tests only |
| Retrieval/vector | ADR-only | ADR-0016 | docs regression | `pnpm test` | embeddings before eval | synthetic retrieval eval harness |
| Subagents | contract-only | `docs/product/subagent-contracts.md` | docs regression | `pnpm test` | autonomous framework creep | keep reviewers deterministic first |
| CI | absent | none | none | none | false confidence from local-only proof | defer until local release contract stabilizes |
| Publishing | absent | release checklist | docs regression | `pnpm test` | premature package boundary | no publish from current P1 |

## Current Decision

P1 product value is now:

```txt
review-summary.json -> operator-summary.json -> dashboard/MCP later
```

Dashboard-lite, MCP, vector retrieval, autonomous subagents, protected-data workflows, and CI remain intentionally unbuilt.

## Open Proof Gaps

- Broader real-repo execution beyond isolated `krn-llm-wiki` docs-only tasks.
- Real non-bypass Codex hook loading/trust.
- Noisy large repo context behavior.
- Committed real target verify profile beyond isolated-worktree temporary config.
- Production WordPress/ACF behavior.
- Reviewer usefulness beyond deterministic local records.
- Operator summary usefulness beyond first deterministic artifact.
