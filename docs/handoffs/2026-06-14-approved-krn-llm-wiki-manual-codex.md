# Approved KRN LLM Wiki Manual Codex Handoff

Date: 2026-06-14

## Scope

Goal: run the first approved manual Codex edit through KRN on `krn-llm-wiki`,
with a narrowed context package and executable verify proof.

Target repo:

```text
/home/krn/coding/krn/active/krn-llm-wiki
```

Execution worktree:

```text
/tmp/krn-llm-wiki-approved-codex-20260614-202121
```

KRN source baseline before this slice:

```text
d82fd89a0b4ed7bf5f8d2a7d520c81a3516a825f
```

## Target Safety

Original target checkout was inspected and not edited. It had pre-existing local
state on branch `r2c-011-update-page-operator-readiness-report`: modified
`AGENTS.md`, untracked `.codex/`, and untracked `.krn/`.

The approved edit ran only in the detached temporary worktree at
`/tmp/krn-llm-wiki-approved-codex-20260614-202121`.

Protected path scan found `raw/*`. The task spec marked `raw/`,
`wiki/_approvals/`, `wiki/_examples/`, `wiki/_proposals/`, and
`wiki/_transactions/` as do-not-use. The run did not edit or use them as active
context.

## Task

Task spec:

```text
.krn/dogfood/real-repo-execution/readme-validation-wording-task-spec.json
```

Task:

```text
README-only wording clarification in the validation/checks section. Clarify the
role of the read-only validation suite without changing behavior. Only README.md
may be edited. Use the temporary krn.config.json readonly profile and prove
python3 tools/check_all_readonly.py through krn verify --execute. Do not touch
source behavior, protected data, env files, dumps, uploads, credentials, client
docs, raw/, or wiki governance paths. Do not commit or push.
```

Expected target change:

```text
README.md
```

## KRN Loop

Pinned KRN:

```text
/tmp/krn-real-repo-preflight-bin-approved-20260614-202121/krn
```

Pinned identity:

- package: `@krn-harness/cli`;
- version: `0.0.0`;
- command path: `/tmp/krn-real-repo-preflight-bin-approved-20260614-202121/krn`;
- required commands present: `true`.

Task id:

```text
task-89a83d73b437
```

Pre-execution context:

- `stop`: `false`;
- total items: `12`;
- active items: `5`;
- reference-only items: `2`;
- over-inclusion risk: `low`;
- reason: `within-p0-budget`.

Preserved items:

- must-read: `AGENTS.md`, `README.md`;
- should-read: `docs/architecture/architecture-spec-v0.1.md`,
  `krn.config.json`, `tools/check_all_readonly.py`;
- reference-only: `docs/specs/context-package.schema.md`, `README.md`;
- do-not-use: `raw/`, `wiki/_approvals/`, `wiki/_examples/`,
  `wiki/_proposals/`, `wiki/_transactions/`.

Pre-execution verify:

- command: `krn verify --execute`;
- profile: `readonly`;
- status: `pass`;
- executed commands: `1`;
- command text: `python3 tools/check_all_readonly.py`.

## Codex Execution

Codex command shape:

```text
CODEX_HOME=/home/krn/.codex codex -a never -s workspace-write -C /tmp/krn-llm-wiki-approved-codex-20260614-202121 exec <README-only prompt>
```

Codex session id:

```text
019ec767-d476-7253-b7f8-4b493e801915
```

Codex exit code:

```text
0
```

Codex changed only `README.md`:

```diff
+Use this as the aggregate side-effect-free suite for validating current repository state; it intentionally excludes controlled write/restore demos.
```

No target commit or push was made.

## Verification

Codex first ran the target read-only suite directly before editing:

```text
python3 tools/check_all_readonly.py
All read-only checks passed. (165.47s total)
```

After the README edit, pinned KRN verify passed:

```text
KRN verify: pass
profile: readonly
mode: execute
commands: 1
executed: 1
result: .krn/current/verify-result.md
```

Machine result:

- `verifyMode`: `execute`;
- `verifyStatus`: `pass`;
- `verifyExecutedCommands`: `1`;
- validation command: `python3 tools/check_all_readonly.py via krn verify --execute`;
- validation duration: `164.47` seconds.

## Execution Result

