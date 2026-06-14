# Real-Repo Executable Verify Handoff

Date: 2026-06-14

## Scope

Goal: make real-repo dogfood repeatable with executable verify evidence and context-quality findings.

Target repo:

```text
/home/krn/coding/krn/active/krn-llm-wiki
```

Execution worktree:

```text
/tmp/krn-llm-wiki-exec-verify-20260614-160415
```

KRN Harness source baseline:

```text
1ee2cc865214114e1d9d5a831c568e140bcb2fbc
```

## Source Baseline

Before the target run:

- `git rev-parse HEAD origin/main`: both `1ee2cc865214114e1d9d5a831c568e140bcb2fbc`.
- `pnpm lint`: pass.
- `pnpm typecheck`: pass.
- `pnpm test`: pass, 234 tests.
- `pnpm verify:local`: pass, including pinned local dogfood preflight.
- `pnpm --silent krn review`: warn from historical source `.krn` dogfood artifacts, no blocker.
- `pnpm --silent krn summary`: blocked by historical source dogfood artifact.
- `pnpm --silent krn eval`: pass.
- `git diff --check`: pass.

User-owned source scratch remained out of scope: `.gitignore`, `GOAL*.md`, `ARCHITECTURE-AUDIT.md`, and `docs/audit/`.

## Target Safety

Original target checkout was not used for edits. It had:

- modified `AGENTS.md`;
- untracked `.codex/`;
- untracked `.krn/`.

The run used a detached git worktree at:

```text
/tmp/krn-llm-wiki-exec-verify-20260614-160415
```

Target baseline validation in the isolated worktree:

```text
python3 tools/check_all_readonly.py
All read-only checks passed. (149.08s total)
```

Protected path scan found no `.env`, credential, dump, upload, or media-like protected files in the shallow target scan.

## Temporary Target Config

A minimal `krn.config.json` was added only in the isolated worktree:

```json
{
  "version": 1,
  "project": {
    "name": "krn-llm-wiki-real-repo-dogfood"
  },
  "runtime": {
    "dir": ".krn"
  },
  "verify": {
    "defaultProfile": "readonly",
    "mode": "record-only",
    "timeoutMs": 240000,
    "maxOutputBytes": 12000,
    "profiles": {
      "readonly": {
        "commands": [
          {
            "command": "python3",
            "args": [
              "tools/check_all_readonly.py"
            ],
            "label": "side-effect-free read-only suite"
          }
        ],
        "timeoutMs": 240000,
        "maxOutputBytes": 12000
      }
    }
  }
}
```

Preflight accepted the profile:

- eligible: `true`;
- `krnConfigExists`: `true`;
- `verifyProfileStatus`: `safe`;
- `safeVerifyCommands`: `python3 tools/check_all_readonly.py`;
- `unsafeVerifyCommands`: none;
- pinned KRN: `/tmp/krn-real-repo-preflight-bin-peeZg9/krn`;
- `krnIdentityValid`: `true`.

## KRN Run

Task spec:

```text
.krn/dogfood/real-repo-execution/verify-profile-task-spec.json
```

Pinned KRN commands in the isolated worktree:

```text
/tmp/krn-real-repo-preflight-bin-peeZg9/krn start --task-spec .krn/dogfood/real-repo-execution/verify-profile-task-spec.json
/tmp/krn-real-repo-preflight-bin-peeZg9/krn graph
/tmp/krn-real-repo-preflight-bin-peeZg9/krn context
/tmp/krn-real-repo-preflight-bin-peeZg9/krn verify
/tmp/krn-real-repo-preflight-bin-peeZg9/krn verify --execute
```

Signals:

- task id: `task-343f38246a71`;
- graph: 129 nodes, 78 edges;
- context stop: `false`;
- record-only verify: warn, 1 command configured, 0 executed;
- execute verify: pass, 1 command configured, 1 executed.

Executable verify result:

```text
.krn/current/verify-result.json
```

Key fields:

- `mode`: `execute`;
- `status`: `pass`;
- `profileName`: `readonly`;
- `configuredCommands`: `python3 tools/check_all_readonly.py`;
- `executedCommands`: `python3 tools/check_all_readonly.py`;
- `limits.timeoutMs`: `240000`;
- `limits.maxOutputBytes`: `12000`;
- command duration: `148219` ms;
- command exit code: `0`;
- `stdoutTruncated`: `true`.

## Codex Execution Gate

The second tiny Codex task did not run because:

```text
KRN_REAL_REPO_CODEX_APPROVED
```

