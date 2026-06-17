# Codex Exec Evidence Pack

Run id: 2026-06-17-downstream-basic-real-smoke-002
Kind: real_codex_exec
Target repo: downstream-basic-disposable-fixture
Target path: /tmp disposable copy of `fixtures/repos/downstream-basic`
Target commit: 03b8624dee032887bb094989e487b2bd5a0b9582
KRN source commit: 968957c65cf54aea5903170c1caad1b3282c8b0b
Status: completed

This pack is sanitized evidence derived from Codex exec JSONL.
Raw JSONL, raw diffs, secrets, and protected target data are not part of this committed pack.

## Target Safety

The target was a synthetic disposable fixture copied to `/tmp`. It contained
only fixture README/docs/source/test files plus local uncommitted KRN install
files. It had no `.env`, auth files, customer data, protected corpora, or
external service requirements.

Target mutations were not pushed anywhere. The committed proof is this
sanitized evidence pack in `krn-harness`.

## Run Summary

Codex ran with `codex exec --sandbox workspace-write --json` and completed the
small docs-only task. It edited `docs/overview.md`, ran the configured
`./.krn/bin/krn verify --execute` path, and ran `./.krn/bin/krn handoff`.

The run is real local Codex exec evidence. It is not production proof and does
not prove hook trust.
