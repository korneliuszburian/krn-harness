# Real-Repo Dogfood Protocol

## Purpose

Use this protocol before spending paid Codex calls on a real user repository.
It is a dry dogfood readiness flow, not production validation.

Do not use this with protected data.

## Safe Repo Criteria

A real repo is eligible only when all of these are true:

- repo owner/operator explicitly approves the run;
- target is not the KRN Harness source checkout;
- target is a git repo with branch isolation;
- worktree is clean before the run, or the dirty state is explicitly accepted and documented;
- no protected client/company data is needed;
- no secrets, `.env` files, dumps, uploads, credentials, or production configs are in scope;
- no database dump, media upload, or client document is read;
- no network is used except the model call;
- Codex runs with workspace-write sandboxing;
- KRN is invoked through an exact pinned command path, never global `krn`;
- `krn doctor cli` proves `krn-harness-cli-identity-v1`;
- `krn install`, `krn status`, `krn start --task-spec`, `krn graph`, `krn context`, `krn verify`, and `krn handoff` are available.

## Preflight

Run from the KRN Harness source checkout:

```sh
scripts/krn-real-repo-preflight.sh <repo-path>
```

The script uses filename/path heuristics only. It does not read file contents for secrets in P0.

It rejects:

- missing repo path;
- KRN Harness source checkout as target;
- non-git repo.

It warns on:

- dirty worktree;
- `.env` files;
- likely dumps;
- large protected-looking files;
- credential-looking filenames;
- missing `krn.config.json`;
- missing or unsafe verify profile.

It writes a JSON summary and Markdown summary under:

```text
.krn/dogfood/real-repo-preflight/latest/
```

If `KRN_REAL_REPO_PREFLIGHT_INSTALL=1` is not set, `krn install` is not run. The report lists what would be installed.

## Safe Verify Profiles

Verify profiles are explicit allowlists. Do not execute project commands unless they are configured and pass KRN command policy.

Allowed examples:

```json
{
  "version": 1,
  "verify": {
    "defaultProfile": "unit",
    "profiles": {
      "unit": {
        "commands": [{ "command": "node", "args": ["src/index.test.ts"] }]
      },
      "quality": {
        "commands": ["pnpm lint", "pnpm typecheck", "pnpm test"]
      }
    }
  }
}
```

Node/Vite example:

```json
{
  "version": 1,
  "verify": {
    "defaultProfile": "unit",
    "profiles": {
      "unit": { "commands": ["pnpm test"] },
      "quality": { "commands": ["pnpm lint", "pnpm typecheck"] }
    }
  }
}
```

WordPress theme static test example:

```json
{
  "version": 1,
  "verify": {
    "defaultProfile": "theme-js",
    "profiles": {
      "theme-js": { "commands": [{ "command": "node", "args": ["tests/theme.test.js"] }] }
    }
  }
}
```

PHP project where PHP is unavailable:

```json
{
  "version": 1,
  "verify": {
    "mode": "record-only"
  }
}
```

Bedrock project example:

```json
{
  "version": 1,
  "verify": {
    "defaultProfile": "frontend",
    "profiles": {
      "frontend": { "commands": ["pnpm lint", "pnpm test"] }
    }
  }
}
```

No-test repo example:

```json
{
  "version": 1,
  "verify": {
    "mode": "record-only"
  }
}
```

Never run `composer install`, `npm install`, migrations, deploys, uploads, destructive commands, shell pipelines, redirects, `curl`, or `wget` automatically from a verify profile.

## Before Run Checklist

- Operator approval recorded.
- Paid Codex calls approved.
- Clean worktree confirmed.
- Branch created or branch isolation documented.
- `scripts/krn-real-repo-preflight.sh <repo-path>` passes or warnings are accepted.
- Pinned KRN path captured.
- `<pinned-krn> doctor cli` captured.
- `command -v krn` captured as ambient/global evidence.
- `krn.config.json` and verify profile status captured.
- Full task intent or task spec prepared.

## During Run Checklist

