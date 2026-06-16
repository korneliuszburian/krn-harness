# 2026-06-16 Overnight Adoption Gauntlet Result

## Summary

The gauntlet completed the required adoption checks without adding KRN product
features. `krn-llm-wiki` post-merge truth was confirmed, a `.krn/` hygiene PR
was opened, and a second real target run on
`marketing-intelligence-studio` reached `verified`.

No target main branch was pushed directly. No target PR was merged. No
production proof or hook trust proof is claimed.

## Source Baseline

- Source HEAD: `217b239c55978f3cdb2a2b1c18c376f6e77c74be`.
- `HEAD == origin/main`: yes at baseline start.
- Baseline commands:
  - `pnpm lint`: pass.
  - `pnpm typecheck`: pass.
  - `pnpm test`: pass, 39 files and 316 tests.
  - `pnpm verify:local`: pass.
  - `pnpm --silent krn run --task "overnight adoption gauntlet source baseline" --dry-run --json`: planned, no blockers.
  - `pnpm --silent krn release-check --write`: pass.
  - `pnpm --silent krn eval`: pass after sequential rerun.
  - `git diff --check`: pass.
  - `git diff --cached --check`: pass.

The first `krn eval` attempt failed because it ran in parallel with the source
dry-run and read the run trace before `context.built`, `verify.ran`, and
`handoff.created` were appended. Sequential rerun passed.

## krn-llm-wiki Confirmation

- PR #78: `https://github.com/korneliuszburian/krn-llm-wiki/pull/78`.
- State: `MERGED`.
- Merged at: `2026-06-16T08:43:42Z`.
- Merge commit: `19e6f220b8d05fcf3e2947a8d48116c5d953e8ca`.
- Changed files: `krn.config.json` only.
- Target `main` contains `krn.config.json`.
- Target `main` does not contain `.krn/`; GitHub contents lookup returned 404.

## krn-llm-wiki Hygiene PR

- PR #79: `https://github.com/korneliuszburian/krn-llm-wiki/pull/79`.
- Branch: `krn-ignore-runtime-artifacts-20260616`.
- Commit: `d7807fc chore: ignore krn runtime artifacts`.
- Changed files: `.gitignore` only.
- Validation: `python3 tools/check_all_readonly.py`.
- Result: pass, all read-only checks passed in 133.00s.
- Status: open and unmerged.

## Second Target

- Selected repo: `korneliuszburian/marketing-intelligence-studio`.
- Isolated clone: `/tmp/marketing-intelligence-studio-adoption-20260616`.
- Base commit: `811da65713a101cb374b33af12759d86caff59bf`.
- Safety classification: `SELECTED_WITH_EXCLUSIONS`.
- Task type: local config/checker adoption proof.

Rejected candidate:

- `krn-ai-os`: blocked because it already tracks a product-owned `.krn/`
  namespace, which collides with KRN Harness v0.1 fixed runtime storage.

## Second Target Validation

Direct target checks:

- `python3 -m pytest`: target-suite blocker, 361 passed and 3 failed in
  `tests/test_feedback_gsc_metrics_intelligence.py`.
- `scripts/quality_gate.sh`: pass with the target default fast profile.

KRN local proof files:

- `krn.config.json`.
- `tools/krn_check_quality_gate.py`.
- `.krn/local/second-target-repeat-task-spec.json`.

KRN commands:

- `krn config doctor --json`: pass.
- `krn run --task-spec .krn/local/second-target-repeat-task-spec.json --execute-verify --bundle`: verified.

KRN run evidence:

- Run status: `verified`.
- Verify mode/status: `execute` / `pass`.
- Executed commands: 1 of 1.
- Executed command: `python3 tools/krn_check_quality_gate.py`.
- Verify duration: 35974ms.
- Bundle manifest: `.krn/current/run-bundle/manifest.json`.
- `productionProof`: `false`.
- `hookTrustStatus`: `unproven`.
- Blockers: none.

Target generated/untracked state stayed local:

- Untracked: `.krn/`, `krn.config.json`, `tools/`.
- Ignored/generated: `.local/`, `out/`, caches and `__pycache__/`.
- No target commit, push, PR, or merge was performed for the second target.

Config-only PR was skipped because the useful KRN config depends on a local
`tools/krn_check_quality_gate.py` wrapper, and this goal only allows target PR
files `krn.config.json`, `.gitignore`, and safe docs.

## Findings

- `.krn/` target ignore hygiene is real adoption friction; PR #79 addresses it
  for `krn-llm-wiki`.
- KRN v0.1 fixed `.krn/` runtime storage blocks adoption in repos that already
  track a product-owned `.krn/`.
- KRN verify policy is intentionally narrow; Python repos often need a safe
  `tools/*.py` checker wrapper.
- Full target suites may fail while a target-owned release/quality gate passes;
  adoption docs must record which command is authoritative.
- Safety reviewers currently fail if protected-looking paths such as `.env`
  enter context even as explicit do-not-use evidence. The target proof avoided
  that by keeping env exclusions in prose and directory exclusions in structured
  task-spec fields.
- Source release-check remains non-blocking evidence during downstream target
  runs.

## Limits

- This is local isolated-worktree proof, not production proof.
- Hook trust remains unproven.
- No external audit TASK-001..014 work was implemented.
- No GOAL-8H gated task was implemented.
- No new CLI command, bundle variant, MCP, dashboard, vector DB, embeddings,
  autonomous subagent layer, package publishing, or production runner was added.
