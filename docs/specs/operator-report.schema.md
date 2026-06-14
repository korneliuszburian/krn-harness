# Operator Report Schema

## Purpose

`krn-operator-report-v1` is the local operator-facing report artifact.

It projects current summary/review/evidence artifacts into one Markdown, JSON, and static HTML report so an operator can understand the current state without reading handoffs.

It is local evidence only. It is not production proof, telemetry, a dashboard server, or a second source of truth.

## Command

`krn report` prints Markdown by default.

`krn report --json` prints the JSON object.

`krn report --write` writes:

- `.krn/current/operator-report.md`
- `.krn/current/operator-report.json`
- `.krn/current/operator-report.html`

The command writes `report.ran`. It does not run verify commands, call Codex, call network, inspect `.env` contents, or inspect protected file contents.

## Top-Level Fields

- `schema`: `krn-operator-report-v1`.
- `generatedAt`: ISO timestamp.
- `repoPath`: current repository path.
- `verdict`: `pass`, `warn`, `blocked`, or `fail`.
- `summaryStatus`: source operator-summary status.
- `task`: current task status and text.
- `execution`: latest local execution-result projection when present.
- `changedFiles`: changed files from latest execution evidence when present.
- `verify`: verify status and command count.
- `context`: context status and compact counts.
- `realRepoEvidence`: real-repo evidence status.
- `hookTrust`: hook trust status.
- `productionProof`: always `false` for current P1.
- `blockers`: current blockers.
- `warnings`: current warnings plus historical caveats.
- `nextActions`: concrete next actions.
- `historicalCaveats`: non-current `.krn` artifacts.
- `historicalCaveatCount`: total non-current caveat count.
- `historicalCaveatsOmitted`: caveats omitted from the compact report.
- `artifactPaths`: compact path list with artifact scopes.
- `artifactPathCount`: total artifact count.
- `artifactPathsOmitted`: artifact paths omitted from the compact report.

## Stale Artifact Semantics

Historical source `.krn` dogfood blockers are visible as `historicalCaveats`, but they are not fatal to the current report verdict.

The report can therefore be `warn` while `krn summary` is still `blocked` by stale source-local dogfood artifacts. This is intentional: summary preserves strict current-state signals; report separates current evidence from stale artifact caveats.

The report intentionally caps rendered caveats and artifact paths. Use `krn artifacts list --scope historical` for the full history.

## Static HTML

The HTML output is a local static file.

It must not use:

- external CSS;
- external JavaScript;
- network references;
- server runtime;
- database;
- hosted dashboard state.

## Limits

- Local evidence only.
- `productionProof.value` must remain `false`.
- Hook trust remains unproven unless scoped non-bypass hook provenance exists.
- Manual hook probes are not trust proof.
- Report output does not replace JSON artifacts.
