# GOAL-8H Roadmap

## Purpose

GOAL-8H hardens KRN Harness before broader product-code adoption claims. Work
must proceed as small, validated slices. Local evidence stays local evidence;
`productionProof` and hook trust must not be upgraded without explicit proof.

TASK-001 is complete in `74ec41f`. TASK-007 is complete in `765f33a`.
Accidental TASK-010 local edits from an earlier false start are not part of
this roadmap state.

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
| TASK-001 Zod runtime validation | Done | Commit `74ec41f`; ADR-0018; local and remote validation passed |
| TASK-002 queryable trace store | ADR/spec accepted; implementation deferred | ADR-0019; native dependency review before code |
| TASK-003 interrupt/resume | ADR/spec accepted; implementation deferred | ADR-0020; explicit CLI-surface approval before code |
| TASK-004 structured hook output validation | Deferred | Depends on TASK-001 and real hook trust evidence |
| TASK-005 eval regression baseline | Done | ADR-0021; rolling baseline artifact; no CLI flag |
| TASK-006 context budget manager | Done | ADR-0022; deterministic context budget; no embeddings/vector DB |
| TASK-007 run-eval refactor | Done | Commit `765f33a`; keep validation passing |
| TASK-008 real non-bypass hook trust proof | Deferred | Disposable non-protected target; no production claim |
| TASK-009 graph-lite dependency evidence | Done | Literal import-string evidence; no full AST/callgraph or new CLI surface |
| TASK-010 skill invocation docs | Done | Explicit `$skill` invocation docs; docs-only, no new skills |
| TASK-011 context poisoning defense | Partial implementation; suspect downgrade deferred | ADR-0023; pre-read graph/context policy landed |
| TASK-012 `krn diff` | Deferred | ADR/spec first because it is a new top-level command |
| TASK-013 downstream AGENTS quality gate | Done | Generated AGENTS adapter quality gate in install path |

## TASK-001 Acceptance

- `packages/config`, `packages/task-contract`, and `packages/trace` expose Zod
  schemas and inferred TypeScript types.
- `krn.config.json`, `--task-spec`, current task-contract artifacts, and trace
  JSONL boundaries use runtime parsers.
- Existing compatibility helpers remain available.
- Invalid task specs produce path-aware failure evidence in `run-result`.
- No unrelated JSON parser rewrite, hook work, MCP work, dashboard work, or new
  CLI command is included.

## TASK-002 Acceptance Gate

- ADR-0019 records JSONL as canonical and a queryable trace store as a derived
  read model.
- `docs/specs/trace-query-store.md` defines the first table shape, staleness
  semantics, dependency gate, and non-goals.
- No SQLite dependency, database file, or `krn traces query` CLI surface is
  added until a separate implementation slice passes the dependency gate.

## TASK-003 Acceptance Gate

- ADR-0020 records interrupt/resume as local KRN run state, not Codex session
  state, hook trust, or production approval.
- `docs/specs/run-interrupt-resume.md` defines the future interrupt artifact,
  allowed local interrupt reasons, resume boundaries, and non-goals.
- No top-level `krn resume`, `krn run --resume`, Codex wrapper, or hook behavior
  is added until a separate implementation slice gets explicit CLI-surface
  approval.

## TASK-005 Acceptance

- ADR-0021 records eval regression baseline semantics as rolling local
  harness-only evidence.
- `docs/specs/eval-baseline.schema.md` defines `krn-eval-baseline-v1`.
- `krn eval` writes `.krn/evals/baseline.json` and
  `.krn/current/eval-baseline.json`.
- No `krn eval --compare-baseline` flag, Codex runner, dashboard, MCP, vector
  DB, hook trust claim, or production proof is added.

## TASK-006 Acceptance

- ADR-0022 records deterministic context budget policy.
- Context package JSON includes `budget` with max, estimated, retained, pruned,
  status, estimator, item counts, pruned item summaries, and retention policy.
- `krn context` emits budget status in `context.built` trace payloads.
- No tokenizer dependency, embeddings, vector DB, semantic retrieval, new CLI
  command, hook trust claim, or production proof is added.

## TASK-009 Acceptance

- `krn graph` keeps the existing artifact workflow and emits local module
  dependency evidence in `.krn/graph/repo-graph.json`.
- Graph artifact JSON includes `moduleDependencies` shaped as
  `{ file, imports, importedBy }[]` and derived from `imports-file` edges.
- Module import detection uses literal JS/TS import/export/require strings only.
- No `krn graph --format`, new top-level command, dependency, AST, Tree-sitter,
  callgraph/dataflow, package manager dependency resolver, semantic retrieval,
  hook trust claim, or production proof is added.

## TASK-010 Acceptance

- Each tracked build-time skill documents an explicit `## Invocation` section
  with `$skill-name` usage and expected output.
- `.agents/skills/README.md` indexes required build-time skills, invocation
  syntax, use cases, expected outputs, and layer boundaries.
- `AGENTS.md` remains short and points to the skill index instead of becoming a
  product manual.
- No new build-time skill, runtime/downstream skill, CLI command, plugin
  distribution, MCP tool, hook trust claim, or production proof is added.

## TASK-011 Acceptance Gate

- ADR-0023 records context poisoning defense as a graph/context ingestion
  policy, not a hook sanitizer.
- `docs/specs/context-poisoning-defense.md` defines authority/evidence
  boundaries, current implementation gap, required future behavior, required
  tests, and non-goals.
- `docs/security/context-poisoning.md` and `docs/security/trust-boundaries.md`
  state that repository text is evidence until promoted, and that approved
  target runs still require clean preflighted targets while poisoning-suspect
  downgrade remains deferred.
- Pre-read graph/context scan policy excludes task-spec do-not-use paths and
  protected-looking paths before graph detector content reads.
- Remaining implementation is deferred until a focused source/test slice can
  classify and downgrade suspicious instruction-like non-authority docs without
  downgrading root `AGENTS.md` or accepted ADR/spec policy examples.
- No hook implementation, hook trust claim, MCP, dashboard, vector DB,
  embeddings, subagent framework, publishing workflow, protected-data workflow,
  production security guarantee, new top-level command, or `krn run` bypass is
  added.

## TASK-013 Acceptance

- Generated downstream `AGENTS.md` includes `## Roles`,
  `## Non-negotiables`, `## KRN Workflow`, KRN command references, and a runtime
  skill reference.
- `generateAgentsAdapter()` fails fast when the generated AGENTS template misses
  required onboarding content.
- `krn install` reports a clear quality-gate error and exits non-zero when the
  generated AGENTS template is incomplete, before writing install artifacts.
- Existing downstream project-owned files remain preserved; the gate validates
  the KRN-generated template, not user-owned existing instructions.
- No new CLI command, runtime skill, hook trust claim, MCP, dashboard, vector DB,
  subagent framework, publishing workflow, or production proof is added.

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
