# Evidence Matrix

## Purpose

This matrix records current repo truth for KRN Harness surfaces.

It is local evidence only. It is not production proof.

| Surface / Lane | Implementation Status | Evidence Artifact | Tests | Validation | Risk | Next Proof |
| --- | --- | --- | --- | --- | --- | --- |
| CLI identity | executable | `krn doctor cli` | CLI tests | `pnpm test`, dogfood preflight | global `krn` collision | keep pinned shim evidence in dogfood |
| Task contract | executable | `.krn/current/task-contract.json` | CLI tests | `pnpm test` | weak task intent can still pass schema | richer task-spec fixtures |
| Graph-lite | executable | `.krn/graph/repo-graph.json` | graph and CLI tests | `pnpm test` | shallow detectors only | real repo graph noise review |
| Context package | executable | `.krn/current/context-package.json` | context and CLI tests | `pnpm test` | over-inclusion and stale docs | real repo context review |
| Verify | executable, ADR-0017 governed | `.krn/current/verify-result.json` | verify and CLI tests | `pnpm test`, `pnpm verify:local` | local command evidence only | safe real repo verify profiles |
| Handoff | executable | `.krn/current/handoff.md` | CLI tests | `pnpm test` | generated summary may miss nuance | compare against human review |
| Doctor | executable | `.krn/current/doctor-result.json` | doctor and CLI tests | `pnpm test` | local checks only | add checks after real dogfood findings |
| Eval | executable fixture gate | `.krn/current/eval-result.json` | eval tests | `pnpm test` | fixture coverage only | expand fixtures after real failures |
| Memory | executable governed store | `.krn/memory/*.json` | memory and CLI tests | `pnpm test` | usefulness unproven | operator-approved memory examples |
| Hooks | executable trace receiver, unproven real loading | `.krn/traces/trace.jsonl` | hook tests | `pnpm test` | real Codex trust/loading unproven | non-bypass hook trust probe |
| Install adapter | executable downstream scaffold | `AGENTS.md`, `.codex/hooks.json`, `.krn/bin/krn`, runtime skill template | CLI tests | `pnpm test`, dogfood preflight | downstream trust assumptions | approved real repo install review |
| Real-repo workflow | preflight/scaffold executable; first-class manual execution-result artifact captured on isolated `krn-llm-wiki` worktree | `.krn/dogfood/**/summary.json`, target `.krn/current/*` | script and CLI tests | `pnpm test`, `pnpm verify:local`, manual `krn-llm-wiki` execution run | skipped/readiness/preflight can be overclaimed; hook trust and target verify remain unproven | rerun on another safe repo with real verify profile |
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

- Approved real-repo execution beyond isolated `krn-llm-wiki` docs tasks.
- Real non-bypass Codex hook loading/trust.
- Noisy large repo context behavior.
- Real target verify profile beyond record-only.
- Production WordPress/ACF behavior.
- Reviewer usefulness beyond deterministic local records.
- Operator summary usefulness beyond first deterministic artifact.
