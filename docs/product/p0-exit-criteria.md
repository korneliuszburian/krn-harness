# P0 Exit Criteria

## Status

P0 is exit-ready when local evidence proves the harness loop is coherent and the remaining gaps are explicitly marked as P1 work or blocked.

P0 is not production readiness.

## Surfaces

| Surface | Current status | Exit acceptance | Tests/evidence | Limitation |
| --- | --- | --- | --- | --- |
| CLI | Working local `krn` commands | `help`, `status`, `doctor cli`, `start`, `graph`, `context`, `verify`, `handoff`, `install`, `memory`, `hook`, and `eval` are available | `pnpm --silent krn --help`; CLI tests | No hosted runner or CI dependency |
| Runtime `.krn` | Local artifact model | Commands write current/run artifacts under target cwd | CLI tests; dogfood preflight | Runtime artifacts are ignored and not source truth |
| Task contract | Structured task intent | Full task intent and `--task-spec` preserve constraints, do-not-use paths, and verification expectations | task-contract tests; WP/ACF dogfood | Intent quality is deterministic, not semantic |
| Context package | Deterministic package context | Must-read, should-read, reference-only, do-not-use, and STOP status are emitted | context tests; docs regression | No embeddings or semantic retrieval |
| Graph-lite | Shallow repo graph | Default graph build uses filesystem, package conventions, docs links/status, package scripts, Composer metadata, JS/TS import-string relations, CSS class relations, ACF-like JSON, and WordPress/Bedrock fixture relations | graph tests | Import evidence is literal-specifier only; no AST/callgraph/dataflow/runtime dependency inference |
| Trace | JSONL evidence | CLI/run events are compact and parseable | trace tests | Trace is evidence, not enforcement |
| Verify | Record-only and safe execute | `krn verify --execute` runs only allowlisted commands | verify tests; dogfood preflight | No dependency install or shell pipelines |
| Handoff | Local summary | Handoff records task, status, validation, changed files, and risks | handoff command tests | Handoff is not proof by itself |
| Doctor | Local diagnostics | `doctor cli` proves pinned command identity and command availability | CLI identity tests | Does not prove downstream repo safety |
| Memory | Governed local records | pending/approved/deprecated states exist and are not auto-approved | memory tests | No auto memory approval |
| Dogfood/evals | Fixture and paid benchmark evidence | Tiny onboarding, product-code, and synthetic WP/ACF fixtures are repeatable and artifact-first | `pnpm dogfood:wp-acf`; eval tests | Fixture proof is not production WordPress or real target product-code proof |
| Adapters | Downstream templates | Generated AGENTS/hooks/runtime skill preserve current workflow rules | adapter tests | Templates are not hook trust proof |
| Runtime skill | One downstream skill template | Requires full task intent, graph before context, conditional verify, handoff, and hook honesty | adapter tests | Not a large skill pack |

## Exit Checklist

- Local validation has one obvious no-model gate: `pnpm verify:local`.
- Paid dogfood is optional and never part of CI/local required gates.
- Pinned KRN CLI identity is mandatory for dogfood evidence.
- Global `krn` fallback invalidates KRN dogfood.
- Real-repo preflight and report-only dogfood scaffold exist.
- Hooks remain explicitly unproven until real non-bypass Codex emits `hook.received`.
- P0 docs do not claim dashboard, MCP, vector DB, autonomous subagents, or production readiness.
- Source checkout is not used as downstream dogfood target.

## Exit Decision Rule

P0 can be marked complete only after final validation passes and a stage scorecard records:

- no hard boundary violation;
- real-repo readiness improved;
- unproven hooks and fixture-only evidence are still named;
- P1 lanes are gated by contracts, ADRs, or report-only scaffolds.
