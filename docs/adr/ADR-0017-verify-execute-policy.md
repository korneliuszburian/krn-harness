# ADR-0017: Verify Execute Policy

## Status

Accepted.

## Context

`krn verify` is one of KRN Harness's main evidence surfaces. It turns configured local validation commands into current artifacts, but command execution can also leak secrets, mutate repositories, run network installers, or create false confidence if it is treated as a sandbox.

P1 needs a positive decision for verify execution because ADR-0004 rejects hooks as a hard sandbox, ADR-0013 requires safe real-repo preflight, and multiple specs already rely on `shell: false`, scrubbed environment, timeouts, and compact redacted output.

## Decision

Keep verify record-only by default.

Execute commands only when the operator explicitly passes `krn verify --execute`. A config value such as `verify.mode: "execute"` does not execute commands by itself.

Allow only exact command forms accepted by KRN policy:

- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm test --coverage`;
- `npm test`;
- `npm run test`;
- `node <safe-relative-js-or-ts-file>`.

Do not allow arbitrary package script arguments. `pnpm test --coverage` is a narrow coverage exception, not permission for `pnpm test <anything>`.

Block shell syntax and redirection tokens, including `&&`, `||`, `;`, `|`, `>`, and `<`.

Block network, destructive, and remote-copy commands in verify profiles, including `curl`, `wget`, `rm`, `scp`, `git reset --hard`, and `git clean`.

Run allowed commands with:

- `child_process.spawn`;
- `shell: false`;
- timeout enforcement;
- output byte limits;
- scrubbed allowlisted environment;
- redacted compact stdout/stderr tails in artifacts.

Treat verify output as local validation evidence only. It is not a sandbox, production proof, or proof that a real user repository is safe.

## Drivers

- Safety: avoid shell expansion, destructive commands, network fetches, and inherited secret exposure.
- Reproducibility: make verify artifacts explain exactly which command form was checked or executed.
- Operator control: require explicit `--execute` for command execution.
- Protected data boundary: never store environment variables or full raw output in current artifacts.
- Dogfood readiness: real-repo preflight can inspect verify profiles without executing them.
- Coverage hygiene: allow a single coverage command without widening the policy to arbitrary test runner flags.

## Consequences

Safe local coverage measurement can be configured with exact `pnpm test --coverage`.

Some legitimate project commands remain blocked until a future ADR accepts them with evidence.

Repositories without safe verify profiles remain record-only or not-runnable. That is a lower-confidence state, not a failure to hide.

Verify still executes trusted local repository code when `--execute` is used. Operators must not use it on protected or unreviewed repositories.

## Alternatives Considered

- Arbitrary shell execution: rejected because it enables command chaining, redirection, environment expansion, and destructive scripts.
- Inherit the full shell environment: rejected because output and child processes could expose secrets.
- Auto-execute from config: rejected because local config alone must not trigger command execution.
- Allow all `pnpm test *`: rejected because test runner flags can invoke arbitrary scripts, reporters, or config paths.
- Allow network commands: rejected because verify should not fetch remote code or exfiltrate local data.
- Treat verify as a sandbox: rejected because `shell: false` and allowlists reduce risk but do not isolate trusted local code.

## Evidence/Source References

- `packages/verify/src/command-policy.ts`
- `packages/verify/src/verify.ts`
- `scripts/krn-real-repo-preflight.sh`
- `docs/specs/verify-result.schema.md`
- `docs/specs/krn-config.schema.md`
- `docs/security/trust-boundaries.md`
- `docs/adr/ADR-0004-codex-hooks-as-guardrails.md`
- `docs/adr/ADR-0013-dogfood-cli-identity-and-real-repo-preflight.md`

## Revisit When

Revisit when a real non-protected repository requires a blocked command and the operator can show safe evidence for adding that exact command form.

Revisit if coverage needs a different command than `pnpm test --coverage`.

Revisit before any Codex execution wrapper, CI gate, package publishing workflow, or protected-data workflow depends on verify execute.
