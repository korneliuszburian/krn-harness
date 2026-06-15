# Config Doctor Schema

## Purpose

`krn-config-doctor-v1` reports whether `krn.config.json` can support safe local
verification.

It combines config loading with verify command policy checks. It does not
execute commands.

## Writers

- `krn config doctor [--json]`
- `krn config init --dry-run|--write [--profile <name>] [--json]`

`krn config doctor` writes:

- `.krn/current/config-doctor.json`
- `.krn/current/config-doctor.md`

`krn config init --write` writes `krn.config.json` and:

- `.krn/current/config-init-result.json`
- `.krn/current/config-init-result.md`

Dry-run init writes nothing.

## Doctor Shape

```json
{
  "schema": "krn-config-doctor-v1",
  "generatedAt": "2026-06-15T00:00:00.000Z",
  "status": "pass",
  "source": "file",
  "path": "/repo/krn.config.json",
  "profileName": "readonly",
  "checks": [
    {
      "name": "verify-command-policy",
      "status": "pass",
      "detail": "All configured verify commands are allowed"
    }
  ],
  "commands": [
    {
      "command": "python3 tools/check_all_readonly.py",
      "allowed": true
    }
  ],
  "nextActions": []
}
```

## Init Profiles

- `minimal`: runtime only.
- `readonly-python`: `python3 tools/check_all_readonly.py`.
- `node-test`: `node src/index.test.ts`.
- `quality`: `pnpm lint`, `pnpm typecheck`, `pnpm test`.

`init --write` refuses to overwrite an existing `krn.config.json`.
