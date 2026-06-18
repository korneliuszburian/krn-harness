# Operator Console Model

## Status

Current implementation is artifact-first only:

- `krn summary` writes `.krn/current/operator-summary.{json,md}`.
- `krn report` writes `.krn/current/operator-report.{json,md,html}` and optional report bundles.

This is the P1 executable summary artifact plus local static report artifact
boundary.

Concrete commands and outputs: `krn report --write`, `krn report --bundle`,
`.krn/current/operator-summary.json`, `.krn/current/operator-report.html`, and
`.krn/current/report-bundle/manifest.json`.

No frontend framework, server, database, hosted service, or dashboard is implemented.

## Contract

Summary/report may aggregate existing local artifacts only. They must not become
a second source of truth, run Codex, execute verify commands, inspect protected
file contents, or infer production readiness.

Allowed input families:

- `.krn/current/*` current run/task/context/verify/handoff/doctor/eval/review artifacts;
- `.krn/graph/repo-graph.json`;
- `.krn/memory/{pending,approved,deprecated}.json`;
- `.krn/dogfood/**/summary.json`.

Missing artifacts are allowed and should be reported as missing/warn/skipped
rather than hidden.

## Daily Ledger Projection

The daily ledger is a future projection over the same artifact families. It is
not a new command in the current product layer and does not create truth.

Allowed ledger rows:

- active task and current goal from task-contract and handoff artifacts;
- latest `krn run` status from run-result and verify result artifacts;
- items needing review from review summary, operator summary, and report
  warnings;
- pending memory candidates and approved/deprecated memory counts from governed
  memory stores;
- blockers, risks, adoption frictions, and target approval packet status from
  existing local docs or artifacts;
- next action from run-result, handoff, operator summary, or operator report.

Hard limits:

- no `krn daily` command in the audit-consolidation goal;
- no database, hosted UI, server, external asset, scheduler, or mutation path;
- no execution of Codex, verify commands, hooks, or target commands;
- no automatic memory approval, deprecation, or canon update;
- no production-proof, CI-proof, hook-trust, or target-main approval claim;
- no generated snapshots, screenshots, appshots, or browser captures as ledger
  proof.

## Limits

- Do not duplicate full trace content.
- Do not claim hook validation without trusted real `hook.received` provenance.
- Do not add a database, server, external CSS/JS, network asset, or hosted UI.
- Do not copy protected-looking paths into report bundles.

Future dashboard-lite work may consume `operator-summary.json`, but it is not
part of the current product layer.

## Static Cockpit Readiness

Static cockpit/dashboard-lite remains readiness-only until the product has
stable artifact contracts and evidence that the viewer would improve operator
work. ADR-0014 is the active architecture boundary:
`docs/adr/ADR-0014-dashboard-lite-read-only-report-viewer.md`.

The cockpit may be considered only as a local static artifact viewer over
existing files. It must not create truth, execute work, approve decisions, or
mutate state.

Stable input contracts required before implementation:

- `docs/specs/operator-summary.schema.md` for the primary status model;
- `docs/specs/operator-report.schema.md` for the local static report projection;
- `docs/specs/run-result.schema.md` for run verdict and proof-scope status;
- `docs/specs/reviewer-result.schema.md` for deterministic reviewer output;
- `docs/specs/memory.schema.md` for governed memory counts and reference-only
  boundaries;
- `docs/product/target-adoption-playbook.md` for target approval and Stage 9/10
  evidence boundaries.

Allowed inputs:

- `.krn/current/operator-summary.json`;
- `.krn/current/operator-report.json`;
- `.krn/current/run-result.json`;
- `.krn/current/review-summary.json`;
- `.krn/current/verify-result.json`;
- `.krn/current/context-package.json`;
- `.krn/memory/{pending,approved,deprecated}.json`;
- `.krn/dogfood/**/summary.json` and approved target evidence summaries only
  when their local/proof limits are preserved.

Required state handling:

- missing artifact: show missing with the exact path;
- skipped or readiness-only artifact: show skipped/readiness, not pass;
- blocked artifact: show the blocker and next action;
- failed artifact: show fail without hiding residual risk;
- warning artifact: keep warning separate from blockers;
- empty artifact family: show an empty state, not a success claim;
- historical artifact: label it as historical, stale, or non-current.

Protected-data exclusions:

- no `.env` contents;
- no dumps, uploads, credentials, private client documents, or production data;
- no raw trace payload expansion when it could include sensitive text;
- no copying protected-looking paths into cockpit bundles;
- no external assets or network references that could leak local state.

No-source-of-truth rule:

- source JSON/Markdown artifacts remain authoritative;
- cockpit HTML is a projection only;
- cockpit output must link or name source artifact paths;
- regeneration must be deterministic from current artifacts;
- editing cockpit output must never update task contracts, memory, run-result,
  review, summary, report, or target evidence.

Implementation stop conditions:

- Stage 9 target repeats are still missing;
- Stage 10 same-authority comparison is still missing;
- memory usefulness remains unproven;
- reviewer usefulness beyond deterministic local records remains unproven;
- operator-summary usefulness beyond first deterministic artifact remains
  unproven;
- any implementation would require framework, server, database, hosted UI,
  external asset, mutation path, protected-data read, or browser/screenshot
  proof.
