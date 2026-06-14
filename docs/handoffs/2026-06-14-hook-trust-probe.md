# Hook Trust Probe Handoff

Date: 2026-06-14

Goal: prove or block non-bypass Codex hook trust for KRN Harness, then decide whether `krn-llm-wiki` should commit a minimal safe `krn.config.json`.

## Summary

Non-bypass Codex hook trust is blocked/unproven in this run. KRN can install a pinned downstream hook command and the manual hook CLI works, but Codex did not load the project hook config in the isolated target worktrees. Manual probes are now classified as `manual-diagnostic-only`, and future trusted non-manual hook markers are classified as `partially-proven` only for the scoped event/path.

No target repo commit or push was made. `krn-llm-wiki` should not receive a committed `krn.config.json` from this run; keep the config temporary until target ownership/branch state is clean and hook trust/config proposal is explicitly approved.

## Source Baseline

- Source checkout: `/home/krn/coding/krn/krn-harness`.
- Start HEAD: `f3f7bc31f962e8e4ac2c36a7b0828aeec714b71e`.
- `origin/main`: `f3f7bc31f962e8e4ac2c36a7b0828aeec714b71e`.
- User-owned scratch at start: `.gitignore`, `GOAL*.md`, `ARCHITECTURE-AUDIT.md`, `docs/audit/`.
- Baseline gates passed: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm verify:local`, `pnpm --silent krn eval`, `git diff --check`.
- Baseline `pnpm --silent krn review`: exit 0 with `warn` from source-local historical `.krn` dogfood/verify caveats.
- Baseline `pnpm --silent krn summary`: exit 0 with `blocked` from historical source `.krn/dogfood/real-repo-skipped/test-source-checkout/summary.json` and source verify config.

## Codex Hook Baseline

Official Codex hook behavior used for this probe:

- Hooks are enabled by default unless `[features] hooks=false`.
- Project-local hooks require a trusted project `.codex/` layer.
- Non-managed command hooks require review/trust before they run.
- `/hooks` is the interactive hook inspection/review surface.
- `--dangerously-bypass-hook-trust` is not valid proof and was not used.

KRN baseline:

- `docs/adr/ADR-0004-codex-hooks-as-guardrails.md` keeps hooks as guardrails/trace points, not sandbox enforcement.
- `docs/specs/hooks-pack.md` defines generated hooks calling `./.krn/bin/krn hook codex <event>`.
- `packages/codex-adapter/src/templates/hooks.json.tmpl` covers `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `PostCompact`, and `Stop`.
- `packages/cli/src/commands/hook.ts` writes `hook.received` with `payloadSource`, `decision`, and `enforced: false`.

## Target Worktrees

Target repo:

- Original path: `/home/krn/coding/krn/active/krn-llm-wiki`.
- Original HEAD: `609d8bf2b6901c39533be59c35419864cad35ee7`.
- Original branch: `r2c-011-update-page-operator-readiness-report`.
- Original dirty state before/after this run: `M AGENTS.md`, `?? .codex/`, `?? .krn/`.
- Protected-data paths were not read as active context. Existing `raw/` paths were treated as do-not-use.

Isolated worktrees:

- `/tmp/krn-llm-wiki-hook-trust-20260614-211334`.
- `/home/krn/coding/krn/krn-llm-wiki-hook-trust-20260614-212000`.

Both worktrees remained detached and uncommitted with only install artifacts:

- `.agents/`
- `.codex/`
- `.krn/`
- `krn.config.json`

## Hook Install Status

KRN was installed through a pinned shim, not global `krn`.

Installed hook command:

```txt
./.krn/bin/krn hook codex <event>
```

Installed wrapper identity:

```sh
export KRN_HARNESS_BIN_WRAPPER="$0"
export KRN_HARNESS_SOURCE_ROOT="/home/krn/coding/krn/krn-harness"
exec node --import "/home/krn/coding/krn/krn-harness/node_modules/tsx/dist/esm/index.mjs" "/home/krn/coding/krn/krn-harness/packages/cli/src/index.ts" "$@"
```

No bypass flags were added to hook config.

## Manual Diagnostic Probe

Worktree: `/tmp/krn-llm-wiki-hook-trust-20260614-211334`.

Command:

```bash
./.krn/bin/krn hook codex SessionStart
```

Result:

- Exit 0.
- Trace `hook.received` count changed from 0 to 1.
- Event timestamp: `2026-06-14T19:15:38.955Z`.
- Event: `SessionStart`.
- `payloadSource`: `placeholder`.
- `decision`: `allow`.
- `enforced`: `false`.

Classification: `manual-diagnostic-only`. This is not hook trust proof.

## Non-Bypass Codex Attempts

Attempt 1:

