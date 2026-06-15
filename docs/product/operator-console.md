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

## Limits

- Do not duplicate full trace content.
- Do not claim hook validation without trusted real `hook.received` provenance.
- Do not add a database, server, external CSS/JS, network asset, or hosted UI.
- Do not copy protected-looking paths into report bundles.

Future dashboard-lite work may consume `operator-summary.json`, but it is not
part of the current product layer.
