# Release Check Schema

## Purpose

`krn-release-check-v1` is the local readiness artifact for an operator handoff.

It checks that source-level release contracts exist. It is not CI proof, package
publication proof, or production proof.

## Writer

`krn release-check [--json] [--write] [--bundle]`

`--bundle` is an advanced compatibility surface. The normal operator workflow
uses `krn run --bundle`, which writes a run bundle and invokes release-check as a
supporting gate.

With `--write`, the command writes:

- `.krn/current/release-check.json`
- `.krn/current/release-check.md`

With `--bundle`, the command implies `--write` and also writes
`.krn/current/release-bundle/`.

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

## Release Bundle

`krn release-check --bundle` writes a local handoff directory that can be zipped
or sent to another developer as release-candidate evidence when an operator
explicitly needs the legacy release-candidate bundle:

- `manifest.json`
- `release-check.json`
- `release-check.md`
- `operator-report.md`
- `operator-report.json`
- `operator-report.html`
- `report-bundle/manifest.json`
- `evidence-summary.md`
- `evidence-summary.json`
- `known-gaps.md`
- `commands-run.md`
- `validation-summary.md`
- `validation-summary.json`
- `no-protected-data.md`

The manifest schema is `krn-release-bundle-manifest-v1`.

```json
{
  "schema": "krn-release-bundle-manifest-v1",
  "generatedAt": "2026-06-14T00:00:00.000Z",
  "releaseCheckStatus": "pass",
  "productionProof": false,
  "hookTrustStatus": "unproven",
  "files": [
    {
      "path": "release-check.json",
      "source": ".krn/current/release-check.json",
      "present": true,
      "required": true
    }
  ],
  "validationCommands": [
    {
      "command": "pnpm verify:local",
      "status": "recorded-not-executed-by-release-check",
      "evidence": "The release bundle records the RC validation command set; it does not execute shell commands."
    }
  ],
  "limits": ["Local release evidence only."]
}
```

The bundle records the expected validation command set, but it does not execute
those commands. Operators still need terminal output or CI metadata for command
results.

## Packaging Kill Switch

Release-check is not a publishing gate. A passing `krn release-check`, run
bundle, report bundle, local CI workflow, or local validation transcript does
not authorize package publication, plugin distribution, hosted dashboard work,
production runner work, or hook enforcement claims.

Packaging and distribution remain blocked until a separate approved goal
re-audits all of these gates:

- two approved isolated Stage 9 target product-code/test-code repeats;
- approved Stage 10 same-authority simpler-baseline comparison;
- governed memory usefulness with an operator-approved usefulness packet;
- reviewer usefulness beyond deterministic local records;
- dashboard-lite usefulness after artifact contracts are stable;
- hook-trust boundary with scoped non-bypass evidence or an explicit decision to
  keep hook trust out of packaging claims;
- production-proof boundary, with `productionProof: false` preserved unless a
  separate proof goal changes it.

Forbidden in the current release-check surface:

- `npm publish`, package-registry publish, or plugin-marketplace publish
  automation;
- release GitHub Actions or hosted release jobs;
- production runner or deployment workflow;
- hosted dashboard or server startup;
- hook enforcement/trust claim from templates or manual hook probes;
- treating local run/report/release bundles as production readiness.

## Status Semantics

- `pass`: every required local contract is present.
- `warn`: required contracts are present, but generated current artifacts such as
  operator report files should be refreshed before handoff.
- `fail`: at least one required local source contract is missing.

The CLI exits non-zero only for `fail`.

## Current Checks

- Required package scripts: `lint`, `typecheck`, `test`, `verify:local`.
- `krn run` command source exists.
- `krn report` command source exists.
- `krn artifacts` command source exists.
- `krn uninstall` command source exists.
- `krn config` command source exists.
- Install, uninstall, and config doctor schemas exist.
- Run result and operator report schemas exist.
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
- `--bundle` does not copy raw trace dumps, external assets, giant files,
  protected-looking paths, target repo artifacts, or secrets.
- Bundle `productionProof` must remain `false`.
- Bundle `hookTrustStatus` is inherited from the current operator report and is
  usually `unproven`.
- Current report artifacts are a warning because they are generated state, not
  source truth.
- A passing release check means the local handoff contract is present. It does
  not mean validation commands have passed in the current shell.
