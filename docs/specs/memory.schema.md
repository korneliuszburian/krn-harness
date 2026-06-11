# Memory Schema

## Purpose

Memory is governed local recall, not automatic truth.

## Local Stores

- `.krn/memory/pending.json`
- `.krn/memory/approved.json`
- `.krn/memory/deprecated.json`

Each store uses:

- `schemaVersion`: `1`.
- `status`: the store status.
- `records`: memory records for that status only.

## Record Fields

- `id`: memory id.
- `summary`: concise memory content.
- `status`: `pending`, `approved`, or `deprecated`.
- `evidencePath`: optional source evidence.
- `createdAt`: ISO timestamp.
- `updatedAt`: ISO timestamp.
- `approvedAt`: required only after manual approval.
- `deprecatedAt`: required only after manual deprecation.
- `deprecationReason`: optional deprecation reason.
- `source`: `manual`.

## Manual Workflow

- `krn memory propose "<summary>" [--evidence <path>]` writes pending memory only.
- `krn memory approve <memory_id>` moves a record to approved memory.
- `krn memory deprecate <memory_id> [reason]` moves a record to deprecated memory.
- `krn memory list` reports deterministic local counts and records.

## Rule

P0 never auto-approves memory. Pending and deprecated records are not active memory.
