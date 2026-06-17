# ADR-0024: Configurable Runtime Directory

## Status

Accepted.

## Context

ADR-0002 fixed KRN runtime artifacts under `.krn/`. That default worked for
initial downstream adoption, but the overnight adoption gauntlet rejected
`krn-ai-os` because that target already tracks a product-owned `.krn/`
namespace. Writing KRN artifacts there would collide with target source truth.

The adoption blocker is about the runtime namespace, not hook trust, production
proof, multi-runtime support, config inheritance, or migration of existing
artifacts.

## Decision

Keep `.krn` as the default runtime directory.

Accept one optional config field:

```json
{
  "version": 1,
  "runtime": {
    "dir": ".krn-harness"
  }
}
```

The configured value must be a safe repo-relative dot-directory:

- starts with `.`;
- is not `.`;
- is not absolute;
- does not contain `..`;
- is not `/`;
- is not a known source or documentation directory such as `src`, `docs`,
  `tools`, or `packages`.

Recommended collision escape hatch: `.krn-harness`.

KRN write-producing commands must block before writing runtime artifacts when
the resolved runtime directory is tracked by the target git repository. The
operator-facing blocker should recommend configuring `runtime.dir`, for example
`.krn-harness`.

If git is unavailable, KRN may warn and continue unless the command already
fails for another reason.

## Non-Decisions

- No environment-variable override in v0.1.
- No migration command in v0.1.
- No automatic movement of old `.krn` artifacts.
- No support for multiple runtime directories at once.
- No generated hook trust claim.
- No production proof claim.
- No downstream hook template migration in this slice.

## Consequences

Existing users keep the same `.krn/current`, `.krn/graph`, `.krn/traces`,
`.krn/runs`, and `.krn/memory` paths unless they configure another runtime dir.

Targets that already own `.krn/` can configure `.krn-harness/` and keep KRN
runtime evidence outside product-owned source state.

Report, release-check, review, summary, trace, memory, and bundle readers must
use the same resolved runtime layout as writers. A partial implementation that
writes `.krn-harness/` but reads `.krn/` is rejected.

## Alternatives Considered

- Keep rejecting repos with tracked `.krn/`: rejected because real target
  adoption showed this blocks otherwise viable repos.
- Rename the default to `.krn-harness`: rejected because it breaks existing
  local evidence paths and docs without need.
- Add config inheritance or environment override: rejected as broader runtime
  configuration scope.
- Auto-migrate `.krn/` to `.krn-harness/`: rejected because migration needs its
  own operator UX and artifact-retention policy.

## Evidence/Source References

- ADR-0002 runtime layout.
- `docs/handoffs/2026-06-16-overnight-adoption-gauntlet-result.md`.
- `docs/product/adoption-friction-register.md`.
- `docs/product/target-adoption-playbook.md`.
- Git tracked-file detection can use the official `git ls-files` interface:
  https://git-scm.com/docs/git-ls-files

## Revisit When

Revisit if downstream hook installation must move from `./.krn/bin/krn`, if
config inheritance becomes accepted, or if operators need migration of old
runtime artifacts.
