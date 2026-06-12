# Codex Dogfood Lab v0

## Purpose

This protocol checks whether KRN improves real Codex work in a local downstream repo.
It is manual-first. Normal tests and `krn eval` do not require Codex CLI, network, auth, or CI.

## Make `krn` Available

From the KRN Harness source checkout:

```sh
pnpm install
pnpm --filter @krn-harness/cli link --global
krn --help
```

If global linking is not acceptable, use a temporary shell shim for one terminal:

```sh
mkdir -p /tmp/krn-dogfood-bin
cat > /tmp/krn-dogfood-bin/krn <<'SH'
#!/usr/bin/env sh
node --import /home/krn/coding/krn/krn-harness/node_modules/tsx/dist/esm/index.mjs \
  /home/krn/coding/krn/krn-harness/packages/cli/src/index.ts "$@"
SH
chmod +x /tmp/krn-dogfood-bin/krn
export PATH="/tmp/krn-dogfood-bin:$PATH"
krn --help
```

## Prepare A Temp Downstream Repo

```sh
workdir="$(mktemp -d)"
cp -R fixtures/repos/downstream-basic "$workdir/downstream-basic"
cd "$workdir/downstream-basic"
krn install
krn status
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
cp -R fixtures/repos/wordpress-acf-theme "$workdir/wordpress-acf-theme"
cd "$workdir/wordpress-acf-theme"
git init
git add .
git commit -m "fixture baseline"
krn install
krn start "Update hero field mapping in WordPress ACF theme"
krn graph
krn context
krn verify --execute
krn handoff
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
krn start "Harden downstream basic fixture context"
krn graph
krn context
krn verify --execute
krn handoff
krn eval
krn doctor
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
scripts/codex-dogfood-smoke.sh
RUN_KRN_CODEX_DOGFOOD=1 scripts/codex-dogfood-smoke.sh
```

The script must never run against the source checkout, must not use `danger-full-access`, and must not use bypass flags.
It first verifies that `krn --help` works from the temp downstream repo.

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
- `hook.received` trace events present when hooks were expected;
- verify status acceptable;
- handoff artifact present.

## Current Limits

This is not a production Codex runner, CI benchmark, dashboard, sandbox, MCP server, or hosted service.
