# MVP++ State

## Status

KRN Harness is a local, Codex-first engineering harness with an executable
artifact loop:

```txt
contract -> context -> graph -> hooks -> trace -> verify -> review -> summary -> report -> release-check
```

The current surface is MVP++ for local operator use. It is not production
readiness, a hosted dashboard, an MCP server, or a generic multi-agent runtime.

## Working Surfaces

- `krn start`, `graph`, `context`, `verify`, `handoff`, `doctor`, and `eval`
  produce local `.krn` artifacts.
- `krn review` produces deterministic reviewer records from local artifacts.
- `krn summary` produces an operator summary from current local state.
- `krn report --write` writes Markdown, JSON, and static local HTML.
- `krn artifacts list` separates current, historical, stale-blocking, fixture,
  foreign-target, and archived `.krn` artifacts.
- `krn artifacts archive --dry-run` plans safe archival without moving files.
- `krn release-check` checks the local release handoff contract.

## Current Evidence

- Source validation gates are `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
  `pnpm verify:local`.
- Fixture dogfood and synthetic WordPress/ACF-style dogfood are local-only
  evidence.
- Approved manual `krn-llm-wiki` evidence exists for a docs-only isolated
  target run, but it remains local evidence and keeps `productionProof: false`.
- Isolated non-doc `krn-llm-wiki` KRN config adoption evidence exists:
  `krn.config.json` plus KRN install artifacts, `krn verify --execute` passing
  `python3 tools/check_all_readonly.py`, and
  `krn-real-repo-execution-result-v1` with `status: pass`.
- Real Codex hook loading/trust remains unproven until a non-bypass Codex run
  emits a trusted hook-load marker.

## Release Posture

The repository now has a minimal verification workflow and a local
`krn release-check` command. These gates do not publish packages and do not call
paid Codex/model paths.

Release readiness requires both:

- command validation output from the current checkout;
- generated `.krn/current/operator-report.*` and release-check artifacts for the
  handoff.

## Known Limits

- No production dashboard, server, MCP action surface, vector DB, embeddings, or
  autonomous subagent execution framework is implemented.
- Historical `.krn` dogfood artifacts can still create caveats; report and
  artifacts commands make them visible instead of silently treating them as
  current proof.
- Product-code non-doc real-repo dogfood remains a proof gap; the current
  non-doc evidence is config adoption, not product code mutation.

## Next Slice

Review the `active/krn-llm-wiki` `krn.config.json` proposal and decide whether
to apply it to the target repository. Keep hook trust and product-code mutation
as separate proof tracks.
