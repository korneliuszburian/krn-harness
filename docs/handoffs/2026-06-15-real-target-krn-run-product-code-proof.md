# Real Target Product-Code Proof Through `krn run`

Date: 2026-06-15

## Target

- Repo: `/home/krn/coding/krn/active/krn-llm-wiki`
- Target HEAD: `609d8bf2b6901c39533be59c35419864cad35ee7`
- Isolated worktree: `/tmp/krn-run-real-product-code-llm-wiki-20260615-1`
- Pinned KRN: `/tmp/krn-run-real-product-code-bin-20260615-1/krn`
- Source KRN HEAD floor: `5f2a60981e333ac5659c6a35d4f75c577a2278e4`

The active target checkout was dirty, so the run used a detached worktree. The
target repo was not committed or pushed.

## Task

Task spec:

`/tmp/krn-run-real-product-code-llm-wiki-20260615-1/.krn/dogfood/task-specs/status-active-pages-count.json`

Expected product-code/checker files:

- `tools/llm_wiki_status.py`
- `tools/check_llm_wiki_status.py`

Validation command:

```bash
python3 tools/check_llm_wiki_status.py
```

## Result

- Preflight: eligible before target mutation.
- `krn config doctor --json`: pass; `python3 tools/check_llm_wiki_status.py`
  allowed.
- Direct target validation: pass.
- `krn run --task-spec .krn/dogfood/task-specs/status-active-pages-count.json --execute-verify --bundle`: verified.
- Verify profile: `status`.
- Verify mode: execute.
- Executed commands: 1/1.
- Run bundle: `.krn/current/run-bundle/manifest.json`.
- Run status: `verified`.
- Run blockers: none.
- `productionProof`: false.
- `hookTrustStatus`: unproven.

## Proof Classification

This is local real target product-code proof. It is not fixture proof and not
config-only proof.

It proves that `krn run --task-spec ... --execute-verify --bundle` can carry a
small product-code/checker mutation in an isolated non-protected target worktree
through KRN verify and bundle generation.

## Limits

- No target commit.
- No target push.
- No production proof.
- No hook trust claim.
- No protected data was intentionally touched.
- The target `release-check.json` remains a KRN-source release-check artifact and
  is included as non-blocking bundle evidence for downstream target runs.
