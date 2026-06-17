# Install Result Schema

## Purpose

`krn-install-result-v1` records the downstream install plan or result.

It is local onboarding evidence only. It does not prove that Codex loaded hooks
or that a target repo is production-ready.

## Writer

`krn install [--dry-run] [--json] [--with-config] [--config-profile <name>]`

Confirmed installs write:

- `.krn/current/install-result.json`
- `.krn/current/install-result.md`

Dry-run prints the same schema but writes nothing.

## Shape

```json
{
  "schema": "krn-install-result-v1",
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "dryRun": false,
  "status": "installed",
  "created": 14,
  "skipped": 0,
  "actions": [
    {
      "path": "AGENTS.md",
      "kind": "file",
      "status": "created",
      "detail": "file created"
    }
  ]
}
```

## Semantics

- `planned`: dry-run only; no files, trace events, or current artifacts are
  written.
- `installed`: missing downstream files/directories were created, managed files
  with stale generated content were updated, and markerless existing files were
  preserved.
- `skipped`: source checkout or another non-target condition prevented install.

`created` counts created or updated actions. `skipped` counts preserved or
already-current actions.

Generated uninstallable files include the `KRN-HARNESS-MANAGED:v1` marker or a
managed ownership sidecar. Existing files without a marker or valid sidecar are
preserved.

Generated `.codex/hooks.json` must stay valid Codex hooks JSON. Its KRN
ownership marker lives in `.codex/hooks.json.krn-managed`, not as a top-level
JSON key.

The generated runtime skill is a managed skill folder, not only a single
`SKILL.md` file. P0 installs `SKILL.md`, `agents/openai.yaml`, and
`references/workflow.md`. Runtime skill `SKILL.md` must keep YAML frontmatter
as the first bytes; the managed marker may be a YAML comment inside that
frontmatter. Runtime skill scripts are not installed in P0.

Before planning file writes, `krn install` validates the generated downstream
`AGENTS.md` template. The quality gate requires `## Roles`,
`## Non-negotiables`, `## KRN Workflow`, KRN command references, and a runtime
skill reference. If the generated template is incomplete, install exits non-zero
with a clear quality-gate error and writes no install-result artifact.
