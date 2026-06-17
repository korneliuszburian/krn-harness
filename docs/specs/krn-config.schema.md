# krn.config.json Schema

## Purpose

`krn.config.json` is the stable downstream config entrypoint.

Runtime validation lives in `packages/config/src/schemas.ts`.

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
- `runtime.dir` is optional and defaults to `.krn`.
- `runtime.dir` may be set to a safe repo-relative dot-directory such as
  `.krn-harness` when the target repository already owns `.krn/`.
- Unsafe runtime dirs are rejected: absolute paths, `..`, `.`, `/`, values that
  do not start with `.`, and known source/documentation directories such as
  `src`, `docs`, `tools`, or `packages`.
- Write-producing commands block when the resolved runtime directory is tracked
  by git, with a recommendation to configure a separate runtime dir such as
  `.krn-harness`.
- KRN does not migrate old runtime artifacts, support multiple runtime dirs, or
  provide an environment override in v0.1.
- `verify.commands` is the legacy default profile command list.
- `verify.profiles` maps names to command lists and optional limits.
- `verify.defaultProfile` must reference a configured profile when `verify.profiles` is present.
- `verify.mode` may be `record-only` or `execute`; P0 defaults to `record-only`, and the CLI still requires `krn verify --execute` before any command is executed.
- `verify.timeoutMs` and `verify.maxOutputBytes` are positive integers.
- Commands may be strings for simple allowlisted commands or exact `{ command, args, label }` objects.
- `execute` mode still uses the narrow verify allowlist, never uses shell mode, scrubs inherited environment variables, and redacts compact output tails before writing verify artifacts.
- `python3` verify commands are allowed only for a single safe repo-relative `tools/*.py` path, with no flags, shell syntax, absolute paths, or traversal.
