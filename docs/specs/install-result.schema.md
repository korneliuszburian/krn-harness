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
  "created": 11,
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
- `installed`: missing downstream files/directories were created and existing
  files were preserved.
- `skipped`: source checkout or another non-target condition prevented install.

Generated uninstallable files include the `KRN-HARNESS-MANAGED:v1` marker.
Existing files without that marker are preserved.