Artifact:

```text
/tmp/krn-llm-wiki-approved-codex-20260614-202121/.krn/dogfood/real-repo-execution/krn-llm-wiki-manual-codex-20260614-202121/summary.json
```

Key fields:

- `status`: `pass`;
- `executionKind`: `manual-codex`;
- `changedFiles`: `README.md`;
- `forbiddenTouchedFiles`: none;
- `validationStatus`: `pass`;
- `verifyMode`: `execute`;
- `verifyExecutedCommands`: `1`;
- `committedTargetRepo`: `false`;
- `pushedTargetRepo`: `false`;
- `productionProof`: `false`;
- `hookTrustStatus`: `unproven`.

The temporary verify config was archived as:

```text
.krn/dogfood/real-repo-execution/krn-llm-wiki-manual-codex-20260614-202121/krn.config.used.json
```

It was removed from the root worktree before the final execution-result report,
so the final target changed-files list is README-only.

## Review and Summary

Target `krn review --write`:

- status: `warn`;
- dogfood evidence: one preflight summary and one execution-result summary;
- warnings: preflight-only historical summary, execution-result warning, missing
  target `package.json` `verify:local` script.

Target `krn summary --write`:

- status: `warn`;
- `realRepoDogfood.status`: `execution-evidence`;
- `realRepoDogfood.executionKind`: `manual-codex`;
- `realRepoDogfood.validationStatus`: `pass`;
- `realRepoDogfood.productionProof`: `false`;
- `realRepoDogfood.hookTrustStatus`: `unproven`;
- `hooks.status`: `unproven`;
- `reviewers.warnCount`: `2`;
- blockers: none.

## Source Validation

Final KRN Harness validation for this source slice:

- `pnpm lint`: pass, 196 files checked.
- `pnpm typecheck`: pass.
- `pnpm test`: pass, 19 files and 237 tests.
- `pnpm verify:local`: pass, including pinned dogfood preflight and ignored
  global `krn`.
- `pnpm --silent krn review`: warn from historical source `.krn` dogfood
  artifacts and source verify config with no configured commands.
- `pnpm --silent krn summary`: blocked by historical source `.krn` dogfood
  artifact and source verify config; this is pre-existing source-runtime state,
  not a failure of the approved target run.
- `pnpm --silent krn eval`: pass, 4 fixtures.
- `git diff --check`: pass.

## Usefulness Scores

Scores are 0-5 and based on this run only.

| Area | Score | Notes |
| --- | ---: | --- |
| Context usefulness | 5 | The package pointed Codex to `AGENTS.md`, `README.md`, config, and verify command without hiding do-not-use paths. |
| Context noise after hardening | 4 | Noise stayed low; `README.md` appeared twice through expected-touch and graph reference. |
| Verify clarity | 5 | Execute mode, command count, status, and command tail were clear. |
| Execution-result clarity | 4 | Final artifact is strong after excluding temporary root config; the warning label still needs operator interpretation. |
| Review usefulness | 4 | Correctly found execution evidence and preserved warnings, but target `verify:local` warning is generic. |
| Summary usefulness | 5 | Correctly promoted the run to `execution-evidence` while keeping hooks and production proof unproven. |
| Next-action clarity | 5 | Next steps are hook trust and committed target verify profile. |
| Hook honesty | 5 | No hook proof was claimed. |

False positive: target release reviewer warns about missing `verify:local`, even
though the target repo's safe command is documented through temporary
`krn.config.json` and the task spec.

False negative: execution-result artifact does not explicitly mark
`krn.config.used.json`; it is present as an archived file but not modeled in the
schema.

Missing field candidate: add an optional `temporaryConfigArtifact` field to the
real-repo execution-result schema.

## Residual Risks

- Hook trust remains unproven; no non-bypass trusted `hook.received` event exists.
- Evidence is local-only and `productionProof` remains `false`.
- Target verify profile used a temporary worktree config, not a committed target
  config.
- The run was docs-only; it does not prove broader source-editing target behavior.
- Original target checkout retains pre-existing dirty files outside this run.

## Next Goal

Run a non-bypass Codex hook trust probe, then decide whether `krn-llm-wiki`
should commit a minimal safe `krn.config.json` before broader dogfood.
