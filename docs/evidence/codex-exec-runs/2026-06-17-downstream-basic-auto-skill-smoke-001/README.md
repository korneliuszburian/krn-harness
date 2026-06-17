# Codex Exec Evidence Pack

Run id: 2026-06-17-downstream-basic-auto-skill-smoke-001
Kind: real_codex_exec
Target repo: downstream-basic-disposable-fixture
Target path: /tmp disposable copy of `fixtures/repos/downstream-basic`
Target commit: 7b71bc988b103ca0444908fdf5f7fe606b90a2ec
KRN source commit: 2062235f282634a031e04a16006ecc3eef012ee1
Status: completed

This pack is sanitized evidence derived from Codex exec JSONL.
Raw JSONL, raw diffs, secrets, and protected target data are not part of this committed pack.

## Target Safety

The target was a synthetic disposable fixture copied to `/tmp`. It contained
fixture README/docs/source/test files plus local uncommitted KRN install files.
It had no `.env`, auth files, customer data, protected corpora, or external
service requirements.

Target mutations were not pushed anywhere. The committed proof is this
sanitized evidence pack in `krn-harness`.

## Run Summary

Codex ran with `codex exec --sandbox workspace-write --json`, without any
prompt instruction to read `.agents/skills/krn-harness/SKILL.md` or
`references/workflow.md`.

The run completed the docs-only task, edited `docs/overview.md`, ran
`./.krn/bin/krn verify --execute`, and ran `./.krn/bin/krn handoff`.

The run is real local Codex exec evidence. It is not production proof and does
not prove hook trust.
