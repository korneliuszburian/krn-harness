# AGENTS.md

This repository builds **KRN Harness**.

KRN Harness is a Codex-first local agentic engineering runtime/control layer.

It is not a prompt pack.
It is not a dashboard-first product.
It is not a generic multi-agent framework.
It is not a large skill pack.

Core product principle:

contract → context → graph → hooks → trace → verify → governed memory

## Roles

- User: product owner/operator.
- Codex Desktop: builder/implementer.
- ChatGPT: external reviewer / architecture critic.
- This repo: source of truth for building KRN Harness.

## Non-negotiables

- Repo truth beats chat truth.
- Do not implement undocumented architecture.
- Every non-trivial decision needs official docs, research evidence, or ADR rationale.
- Research notes are not active truth until distilled into canon/spec/ADR.
- Do not dump raw research into active context.
- Keep AGENTS.md short. Do not turn it into the product manual.
- Build with TypeScript-first.
- Python is allowed only as temporary research/eval helper, not as core runtime.
- Do not add dependencies without justification.
- Do not broaden scope silently.
- Do not claim done without validation evidence.
- Semantic commits only.

## Behavioral guardrails

Bias toward caution over speed; use judgment for trivial tasks.

- Think before coding: state assumptions, surface tradeoffs, and ask when the request or repo truth is unclear.
- Keep solutions simple: write the minimum code that solves the verified problem; avoid speculative features, unused configurability, and single-use abstractions.
- Make surgical changes: touch only files needed for the request, match local style, and clean up only unused code created by your change.
- Execute against clear success criteria: for multi-step work, define the verification loop before editing and keep working until the agreed checks pass or a blocker is explicit.

## Code creation rules

- Start from repo truth: read this file, the active goal or task, and the relevant docs/specs/ADRs before changing code.
- Build one vertical slice at a time: task contract, context, runtime behavior, verification, and handoff evidence should move together when the slice requires them.
- Keep code TypeScript-first, typed, and package-boundary aware; reuse local helpers and schemas before adding abstractions.
- Add abstractions only when they remove real duplication, enforce a contract, or match an established package pattern.
- Do not add dependencies, command surfaces, runtime storage, external services, or generated artifact formats without an explicit docs/spec/ADR reason.
- Do not smuggle P1+ product surface into P0: dashboard, MCP, vector/embedding, subagent orchestration, browser evidence, production runner, publishing, and hook-trust features stay blocked unless separately approved.
- Treat target repositories as external evidence surfaces: use isolated clones/worktrees, target-owned validation, explicit approvals, no protected data, no target-main mutation, no push, no merge, and no PR unless the operator explicitly approves that action.
- Do not commit generated runtime or proof artifacts such as `.krn/`, `.krn-harness/`, `/tmp` target outputs, screenshots, appshots, browser captures, or placeholder evidence.
- Never upgrade local evidence into production proof, CI proof, hook trust, target-main approval, or broad adoption proof.
- Governed KRN memory and Codex personal memory are separate; KRN memory may enter context only through the repo-defined governed memory path and only as allowed by the task.
- Tests must match risk: code/schema/parser/generated-artifact changes need focused tests plus relevant gates; docs-only changes need docs hygiene checks and do not need invented tests.
- Every closeout must list changed files, exact validation commands and results, proof status, known gaps, and the next concrete action.

## P0 scope

P0 may include:

- pnpm TypeScript workspace.
- CLI/core skeleton.
- `krn.config.json` schema.
- `.krn/` runtime model.
- generated downstream AGENTS adapter template.
- generated downstream Codex hooks template.
- generated downstream runtime skill template.
- build-time skills created via `$skill-creator`.
- task contract schema.
- context package schema.
- graph-lite interfaces.
- trace JSONL writer/schema.
- verify/handoff/doctor skeleton.
- harness-only eval fixture skeleton.
- architecture docs and ADRs.

## P0 non-goals

Do not build in P0:

- dashboard,
- MCP server,
- multi-agent orchestrator,
- vector DB,
- semantic embeddings,
- full AST/callgraph/dataflow,
- full Tree-sitter graph,
- production WordPress/ACF detector,
- browser/Playwright evidence layer,
- GitHub Action,
- plugin distribution,
- autonomous researcher,
- auto-approved memory,
- many downstream runtime skills.

## Skill policy

All new build-time skills must be created through the built-in `$skill-creator`.

Do not manually invent skills unless `$skill-creator` is unavailable and the reason is documented.

Build-time skills live in:

`.agents/skills/*`

Runtime/downstream skill templates live in:

`packages/codex-adapter/src/templates/skills/*`

Do not confuse these layers.

Build-time skills help Codex build KRN Harness.
Runtime/downstream skills are templates KRN Harness may later install into other repositories.

Required build-time skills:

- `$buduj` — top-level build workflow.
- `$kanon` — research → canon/spec/ADR.
- `$pilnuj` — architecture guardian / scope control.
- `$wycinek` — small measurable implementation slice.
- `$handoff` — review-ready summary for ChatGPT continuation.

Invoke explicitly with `$skill-name` when the workflow matters; see `.agents/skills/README.md`.

Existing `krn-search` skills may be reviewed only as inspiration.
Do not copy them wholesale.
Distill useful workflow patterns into KRN-specific skills/docs/ADRs.

## Required workflow

Before edits:

1. Read current repo state.
2. Read relevant docs/ADRs/specs if present.
3. Choose the right build-time skill.
4. State the intended slice.
5. Declare owned files/areas.
6. Define acceptance/proof/risk.

During edits:

1. Keep work in vertical slices.
2. Prefer typed schemas, tests, and small working behavior.
3. Avoid broad rewrites.
4. Avoid P1/P2/P3 features hidden inside P0.
5. Keep docs concise and decision-oriented.

Before completion:

1. Run available validation:
   - `pnpm lint`
   - `pnpm typecheck`
   - `pnpm test`
   - CLI smoke checks if available.
2. Report exact commands and results.
3. Report changed files.
4. Report known gaps and residual risks.
5. Recommend the next concrete `/goal`.

## Evidence standard

“Done” means:

- changed files are listed,
- validation commands are run or explicitly explained,
- P0 scope is respected,
- architecture decisions are documented,
- residual risk is named,
- next action is clear.

Never call local-only evidence production proof.
Never hide failed commands.
Never hide uncertainty.

## Source priorities

Use current official Codex docs for Codex behavior:

- AGENTS.md,
- skills,
- hooks,
- plugins,
- MCP,
- non-interactive mode,
- best practices,
- follow-goal workflow.

Use research papers and established tooling methodology for:

- context engineering,
- memory governance,
- graph/codebase intelligence,
- trace-based evals,
- token reduction,
- security/context poisoning.

When unsure, stop and document the uncertainty instead of inventing architecture.
