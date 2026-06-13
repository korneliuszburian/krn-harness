# ADR-0013: Dogfood CLI Identity And Real-Repo Preflight

## Status

Accepted.

## Context

Dogfood evidence is useful only when the operator can tell which KRN command ran, whether full task intent was preserved, whether local artifacts exist, and whether the target repo was safe to use. A global `krn` collision previously made a benchmark invalid, and real user-repo dogfood adds protected-data and source-checkout mutation risks.

## Decision

KRN-assisted dogfood must use an exact pinned KRN command path and capture `krn doctor cli` identity output.

Global `krn` is invalid for dogfood unless it is explicitly the pinned command path being recorded.

`krn start --task-spec <json>` is preferred for structured dogfood because it preserves full task intent, required artifacts, forbidden files, and required `do-not-use` paths. If a task spec is not used, `krn start` must receive the full user intent, not only a slug or task id.

Important dogfood and operator-readiness work should prefer explicit KRN skill usage over implicit repo guidance, because explicit skill prompts make the workflow and evidence requirements harder to skip.

Hooks remain unproven until a real non-bypass Codex run emits `hook.received`. Manual hook probes and fixture traces are useful diagnostics but are not hook trust proof.

First real user-repo dogfood requires preflight. The preflight must reject the KRN Harness source checkout, require a git repo, warn on protected-looking path/filename risks, inspect verify profile safety without executing it, and report pinned CLI identity.

No protected data, `.env` files, dumps, uploads, production credentials, dashboards, MCP server, subagents, semantic retrieval, or vector store work enters this P0 dogfood path.

## Consequences

Dogfood reports can mark identity-missing or global-fallback runs invalid instead of treating them as normal failures.

Real-repo dogfood may be skipped even when synthetic fixtures pass, because missing operator approval or unsafe repo state is a valid readiness result.

The preflight is heuristic. It reduces obvious risk but does not prove a repository contains no secrets or protected data.

## Alternatives Considered

- Trust ambient `krn`: rejected because PATH collisions can masquerade as KRN Harness evidence.
- Use source checkout as downstream target: rejected because benchmark mutation would contaminate product source evidence.
- Run real repo tasks without preflight: rejected because protected-data and verify-profile risks are too high.
- Treat manual hook probe as proof: rejected because it does not prove Codex loaded and trusted project hooks.

## Evidence/Source References

- `docs/demo/codex-dogfood.md`
- `docs/demo/real-repo-dogfood.md`
- `docs/specs/dogfood-result.schema.md`
- `docs/adr/ADR-0004-codex-hooks-as-guardrails.md`
- `docs/adr/ADR-0012-future-codex-exec-wrapper.md`

## Revisit When

Revisit after the first approved real user-repo dogfood run produces artifact, diff, verify, handoff, and hook-status evidence without protected data.
