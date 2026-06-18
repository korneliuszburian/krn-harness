# v0.1 Local Tool State

## Status

KRN Harness v0.1 is a local, Codex-first operator workflow runner:

```txt
krn run -> run-result -> run-bundle -> report/release-check as supporting evidence
```

KRN v0.1 local proof threshold is crossed. This is not production readiness, a
production runner, hook trust proof, a dashboard server, an MCP server, a vector
database, an autonomous agent framework, or a publishing pipeline.

This document is the canonical concise v0.1 operating truth. The detailed
surface ledger lives in `docs/product/evidence-matrix.md`; release handoff
wording lives in `docs/releases/v0.1-local-tool-candidate.md`.

## Product North Star

KRN's product direction is to make Codex work contract-backed, remembered,
verified, reviewed, and auditable without changing the primary workflow.
Remembered means governed repo/runtime memory with evidence provenance and
operator control; it does not mean Codex personal memory or raw chat history is
KRN project truth. The daily work contract is documented in
`docs/product/daily-work-model.md` and remains docs-only until a later accepted
goal adds executable behavior.

## Primary Workflow

- `krn run` is the primary operator workflow.
- `krn run --task-spec ... --execute-verify --bundle` is the normal structured
  path for approved target work.
- `krn run` writes `.krn/current/run-result.json` and
  `.krn/current/run-result.md` by default.
- If a target already owns `.krn/`, `runtime.dir` may point to a safe ignored
  directory such as `.krn-harness`, and the same artifacts are written under
  that runtime root.
- `krn run --bundle` writes `<runtime-dir>/current/run-bundle/` and includes
  report/release-check artifacts as supporting evidence.
- `krn start`, `graph`, `context`, `verify`, `handoff`, `review`, `summary`,
  `report`, and `release-check` remain advanced plumbing/troubleshooting
  commands, not the normal operator ritual.

## Working Surfaces

- pnpm TypeScript workspace and deterministic local CLI.
- `krn.config.json` schema and default `.krn/` runtime model, with optional
  safe `runtime.dir` escape hatch for tracked target `.krn/` collisions.
- Task contract, context package, graph-lite, trace, verify, handoff, doctor,
  eval, review, summary, report, release-check, install, uninstall, config, and
  artifact lifecycle commands.
- Downstream AGENTS/hooks/runtime-skill templates.
- Governed memory primitives.
- Local report and run bundles.

## Current Evidence

- Source validation gates are `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
  `pnpm verify:local`.
- Product-code fixture dogfood covers source/test/stale-doc context selection
  and executable Node verification after deterministic code-only repairs.
- Synthetic WordPress/ACF-style fixture evidence remains local-only.
- Docs-only and config-adoption `krn-llm-wiki` evidence exists.
- A 2026-06-15 isolated `krn-llm-wiki` product-code/checker mutation passed
  `krn run --task-spec ... --execute-verify --bundle` with run status
  `verified`, one executed target validation command, run bundle generation,
  `productionProof: false`, and hook trust unproven.
- A 2026-06-16 reviewed target-main config adoption exists for
  `krn-llm-wiki`: PR #78 merged only `krn.config.json` after final
  `python3 tools/check_all_readonly.py`, `krn config doctor --json`, and
  `krn run --task-spec ... --execute-verify --bundle` validation. The KRN run
  executed `python3 tools/check_all_readonly.py` as the single target-owned
  command, generated a run bundle, kept `productionProof: false`, and kept hook
  trust unproven.
- A 2026-06-16 second real repo repeat exists for
  `marketing-intelligence-studio`: an isolated clone ran
  `krn config doctor --json` and
  `krn run --task-spec .krn/local/second-target-repeat-task-spec.json --execute-verify --bundle`
  to `verified` using the target's fast quality gate through
  `python3 tools/krn_check_quality_gate.py`. This remained local proof only:
  no target commit, push, PR, production proof, or hook trust proof.
- A 2026-06-17 runtime-dir collision proof exists for `krn-ai-os`: an isolated
  clone confirmed tracked product-owned `.krn/` files, configured
  `runtime.dir: ".krn-harness"`, ran `krn config doctor --json`, and ran
  `krn run --task-spec .krn-harness/local/runtime-dir-collision-task.json --execute-verify --bundle`
  to `verified` using `python3 tools/krn_check_pytest.py`. Tracked `.krn/`
  files stayed untouched, KRN artifacts were written under `.krn-harness/`, no
  target commit/push/merge occurred, `productionProof` stayed false, and hook
  trust stayed unproven.

## Release Posture

KRN v0.1 is a local tool candidate. It can be handed to an operator from source
with explicit validation output and local proof artifacts.

Release readiness requires:

- current checkout validation output;
- `krn run` smoke evidence;
- generated `<runtime-dir>/current/run-result.*`,
  `<runtime-dir>/current/run-bundle/*`,
  `<runtime-dir>/current/operator-report.*`, and
  `<runtime-dir>/current/release-check.*` artifacts for handoff;
- no staged runtime artifacts such as `.krn/` or `.krn-harness/`;
- no target commit or push unless separately approved.

## Known Limits

- `productionProof` remains false.
- Hook trust remains unproven.
- Real target product-code proof is local isolated-worktree evidence only; it is
  not a target commit, target push, production proof, or hook trust proof.
- Target PR #78 is merged target-main config adoption evidence only; it is not
  production proof or hook trust proof.
- The second target repeat used local-only config/checker files because the
  KRN v0.1 verify allowlist is narrow; a config-only target PR was skipped.
- The `krn-ai-os` runtime-dir proof used local-only config/checker/task-spec
  files in an isolated clone; it is not a target commit or production proof.
- Historical `.krn` dogfood artifacts can still create caveats; report and
  artifacts commands make them visible instead of silently treating them as
  current proof.
- No dashboard server, MCP server, vector DB, embeddings dependency,
  autonomous subagent framework, production runner, or publishing pipeline is
  implemented.

## Next Slice

Choose the next focused hardening goal from
`docs/product/adoption-friction-register.md`; do not add broad product surfaces
without a recorded target finding and narrow acceptance test.
