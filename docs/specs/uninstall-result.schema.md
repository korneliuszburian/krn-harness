# Uninstall Result Schema

## Purpose

`krn-uninstall-result-v1` records a safe uninstall plan or confirmed uninstall.

Uninstall removes only managed files that contain the KRN managed marker or, for
`.codex/hooks.json`, have a valid `.codex/hooks.json.krn-managed` ownership
sidecar. It does not delete `.krn/current`, graph, trace, run, or memory
evidence by default.

## Writer

`krn uninstall --dry-run|--confirm [--json]`

Confirmed uninstall writes:

- `.krn/current/uninstall-result.json`
- `.krn/current/uninstall-result.md`

Dry-run prints the same schema but does not remove files or write artifacts.

## Shape

```json
{
  "schema": "krn-uninstall-result-v1",
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "dryRun": true,
  "confirm": false,
  "status": "planned",
  "removed": 0,
  "candidates": [
    {
      "path": ".krn/bin/krn",
      "kind": "file",
      "status": "would-remove",
      "detail": "managed file would be removed"
    }
  ],
  "refused": [],
  "preserved": [".krn/current"]
}
```

## Safety Rules

- Only fixed repo-relative install paths are considered.
- Files without `KRN-HARNESS-MANAGED:v1` are refused and preserved, except
  `.codex/hooks.json` may be owned by `.codex/hooks.json.krn-managed` so the
  hooks JSON remains parseable by Codex.
- `.krn/current`, `.krn/graph`, `.krn/traces`, `.krn/runs`, and `.krn/memory`
  are preserved.
- There is no `--force` mode.
