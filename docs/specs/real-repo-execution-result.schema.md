# Real-Repo Execution Result Schema

## Purpose

`krn-real-repo-execution-result-v1` records one approved real-repo execution attempt as local KRN evidence.

It turns a manual Codex run, target validation output, and current KRN artifacts into durable machine-readable dogfood evidence.

It is not production proof.

## Artifact Paths

The writer creates:

- `.krn/dogfood/real-repo-execution/<run-id>/summary.json`
- `.krn/dogfood/real-repo-execution/<run-id>/summary.md`

## Writer

`scripts/krn-real-repo-execution-report.sh` writes the artifact from explicit environment variables and existing local artifacts.

The writer does not:

- execute Codex;
- commit;
- push;
- read `.env` contents or protected data;
- call network;
- build dashboard, MCP, vector retrieval, or subagents.

## Fields

- `schema`: `krn-real-repo-execution-result-v1`.
- `status`: derived local status: `pass`, `warn`, `fail`, `blocked`, or `skipped`.
- `generatedAt`: ISO timestamp.
- `runId`: stable run id used in the artifact path.
- `targetRepoPath`: original target repository path.
- `executionWorktreePath`: checkout or isolated worktree where execution happened.
- `targetRepoCleanBefore`: whether the execution worktree was clean before execution.
- `targetRepoCleanAfter`: whether the execution worktree was clean after execution.
- `taskSpecPath`: task spec used by `krn start --task-spec`.
- `taskId`: KRN task id.
- `taskText`: task text or prompt.
- `executionKind`: `manual-codex`, `automated-codex`, `manual-no-codex`, `blocked`, or `skipped`.
- `codexSessionId`: Codex session id when available.
- `codexExitCode`: Codex process exit code when Codex ran.
- `codexCommandShape`: command shape, with secrets omitted.
- `pinnedKrnPath`: pinned local `krn` path used as evidence.
- `krnIdentityValid`: whether `krn doctor cli` identity evidence was valid.
- `contextStop`: value from `.krn/current/context-package.json`.
- `contextOverInclusionRisk`: context package over-inclusion risk.
- `verifyMode`: KRN verify mode.
- `verifyStatus`: KRN verify status.
- `verifyExecutedCommands`: count of verify commands actually executed.
- `validationCommand`: target validation command.
- `validationStatus`: `pass`, `fail`, `blocked`, `skipped`, or `not-run`.
- `validationDurationSeconds`: validation wall-clock duration when known.
- `changedFiles`: non-runtime target changed files, excluding `.krn/`.
- `forbiddenTouchedFiles`: changed files that match protected or forbidden paths.
- `committedTargetRepo`: must remain `false` for approved manual dogfood.
- `pushedTargetRepo`: must remain `false` for approved manual dogfood.
- `hookReceivedCount`: count of `hook.received` events in local trace.
- `hookTrustStatus`: `unproven`, `manual-diagnostic-only`, `blocked`, or `partially-proven`.
- `reviewSummaryPath`: local review summary path, if present.
- `operatorSummaryPath`: local operator summary path, if present.
- `handoffPath`: local handoff path, if present.
- `evidenceClaim`: explicit local evidence claim.
- `productionProof`: always `false`.
- `risks`: residual risk strings.
- `nextActions`: concrete next actions.

## Semantics

`productionProof` must remain `false`.

`manual-codex` means an operator ran Codex manually under an approved command shape and then recorded the result.

`automated-codex` is reserved for a future implemented runner. The current safe scaffold does not execute Codex itself.

`manual-no-codex` can record non-Codex manual execution evidence, but it is not Codex execution proof.

`hookTrustStatus: "unproven"`, `"manual-diagnostic-only"`, or `"blocked"` is a warning, not a failure. `partially-proven` means scoped local hook trust evidence exists, but it is not production proof.

Any forbidden touched file, target commit, or target push is a failure.

## Examples

### Preflight-Only, Not Execution

Preflight artifacts use `krn-real-repo-preflight-v1`, not this schema:

```json
{
  "schema": "krn-real-repo-preflight-v1",
  "eligible": true,
  "krnIdentityValid": true,
  "warnings": [
    "missing_krn_config_json"
  ]
}
```

### Readiness-Only, Not Execution

Readiness artifacts use `krn-real-repo-dogfood-v1`, not this schema:

```json
{
  "schema": "krn-real-repo-dogfood-v1",
  "status": "readiness",
  "outcomeKind": "readiness-only",
  "validationClaim": "readiness-only; not real-repo execution validation"
}
```

### Manual Codex Execution Evidence

```json
{
  "schema": "krn-real-repo-execution-result-v1",
  "status": "pass",
  "executionKind": "manual-codex",
  "codexSessionId": "019ec603-262d-7ae2-8fa1-d4996c660783",
  "codexExitCode": 0,
  "krnIdentityValid": true,
  "validationStatus": "pass",
  "changedFiles": [
    "README.md"
  ],
  "forbiddenTouchedFiles": [],
  "committedTargetRepo": false,
  "pushedTargetRepo": false,
  "hookTrustStatus": "unproven",
  "evidenceClaim": "manual local execution evidence; not production proof",
  "productionProof": false
}
```

### Blocked Execution

```json
{
  "schema": "krn-real-repo-execution-result-v1",
  "status": "blocked",
  "executionKind": "blocked",
  "validationStatus": "not-run",
  "changedFiles": [],
  "forbiddenTouchedFiles": [],
  "committedTargetRepo": false,
  "pushedTargetRepo": false,
  "productionProof": false,
  "nextActions": [
    "Resolve preflight blockers, then rerun the manual protocol."
  ]
}
```

### Skipped Execution

```json
{
  "schema": "krn-real-repo-execution-result-v1",
  "status": "skipped",
  "executionKind": "skipped",
  "validationStatus": "skipped",
  "changedFiles": [],
  "forbiddenTouchedFiles": [],
  "committedTargetRepo": false,
  "pushedTargetRepo": false,
  "productionProof": false
}
```

## Limits

- The artifact is local evidence only.
- The artifact does not prove production behavior.
- The artifact does not prove hook trust unless `hookTrustStatus` is `partially-proven` from non-bypass hook evidence.
- The artifact does not replace target validation output.
