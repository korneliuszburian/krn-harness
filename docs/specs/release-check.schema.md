# Release Check Schema

## Purpose

`krn-release-check-v1` is the local readiness artifact for an operator handoff.

It checks that source-level release contracts exist. It is not CI proof, package
publication proof, or production proof.

## Writer

`krn release-check [--json] [--write]`

With `--write`, the command writes:

- `.krn/current/release-check.json`
- `.krn/current/release-check.md`

## Shape

```json
{
  "schema": "krn-release-check-v1",
  "generatedAt": "2026-06-14T00:00:00.000Z",
  "status": "pass",
  "checks": [
    {
      "id": "package-scripts",
      "status": "pass",
      "summary": "Required local validation scripts are present.",
      "evidence": ["package.json"],
      "nextAction": null
    }
  ],
  "blockers": [],
  "warnings": [],
  "nextActions": []
}
```

## Status Semantics

- `pass`: every required local contract is present.
- `warn`: required contracts are present, but generated current artifacts such as
  operator report files should be refreshed before handoff.
- `fail`: at least one required local source contract is missing.

The CLI exits non-zero only for `fail`.

## Current Checks

- Required package scripts: `lint`, `typecheck`, `test`, `verify:local`.
- `krn report` command source exists.
- `krn artifacts` command source exists.
- `krn uninstall` command source exists.
- `krn config` command source exists.
- Install, uninstall, and config doctor schemas exist.
- Operator report schema exists.
- Release-check schema exists.
- Evidence matrix exists.
- MVP state document exists.
- Minimal verification workflow exists.
- Verify execution policy source exists.
- Current operator report artifacts exist.
- Current operator report bundle manifest exists.
- No forbidden MCP/vector/embedding/subagent product package layers exist.

## Limits

- The command reads local files only.
- The command does not run lint, typecheck, tests, verify, Codex, network calls,
  package publication, or GitHub APIs.
- Current report artifacts are a warning because they are generated state, not
  source truth.
- A passing release check means the local handoff contract is present. It does
  not mean validation commands have passed in the current shell.
