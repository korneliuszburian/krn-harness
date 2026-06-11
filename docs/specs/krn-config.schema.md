# krn.config.json Schema

## Purpose

`krn.config.json` is the stable downstream config entrypoint.

## P0 Shape

```json
{
  "version": 1,
  "project": {
    "name": "example"
  },
  "runtime": {
    "dir": ".krn"
  },
  "verify": {
    "defaultProfile": "quality",
    "mode": "record-only",
    "timeoutMs": 120000,
    "maxOutputBytes": 12000,
    "profiles": {
      "quality": {
        "commands": ["pnpm lint", "pnpm typecheck", "pnpm test"]
      },
      "unit": {
        "commands": [
          {
            "command": "node",
            "args": ["src/index.test.ts"],
            "label": "unit smoke"
          }
        ]
      }
    }
  }
}
```

## Rules

- `version` must be `1`.
- Missing config falls back to defaults.
- `.krn/` remains local runtime state unless a downstream repo chooses otherwise.
- `verify.commands` is the legacy default profile command list.
- `verify.profiles` maps names to command lists and optional limits.
- `verify.defaultProfile` must reference a configured profile when `verify.profiles` is present.
- `verify.mode` may be `record-only` or `execute`; P0 defaults to `record-only`.
- `verify.timeoutMs` and `verify.maxOutputBytes` are positive integers.
- Commands may be strings for simple allowlisted commands or exact `{ command, args, label }` objects.
- `execute` mode still uses the narrow verify allowlist and never uses shell mode.
