# Downstream Metadata Parse Fix Plan

## Problem

The first real downstream `codex exec --json` smoke found two install metadata
frictions:

- `.agents/skills/krn-harness/SKILL.md` was installed with the KRN managed
  marker before YAML frontmatter, so Codex could not load it as a skill.
- `.codex/hooks.json` carried a top-level `_krnManaged` key, so Codex rejected
  the hooks file shape.

## Decision

Keep Codex-facing files parser-clean:

- installed runtime `SKILL.md` must start with YAML frontmatter first bytes;
- the KRN managed marker may live inside frontmatter as a YAML comment;
- installed `.codex/hooks.json` must contain only the generated Codex hooks
  shape;
- hooks ownership moves to `.codex/hooks.json.krn-managed`.

## Scope

Owned files are the downstream adapter template generator, install lifecycle,
install/uninstall tests, focused specs, and sanitized follow-up evidence.

Do not add runtime skill scripts, new CLI commands, API surfaces, subagents,
MCP, hook trust claims, or production proof claims.

## Proof Plan

1. Add tests for fresh install, reinstall idempotency, uninstall, markerless
   preservation, old managed hooks migration, old runtime skill migration, and
   sidecar-managed hooks updates.
2. Run source validation.
3. Install into a temporary downstream fixture and verify parseable metadata.
4. Rerun one real `codex exec --json` downstream smoke.
5. Commit only source changes and sanitized evidence.
