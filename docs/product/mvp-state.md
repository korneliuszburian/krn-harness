# MVP++ State

## Status

KRN Harness is a local, Codex-first engineering harness with an executable
artifact loop:

```txt
run -> contract -> context -> graph -> hooks -> trace -> verify -> review -> summary -> report
```

The current surface is MVP++ for local operator use. It is not production
readiness, a hosted dashboard, an MCP server, or a generic multi-agent runtime.

## Working Surfaces

- `krn run` is the primary operator workflow and writes
  `.krn/current/run-result.json` plus `.krn/current/run-result.md`.
- `krn run --bundle` writes `.krn/current/run-bundle/` and uses report plus
  release-check as supporting gates.
- `krn start`, `graph`, `context`, `verify`, `handoff`, `doctor`, and `eval`
  produce local `.krn` artifacts.
- `krn review` produces deterministic reviewer records from local artifacts.
- `krn summary` produces an operator summary from current local state.
- `krn report --write` writes Markdown, JSON, and static local HTML.
- `krn report --bundle` writes a local report bundle with a manifest.
- `krn install --dry-run` and `krn install` produce a downstream install plan/result.
- `krn uninstall --dry-run` and `krn uninstall --confirm` remove only marker-managed files.
- `krn config doctor` and `krn config init` make target config adoption explicit.
- `krn artifacts list` separates current, historical, stale-blocking, fixture,
  foreign-target, and archived `.krn` artifacts.
- `krn artifacts archive --dry-run` plans safe archival without moving files.
- `krn release-check` checks the local release handoff contract and is advanced
  plumbing outside the normal operator path.

## Current Evidence

- Source validation gates are `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
  `pnpm verify:local`.
- Fixture dogfood and synthetic WordPress/ACF-style dogfood are local-only
  evidence.
- Product-code fixture dogfood now covers source/test/stale-doc context
  selection and executable `node src/index.test.ts` verification after a
  deterministic code-only repair.
- Approved manual `krn-llm-wiki` evidence exists for a docs-only isolated
  target run, but it remains local evidence and keeps `productionProof: false`.
- Isolated non-doc `krn-llm-wiki` KRN config adoption evidence exists:
  `krn.config.json` plus KRN install artifacts, `krn verify --execute` passing
  `python3 tools/check_all_readonly.py`, and
  `krn-real-repo-execution-result-v1` with `status: pass`.
- A 2026-06-15 beta install/config smoke on an isolated `krn-llm-wiki`
  worktree passed `krn install --dry-run`, managed install with generated
  `readonly-python` config, `krn config doctor`, `krn verify --execute`, and
  `krn report --bundle` with `productionProof: false`.
- Real Codex hook loading/trust remains unproven until a non-bypass Codex run
  emits a trusted hook-load marker.

## Release Posture

The repository now has a minimal verification workflow and a local
`krn release-check` command. These gates do not publish packages and do not call
paid Codex/model paths.

Release readiness requires:

- command validation output from the current checkout;
- generated `.krn/current/run-result.*`, `.krn/current/operator-report.*`, and
  release-check artifacts for the handoff;
- install/config/uninstall lifecycle contracts present in source.

## Known Limits

- No production dashboard, server, MCP action surface, vector DB, embeddings, or
  autonomous subagent execution framework is implemented.
- Historical `.krn` dogfood artifacts can still create caveats; report and
  artifacts commands make them visible instead of silently treating them as
  current proof.
- Real target product-code dogfood remains a proof gap; the current non-doc
  real-repo evidence is config adoption, not product code mutation.

## Next Slice

Use `krn run --task-spec ... --execute-verify --bundle` on the next approved
non-protected target workflow. Keep hook trust and real target product-code
mutation as separate proof tracks.