was not set in the environment.

This is an intentional blocker, not a failed execution. No Codex command was run, no target commit was made, and no target push was made.

Execution-result artifact:

```text
.krn/dogfood/real-repo-execution/krn-llm-wiki-verify-blocked-20260614-160415/summary.json
```

Key fields:

- `schema`: `krn-real-repo-execution-result-v1`;
- `status`: `blocked`;
- `executionKind`: `blocked`;
- `validationStatus`: `pass`;
- `verifyMode`: `execute`;
- `verifyStatus`: `pass`;
- `verifyExecutedCommands`: `1`;
- `validationCommand`: `python3 tools/check_all_readonly.py via krn verify --execute`;
- `validationDurationSeconds`: `148.219`;
- `changedFiles`: `krn.config.json`;
- `forbiddenTouchedFiles`: none;
- `committedTargetRepo`: `false`;
- `pushedTargetRepo`: `false`;
- `productionProof`: `false`;
- `hookTrustStatus`: `unproven`.

## Context Quality

Measured context package:

- total items: 24;
- active items: 2;
- reference-only items: 18;
- coverage required/present/missing: 1/1/0;
- coverage confidence: medium;
- over-inclusion score: 30;
- over-inclusion risk: high;
- reasons: `reference-only-over-10`, `total-items-over-20`.

| Signal | Evidence | Finding |
| --- | --- | --- |
| Required context present | `AGENTS.md` present, no missing required items | Positive signal |
| Active context small | 2 active items | Good for a verify-only task |
| Reference-only context high | 18 reference-only items | Over-inclusion risk |
| Total context high | 24 total items | Over-inclusion risk |
| Do-not-use paths surfaced | `raw/`, `wiki/_approvals/`, `wiki/_proposals/`, `wiki/_transactions/` | Useful as constraints, but they still add item count |
| Graph-lite term matches | `.claude/README.md`, `apps/news-compiler/README.md`, `raw/README.md`, `wiki/*/README.md` | Likely noisy for verify-only task |

Recommended narrow follow-up: teach context/graph selection to down-rank graph-lite doc matches when the task is verify-profile-only and the file is neither required, touched, nor part of the configured verify command path.

## Hardening Done

Finding 1: real target readonly validation uses a Python script, but verify/preflight allowed only the existing JS/package-manager shapes.

Fix:

- `packages/verify/src/command-policy.ts` allows exactly `python3 <safe repo-relative tools/*.py>` with one argument, no flags, no absolute paths, and no traversal.
- `scripts/krn-real-repo-preflight.sh` mirrors the same rule.
- `packages/verify/src/verify.test.ts` covers allowed and blocked Python command shapes.
- `packages/cli/src/index.test.ts` covers safe Python verify profile evidence in preflight.
- `docs/specs/krn-config.schema.md` documents the constrained `python3` verify command contract.

Finding 2: operator summary was losing the most actionable execution-result blocker and falling back to generic guidance.

Fix:

- `packages/cli/src/operator-summary.ts` preserves the first string from execution-result `nextActions` for blocked/skipped summaries.
- `packages/cli/src/index.test.ts` covers blocked execution-result next-action propagation.
- `docs/specs/operator-summary.schema.md` documents this behavior.

Pinned KRN after hardening:

```text
/tmp/krn-real-repo-preflight-bin-peeZg9/krn review --write
/tmp/krn-real-repo-preflight-bin-peeZg9/krn summary --write
```

Latest target operator summary:

- status: `blocked`;
- `realRepoDogfood.executionKind`: `blocked`;
- `realRepoDogfood.validationStatus`: `pass`;
- `verify.mode`: `execute`;
- `verify.executedCommands`: `1`;
- `productionProof`: `false`;
- next action: `Set KRN_REAL_REPO_CODEX_APPROVED=1 only when operator approves a paid manual Codex run`.

## Residual Risks

- Second real-repo Codex task remains blocked until operator sets `KRN_REAL_REPO_CODEX_APPROVED=1`.
- Context over-inclusion remains high and is measured, not fixed broadly in this slice.
- Hook trust remains unproven because no non-bypass Codex hook trace exists.
- The target `krn.config.json` was temporary in an isolated worktree, not committed to the target repo.
- All evidence is local evidence only, not production proof.

## Next Goal

After explicit operator approval, rerun the same isolated-worktree protocol with `KRN_REAL_REPO_CODEX_APPROVED=1` and one tiny README-only task, then compare context size before and after a narrow verify-only context selection fix.
