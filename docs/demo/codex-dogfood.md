# Codex Dogfood Lab v0

## Purpose

This protocol checks whether KRN improves real Codex work in a local downstream repo.
It is manual-first. Normal tests and `krn eval` do not require Codex CLI, network, auth, or CI.

## Make `krn` Available

Do not trust a global `krn` for benchmark runs. A previous global `krn` collision resolved `/home/krn/.local/bin/krn`, which was not the KRN Harness CLI and made the run invalid.

From the KRN Harness source checkout, generate a pinned repo-local command for each temp dogfood repo:

```sh
pnpm install
workdir="$(mktemp -d)"
KRN="$(scripts/krn-local-shim.sh "$workdir/bin")"
"$KRN" --help
"$KRN" doctor cli
```

Record both command identity checks in every benchmark report:

- exact pinned command path, for example `$KRN`;
- `command -v krn` or `which krn` as ambient PATH evidence;
- full `"$KRN" doctor cli` output;
- whether `required_commands_present: true` appears.

If `krn doctor cli` is missing, lacks `schema: krn-harness-cli-identity-v1`, lacks `package: @krn-harness/cli`, or resolves to a global command instead of the pinned command, mark the run invalid and rerun with a fresh pinned shim.

The generated shim invokes the current source CLI directly:

```sh
scripts/krn-local-shim.sh /tmp/krn-dogfood-bin
/tmp/krn-dogfood-bin/krn doctor cli
```

Use `./.krn/bin/krn`, `./krn`, or another exact pinned path when a fixture intentionally installs a local wrapper. Do not fall back to global `krn`.

## Prepare A Temp Downstream Repo

```sh
cp -R fixtures/repos/downstream-basic "$workdir/downstream-basic"
cd "$workdir/downstream-basic"
"$KRN" install
"$KRN" status
```

Review generated files before trusting them:

- `AGENTS.md`
- `.codex/hooks.json`
- `.agents/skills/krn-harness/SKILL.md`

Hooks are guardrails and trace points, not a sandbox.

## WordPress/ACF Fixture Protocol

Use this fixture to test realistic source/config/docs selection without WordPress, PHP, Composer, or network access:

```sh
workdir="$(mktemp -d)"
KRN="$(scripts/krn-local-shim.sh "$workdir/bin")"
cp -R fixtures/repos/wordpress-acf-theme "$workdir/wordpress-acf-theme"
cd "$workdir/wordpress-acf-theme"
git init
git add .
git commit -m "fixture baseline"
"$KRN" doctor cli
"$KRN" install
"$KRN" start "Update hero field mapping in WordPress ACF theme"
"$KRN" graph
"$KRN" context
"$KRN" verify --execute
"$KRN" handoff
```

Expected evidence:

- `.krn/current/context-package.json` includes hero template/CSS and active `acf/group_hero.json`.
- `.krn/current/context-package.json` marks stale docs and `acf/legacy_group.json` as `do-not-use`.
- `.krn/current/verify-result.json` has `mode: execute`, `status: pass`, and one executed command.
- `.krn/current/handoff.md` includes verify status and mode.

Task specs live in `fixtures/dogfood/tasks/wp-*.json`; the index is `fixtures/dogfood/tasks/wp-acf-theme-index.json`.

Prompt fixtures:

- `fixtures/dogfood/skills/wp-acf-baseline.md`
- `fixtures/dogfood/skills/wp-acf-explicit-krn-skill.md`
- `fixtures/dogfood/skills/wp-acf-implicit-krn-skill.md`

## Hook Trust/Loading Probe

Before claiming hooks work in a real Codex run, prove loading and trust without bypass flags:

```sh
codex --help | rg "hook|bypass"
codex exec --help | rg "hook|bypass"
cat .codex/hooks.json
krn hook codex SessionStart
```

Then run one Codex probe normally. Do not use `--dangerously-bypass-hook-trust`.
If `.krn/traces/trace.jsonl` has no `hook.received`, record that hooks were installed but not proven trusted/loaded for that Codex surface.

Current Codex hook docs say project-local hooks load only when the project `.codex/` layer is trusted. Use `/hooks` in interactive Codex to inspect sources, review changed command hooks, and persist trust. Treat `--dangerously-bypass-hook-trust` as non-primary automation evidence only.

## Manual KRN Run

```sh
"$KRN" start "Harden downstream basic fixture context"
"$KRN" graph
"$KRN" context
"$KRN" verify --execute
"$KRN" handoff
"$KRN" eval
"$KRN" doctor
```

Collect:

- `.krn/current/task-contract.json`
- `.krn/current/context-package.json`
- `.krn/current/verify-result.json`
- `.krn/current/handoff.md`
- `.krn/current/run.json`
- `.krn/runs/<task_id>/trace.jsonl`

## Codex Interactive Probes

Start Codex in the temp repo only.

1. Review/trust hooks through Codex `/hooks`.
2. Run `fixtures/dogfood/skills/explicit-krn-skill.md`.
3. Run `fixtures/dogfood/skills/implicit-krn-skill.md`.
4. Run `fixtures/dogfood/skills/no-skill-baseline.md` in a fresh copy without KRN.
5. Record touched files, KRN artifacts, verify status, handoff status, and hook traces.

The run does not pass just because Codex says it used KRN. Prefer artifact evidence.

## Optional Headless Smoke

The optional script is local-only and skipped by default unless explicitly enabled:

```sh
scripts/krn-dogfood-preflight.sh
scripts/codex-dogfood-smoke.sh
RUN_KRN_CODEX_DOGFOOD=1 scripts/codex-dogfood-smoke.sh
```

The script must never run against the source checkout, must not use `danger-full-access`, and must not use bypass flags.
The preflight first verifies that pinned `krn --help` and `krn doctor cli` work, then proves `status/start/graph/context/verify/handoff` in a temp downstream repo without invoking Codex.

## Compare Baseline vs KRN

Use `packages/evals/src/dogfood.ts` types and grader behavior to compare:

- `baseline`
- `krn-agents-only`
- `krn-explicit-skill`
- `krn-implicit-skill`

Useful signals:

- expected files touched;
- forbidden files avoided;
- `krn status/start/context/verify/handoff` observed;
- `krnCommandPath`, `krnIdentity`, and `krnIdentityValid` recorded for every KRN run;
- `hook.received` trace events present when hooks were expected;
- verify status acceptable;
- handoff artifact present.

## Current Limits

This is not a production Codex runner, CI benchmark, dashboard, sandbox, MCP server, or hosted service.
