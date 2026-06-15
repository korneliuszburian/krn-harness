# GOAL-8H Roadmap

## Purpose

GOAL-8H hardens KRN Harness before broader product-code adoption claims. Work
must proceed as small, validated slices. Local evidence stays local evidence;
`productionProof` and hook trust must not be upgraded without explicit proof.

The current active order starts at TASK-001. TASK-007 is already complete in
`765f33a`. Accidental TASK-010 local edits from an earlier false start are not
part of this roadmap state.

## Execution Rules

- Keep `krn run` as the primary operator workflow.
- Do not add new top-level CLI commands unless the specific task is ADR-approved.
- Do not build dashboard, MCP, vector DB, subagents, publishing, or hook-trust
  claims inside unrelated slices.
- Commit only KRN source/docs/tests. Do not commit target-repo artifacts or
  protected scratch.
- Every task ends with validation output or an explicit blocker.

## Task Order

| Task | Status | Gate |
| --- | --- | --- |
| TASK-001 Zod runtime validation | In progress | ADR-0018; local tests and full validation |
| TASK-002 queryable trace store | Deferred | ADR first; native dependency review before code |
| TASK-003 interrupt/resume | Deferred | ADR first; explicit CLI-surface approval |
| TASK-004 structured hook output validation | Deferred | Depends on TASK-001 and real hook trust evidence |
| TASK-005 eval regression baseline | Deferred | Spec baseline artifact before CLI flags |
| TASK-006 context budget manager | Deferred | Context spec update; no embeddings/vector DB |
| TASK-007 run-eval refactor | Done | Commit `765f33a`; keep validation passing |
| TASK-008 real non-bypass hook trust proof | Deferred | Disposable non-protected target; no production claim |
| TASK-009 graph-lite dependency evidence | Deferred | Graph-lite contract update; no full AST/callgraph |
| TASK-010 skill invocation docs | Deferred | Redo intentionally as a docs-only slice |
| TASK-011 context poisoning defense | Deferred | ADR-0019 unless numbering changes |
| TASK-012 `krn diff` | Deferred | ADR/spec first because it is a new top-level command |
| TASK-013 downstream AGENTS quality gate | Deferred | Install lifecycle tests before template changes |

## TASK-001 Acceptance

- `packages/config`, `packages/task-contract`, and `packages/trace` expose Zod
  schemas and inferred TypeScript types.
- `krn.config.json`, `--task-spec`, current task-contract artifacts, and trace
  JSONL boundaries use runtime parsers.
- Existing compatibility helpers remain available.
- Invalid task specs produce path-aware failure evidence in `run-result`.
- No unrelated JSON parser rewrite, hook work, MCP work, dashboard work, or new
  CLI command is included.

## Proof Commands

Run at minimum:

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm verify:local`
- `pnpm --silent krn eval`

When TASK-001 changes `krn run`, also run a local smoke with
`krn run --task-spec <task.json> --execute-verify --bundle` against a safe local
fixture or temporary repository.