- Worktree: `/tmp/krn-llm-wiki-hook-trust-20260614-211334`.
- Command shape: `codex -a never -s workspace-write -C <worktree> exec --json -o <last-message> <pwd prompt>`.
- No `--dangerously-bypass-hook-trust`.
- No `danger-full-access`.
- Codex session/thread: `019ec790-758e-7a81-ba0e-fb9e56ac18e6`.
- Codex executed `pwd` and returned the worktree path.
- `hook.received` count after stayed 1, meaning only the manual diagnostic probe existed.

Attempt 2:

- Worktree: `/home/krn/coding/krn/krn-llm-wiki-hook-trust-20260614-212000`.
- Command shape: `codex -a never -s workspace-write -C <worktree> exec -o <last-message> <pwd prompt>`.
- No bypass flag and no danger flag.
- Codex session: `019ec795-f4e6-7333-aae0-8e2eea168db7`.
- Codex session metadata: `originator=codex_exec`, `source=exec`, `cli_version=0.139.0`.
- `hook.received` count stayed 0.

Interactive hook inspection:

- Worktree: `/home/krn/coding/krn/krn-llm-wiki-hook-trust-20260614-212000`.
- Command shape: `codex -a never -s workspace-write -C <worktree> --no-alt-screen`, then `/hooks`.
- Result: `/hooks` showed `Installed 0` and `Active 0` for all hook events.
- Interpretation: project `.codex/hooks.json` was not loaded/trusted for this isolated worktree.

Attempt 3:

- Worktree: `/home/krn/coding/krn/krn-llm-wiki-hook-trust-20260614-212000`.
- Command shape: `codex -c 'projects."<worktree>".trust_level="trusted"' -a never -s workspace-write -C <worktree> exec -o <last-message> <pwd prompt>`.
- No bypass flag and no danger flag.
- Codex session: `019ec799-aea9-7bc1-8fcf-86829eb193cf`.
- Codex session metadata: `originator=codex_exec`, `source=exec`, `cli_version=0.139.0`.
- `hook.received` count stayed 0.

## Hook Trust Classification

Status for this run: `blocked` / `unproven`.

Evidence:

- Manual probe produced one `hook.received`, but `payloadSource` was `placeholder`.
- Non-bypass Codex exec attempts did not produce `hook.received`.
- Interactive `/hooks` showed no installed or active project hooks.
- No trusted marker such as `payloadSource: "codex-trusted-hook"` or `trustedHookLoad: true` exists.

Product classification:

- Manual probes: `manual-diagnostic-only`.
- Trusted scoped hook markers: `partially-proven`.
- This run: no trusted marker, so hook trust remains unproven/blocked.

## Review And Summary Changes

Changed source behavior:

- `krn summary` now exposes `hooks.hookTrustStatus`.
- Manual hook traces become `manual-diagnostic-only` instead of generic pass/unproven ambiguity.
- Future trusted non-manual hook markers become `partially-proven`, not production proof.
- `krn review` treats `unproven`, `manual-diagnostic-only`, and `blocked` hook trust as warning evidence for real-repo execution artifacts.
- Real-repo execution reporting default changed from `trusted` to `partially-proven` when trusted hook count is present.

Docs/specs updated:

- operator summary schema;
- real-repo execution-result schema;
- dogfood result schema;
- reviewer-result schema;
- hooks pack;
- evidence matrix.

## Target Config Decision

Decision: do not commit `krn.config.json` to `krn-llm-wiki` in this run.

Reason:

- The original target branch is already dirty with user-owned `.codex/`, `.krn/`, and `AGENTS.md` changes.
- Hook trust is blocked/unproven.
- This run installed config only in isolated worktrees.
- The goal explicitly forbids target commit/push without explicit approval.

Recommended target path later:

- Create a dedicated target PR/branch with minimal safe `krn.config.json` only after owner approval.
- Keep verify profile side-effect-free, likely wrapping `python3 tools/check_all_readonly.py`.
- Keep target KRN config independent from any claim of hook trust.

## Scope Boundaries

Not built:

- dashboard;
- MCP server;
- vector DB or embeddings;
- autonomous subagents;
- CI;
- publishing workflow;
- production Codex runner;
- hook enforcement;
- `enforced:true`;
- broad hooks/context/doctor/graph refactor.

## Known Gaps

- Exact reason Codex did not load isolated project hooks remains unresolved.
- Non-bypass hook trust proof is absent.
- Hook output did not affect Codex behavior because project hooks were not loaded.
- Target `krn.config.json` remains temporary only.
- Historical source `.krn` warnings/blockers remain and should not be silently deleted.

## Next Goal

Run a focused Codex hook trust investigation through interactive `/hooks` trust/review and persisted project trust state, using a disposable non-protected target. Stop at first scoped `hook.received` from a real non-bypass Codex hook path or document the exact Codex trust/config blocker.