- Use workspace-write sandbox.
- Use exact pinned KRN path.
- Do not use global `krn`.
- Do not use `danger-full-access`.
- Do not use hook trust bypass as proof.
- Run `krn start --task-spec <json>`.
- Run `krn graph` before `krn context`.
- Stop if context reports STOP.
- Run `krn verify --execute` only when a safe verify profile is configured.
- If no safe verify profile exists, run record-only `krn verify` and record why confidence is lower.
- Run project-native tests only when explicitly safe.
- Run `krn handoff`.
- Review diff before any commit.

## After Run Checklist

- Collect `.krn/current/task-contract.json`.
- Collect `.krn/current/task-contract.md`.
- Collect `.krn/current/context-package.json`.
- Collect `.krn/current/context-package.md`.
- Collect `.krn/current/verify-result.json`.
- Collect `.krn/current/handoff.md`.
- Collect `.krn/current/run.json`.
- Collect run trace JSONL.
- Count `hook.received`.
- Capture touched files.
- Capture forbidden touched files.
- Capture protected-path check.
- Capture source checkout mutation check.
- Do not auto-commit unless operator allowed it.
- Do not push unless operator allowed it.

## Invalid Run Checklist

Mark a run invalid when any of these are true:

- pinned KRN identity is missing or invalid;
- global `krn` was used;
- source checkout was used as downstream target;
- protected data was touched;
- `.env`, dump, uploads, or production config entered context;
- `danger-full-access` was used;
- hook bypass was used as proof;
- required artifacts are missing;
- context STOP was ignored;
- executable verify was claimed without `krn verify --execute` evidence.

## Safe To Commit Checklist

- Diff is limited to task scope.
- No protected files are touched.
- No generated `.krn` artifacts are staged.
- No benchmark artifacts are staged unless they are sanitized docs.
- Verify evidence is present.
- Handoff is present.
- Operator approved commit.

## Safe To Rerun Checklist

- Previous run is summarized.
- Worktree is reset or branch-isolated intentionally.
- Pinned shim regenerated.
- `krn doctor cli` rerun.
- Ambient/global `krn` evidence recaptured.
- Warnings and operator decisions reviewed again.

## Prompt Templates

Baseline no-KRN:

```text
You are working in <repo>. Complete this tiny scoped task without using KRN.
Task: <full task intent>
Constraints: workspace-write only, no secrets, no protected data, no uploads, no dumps, no production config, no network except model call.
Before final: list touched files, commands run, verification result, and any uncertainty.
```

KRN explicit:

```text
Use the pinned KRN command: <pinned-krn>.
First run `<pinned-krn> doctor cli` and record the identity output.
Then run `<pinned-krn> start --task-spec <task-spec.json>`, `<pinned-krn> graph`, `<pinned-krn> context`, safe verify, and `<pinned-krn> handoff`.
Task: <full task intent>
Constraints: workspace-write only, no global krn, no secrets, no protected data, no uploads, no dumps, no production config, no network except model call.
Final response must list pinned KRN path, identity, touched files, forbidden files avoided, verify evidence, handoff evidence, context STOP status, and hook status.
```

KRN explicit with no safe verify:

```text
Use the pinned KRN command: <pinned-krn>.
No safe executable verify profile is configured. Use record-only `<pinned-krn> verify` and say confidence is lower.
Run `<pinned-krn> start --task-spec <task-spec.json>`, `<pinned-krn> graph`, `<pinned-krn> context`, record-only verify, and `<pinned-krn> handoff`.
Do not invent or run project commands.
```

## Scoring Rubric

Score each run on:

- correct files touched;
- forbidden files avoided;
- no protected data entered context;
- pinned KRN identity valid;
- no global KRN fallback;
- task intent preserved;
- context package includes required source/test/config;
- stale docs and protected paths excluded or marked do-not-use;
- verify status and mode match configured safety;
- handoff present;
- trace present;
- hook status reported without enforcement claims.

## Known Limitations

- Preflight uses filename/path heuristics only.
- It does not prove a repo has no secrets.
- It does not prove Codex loaded project hooks.
- It does not validate production readiness.
- It does not run paid Codex calls.
- It does not install dependencies.
- It does not execute verify by default.
- It does not commit or push.

## Real Run Gate

Only run the first real-repo dogfood when both are set:

```sh
KRN_REAL_REPO_DOGFOOD_PATH=<repo-path>
KRN_REAL_REPO_DOGFOOD_APPROVED=1
```

If either is missing, create a skipped report and do not call the repo validated.
