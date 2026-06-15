# krn-llm-wiki Beta Install/Config Smoke

Date: 2026-06-15

## Target

- Repo: `/home/krn/coding/krn/active/krn-llm-wiki`
- Target HEAD: `609d8bf2b6901c39533be59c35419864cad35ee7`
- Smoke worktree: `/tmp/krn-harness-beta-llm-wiki-20260615-0925`
- Pinned KRN: `/tmp/krn-harness-beta-llm-wiki-bin-20260615-0925/krn`

The active target checkout was dirty, so the run used a detached worktree and
did not push or commit target changes.

## Result

- `krn install --dry-run --with-config --config-profile readonly-python`:
  planned, 11 actions.
- `krn install --with-config --config-profile readonly-python`: installed,
  created 10 managed artifacts, skipped existing `AGENTS.md`.
- `krn config doctor --json`: pass, profile `readonly`, command allowed.
- `krn verify --execute`: pass, 1/1 command executed,
  `python3 tools/check_all_readonly.py`.
- `krn review --write`: completed.
- `krn summary --write`: warn, no blockers.
- `krn report --bundle`: completed,
  `krn-report-bundle-manifest-v1`, `productionProof: false`.

## Timeout Finding

The first beta smoke used the generated `readonly-python` timeout of 180000ms
and timed out while the readonly suite was still emitting passing checks. The
starter profile was increased to 360000ms, then the same isolated smoke passed.

## Limits

This is local target-worktree evidence only. It does not prove real target
product-code mutation, production readiness, real Codex hook trust, package
publishing, MCP, vector retrieval, or autonomous subagents.
