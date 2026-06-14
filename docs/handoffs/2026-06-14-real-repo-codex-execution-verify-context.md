# Real-Repo Codex Execution, Verify, and Context Handoff

Date: 2026-06-14

## Scope

Goal: run the next KRN-assisted real-repo execution protocol on `krn-llm-wiki`, gated by explicit approval, then harden the measured verify-profile-only context over-inclusion.

Target repo:

```text
/home/krn/coding/krn/active/krn-llm-wiki
```

Execution worktree:

```text
/tmp/krn-llm-wiki-codex-exec-20260614-193155
```

KRN Harness source baseline:

```text
7afdb8d27f058a396b1d83a24642784fa38657bd
```

## Source Baseline

- `HEAD == origin/main`: `7afdb8d27f058a396b1d83a24642784fa38657bd`.
- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm test`: pass, 236 tests.
- `pnpm verify:local`: pass, including pinned dogfood preflight.
- `pnpm --silent krn review`: warn from historical source `.krn` dogfood artifacts and source verify config.
- `pnpm --silent krn summary`: blocked by historical source `.krn` dogfood artifact.
- `pnpm --silent krn eval`: pass.
- `git diff --check`: pass.

User-owned source scratch remained out of scope: `.gitignore`, `GOAL*.md`, `ARCHITECTURE-AUDIT.md`, and `docs/audit/`.

## Target Safety

The original target checkout was inspected but not edited:

- branch: `r2c-011-update-page-operator-readiness-report`;
- HEAD: `609d8bf2b6901c39533be59c35419864cad35ee7`;
- pre-existing dirty state: modified `AGENTS.md`, untracked `.codex/`, untracked `.krn/`.

The execution used a detached worktree:

```text
/tmp/krn-llm-wiki-codex-exec-20260614-193155
```

Initial worktree state:

- detached HEAD: `609d8bf2b6901c39533be59c35419864cad35ee7`;
- clean before temporary KRN files.

Protected path scan found `raw/*`; these paths were treated as do-not-use/untrusted source constraints and were not read as task context.

Baseline target validation:

```text
python3 tools/check_all_readonly.py
All read-only checks passed. (214.94s total)
```

## Temporary Config and Preflight

Temporary target config existed only in the isolated worktree:

```text
krn.config.json
```

Readonly verify command:

```text
python3 tools/check_all_readonly.py
```

Preflight:

- eligible: `true`;
- `krnConfigExists`: `true`;
- `verifyProfileStatus`: `safe`;
- `safeVerifyCommands`: `python3 tools/check_all_readonly.py`;
- `unsafeVerifyCommands`: none;
- pinned KRN: `/tmp/krn-real-repo-preflight-bin-codex-exec-20260614-193155/krn`;
- `krnIdentityValid`: `true`;
- blockers: none;
- warning: `dirty_worktree` from temporary config/runtime files.

## Task Spec

Task spec:

```text
.krn/dogfood/real-repo-execution/second-readme-verify-profile-task-spec.json
```

Task:

```text
Docs-only second KRN-assisted real-repo task: if KRN_REAL_REPO_CODEX_APPROVED=1 is set, make one small README.md wording clarification in the Validation profiles section so the read-only suite is clearly described as the side-effect-free pre-PR validation path. Do not run Codex when the approval env is missing. Use the temporary krn.config.json readonly profile and prove python3 tools/check_all_readonly.py through krn verify --execute.
```

Expected touched file if approved:

```text
README.md
```

Required do-not-use paths:

- `raw/`
- `wiki/_approvals/`
- `wiki/_examples/`
- `wiki/_proposals/`
- `wiki/_transactions/`

## KRN Pre-Loop and Verify

Pinned KRN commands:

```text
/tmp/krn-real-repo-preflight-bin-codex-exec-20260614-193155/krn doctor cli
/tmp/krn-real-repo-preflight-bin-codex-exec-20260614-193155/krn status
/tmp/krn-real-repo-preflight-bin-codex-exec-20260614-193155/krn start --task-spec .krn/dogfood/real-repo-execution/second-readme-verify-profile-task-spec.json
/tmp/krn-real-repo-preflight-bin-codex-exec-20260614-193155/krn graph
/tmp/krn-real-repo-preflight-bin-codex-exec-20260614-193155/krn context
/tmp/krn-real-repo-preflight-bin-codex-exec-20260614-193155/krn verify --execute
```

Final task id:

```text
task-a627cf041064
```

Final verify result:

- mode: `execute`;
- status: `pass`;
- profile: `readonly`;
- total commands: `1`;
- executed commands: `1`;
- command: `python3 tools/check_all_readonly.py`;
- exit code: `0`;
- duration: `179399` ms;
- stdout truncated: `true`.

## Codex Gate

`KRN_REAL_REPO_CODEX_APPROVED` was empty.

Codex was not run. Codex session is `none`.

This is the exact blocker required by the goal. No Codex command was faked, no target commit was made, and no target push was made.

## Execution Result

Execution-result artifact:

```text
.krn/dogfood/real-repo-execution/krn-llm-wiki-codex-blocked-20260614-193155/summary.json
```

Key fields:

- `schema`: `krn-real-repo-execution-result-v1`;
- `status`: `blocked`;
- `executionKind`: `blocked`;
- `taskId`: `task-a627cf041064`;
- `validationStatus`: `pass`;
- `verifyMode`: `execute`;
- `verifyStatus`: `pass`;
- `verifyExecutedCommands`: `1`;
- `changedFiles`: `krn.config.json`;
- `forbiddenTouchedFiles`: none;
- `committedTargetRepo`: `false`;
- `pushedTargetRepo`: `false`;
- `productionProof`: `false`;
- `hookTrustStatus`: `unproven`;
- `contextOverInclusionRisk`: `low`.

## Context Before and After

Before hardening, on the fresh worktree pre-loop:

| Metric | Before |
| --- | --- |
| Total items | 26 |
| Active items | 2 |
| Reference-only items | 24 |
| Over-inclusion risk | high |
| Reasons | `reference-only-over-10`, `total-items-over-20` |

After hardening and corrected task-spec metadata:

| Metric | After |
| --- | --- |
| Total items | 12 |
| Active items | 5 |
| Reference-only items | 2 |
| Over-inclusion risk | low |
| Reasons | `within-p0-budget` |

Preserved context:

- must-read: `AGENTS.md`, `README.md`;
- should-read: `docs/architecture/architecture-spec-v0.1.md`, `krn.config.json`, `tools/check_all_readonly.py`;
- reference-only: `docs/specs/context-package.schema.md`, `README.md`;
- do-not-use: `raw/`, `wiki/_approvals/`, `wiki/_examples/`, `wiki/_proposals/`, `wiki/_transactions/`.

## Context Hardening

Implementation:

- `packages/context/src/build-context-package.ts`
  - adds expected touched files as `must-read`;
  - adds explicit repo-relative task paths as `should-read`;
  - suppresses broad graph `doc-match` noise for verify-profile-focused tasks unless the file is expected touched or explicitly named.
- `packages/context/src/build-context-package.test.ts`
  - covers verify-profile-only doc-match noise reduction;
  - proves `AGENTS.md`, `README.md`, `krn.config.json`, `tools/check_all_readonly.py`, and do-not-use constraints remain present;
  - proves deprecated docs do not become active/reference context.
- `docs/specs/context-package.schema.md`
  - documents `expected-touched-file`, `explicit-task-path`, and the verify-profile-focused narrowing rule.

This is intentionally not a graph-lite rewrite, AST pass, semantic retrieval layer, or broad context refactor.

## Review and Summary

Pinned target `krn review --write`:

- status: `warn`;
- cause: execution-result is blocked and hook trust is unproven.

Pinned target `krn summary --write`:

- status: `blocked`;
- `realRepoDogfood.executionKind`: `blocked`;
- `realRepoDogfood.validationStatus`: `pass`;
- `realRepoDogfood.productionProof`: `false`;
- `context.overInclusionRisk`: `low`;
- `verify.mode`: `execute`;
- `verify.executedCommands`: `1`;
- next action: set `KRN_REAL_REPO_CODEX_APPROVED=1` only when the operator approves a paid manual Codex run.

## Final Source Validation

- `git status --short --branch`: source branch aligned before staging; user-owned scratch remains uncommitted.
- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm test`: pass, 237 tests.
- `pnpm verify:local`: pass, including pinned dogfood preflight.
- `pnpm --silent krn review`: warn from historical source `.krn` dogfood artifacts and source verify config.
- `pnpm --silent krn summary`: blocked by historical source `.krn` dogfood artifact.
- `pnpm --silent krn eval`: pass.
- `git diff --check`: pass.

## Residual Risks

- The second Codex edit did not happen because approval env was missing.
- Hook trust remains unproven; no non-bypass trusted hook trace exists.
- The target config was temporary and not committed to `krn-llm-wiki`.
- Evidence is local evidence only, not production proof.
- The original target checkout retains pre-existing dirty files outside this run.

## Next Goal

After explicit approval, rerun the same fresh-worktree protocol with:

```text
KRN_REAL_REPO_CODEX_APPROVED=1
```

Then execute one README-only change, regenerate the execution-result artifact with `executionKind: manual-codex`, and confirm the narrowed context behavior remains low-risk during an approved Codex run.
