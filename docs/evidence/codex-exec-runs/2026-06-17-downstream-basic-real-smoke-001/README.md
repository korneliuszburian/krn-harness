# Codex Exec Evidence Pack

Run id: 2026-06-17-downstream-basic-real-smoke-001
Kind: real_codex_exec
Target repo: downstream-basic-disposable-fixture
Target path: /tmp disposable copy of `fixtures/repos/downstream-basic`
Target commit: 0ef74a07e4c97e36f85348c9fcc8150a21df98c8
KRN source commit: 0e358b2b152e4d4c13d07149cd27de511f5a2d3f
Status: completed

This pack is sanitized evidence derived from Codex exec JSONL.
Raw JSONL, raw diffs, secrets, and protected target data are not part of this committed pack.

## Target Safety

The target was a synthetic disposable fixture copied to `/tmp`. It contained
only README/docs/source/test fixture files from `fixtures/repos/downstream-basic`
plus local uncommitted KRN install files. It had no `.env`, auth files,
customer data, protected corpora, or external service requirements.

Target mutations were not pushed anywhere. The committed proof is this
sanitized evidence pack in `krn-harness`.

## Run Summary

Codex ran with `codex exec --sandbox workspace-write --json` and completed the
small docs-only task. It edited `docs/overview.md`, ran the configured
`./.krn/bin/krn verify --execute` path, and ran `./.krn/bin/krn handoff`.

The run is real local Codex exec evidence. It is not production proof and does
not prove hook trust.
