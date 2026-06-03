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
    "commands": ["pnpm test"]
  }
}
```

## Rules

- `version` must be `1`.
- Missing config falls back to defaults.
- `.krn/` remains local runtime state unless a downstream repo chooses otherwise.
