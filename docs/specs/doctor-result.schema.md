# Doctor Result Schema

## Purpose

`krn doctor` records deterministic P0 health checks for local KRN Harness state.

## Current Artifacts

- `.krn/current/doctor-result.json`
- `.krn/current/doctor-result.md`

## Fields

- `status`: `pass`, `warn`, or `fail`.
- `checks`: ordered health findings with `name`, `status`, and `detail`.
- `nextActions`: deterministic operator suggestions for missing graph, context, verify, or handoff artifacts.

## P0 Checks

- Config validity or missing default-config state.
- Current task, current run, context, verify, and handoff artifact presence.
- Governed memory store presence, shape, status separation, and manual approval/deprecation timestamps.
- Memory context gate: memory-sourced context must be reference-only, backed by approved store records, carry approved provenance, avoid broad single-term task matches, and honor English and Polish explicit opt-out.
- Graph JSON/Markdown artifact presence, graph JSON shape, and graph summary fields.
- Downstream `AGENTS.md`, runtime skill, and hooks template presence.
- Current context STOP state when available.
- Source checkout adapter template and build-time skill presence when applicable.
- Run trace, run metadata, global trace, hook guardrail trace payloads, and current-run pointer presence/shape.
- Hook guardrail trace payloads with `proof-path-exception` under `task-context-owned-proof-paths-v1` must include non-empty owned proof-path hints.
- Hook guardrail trace payloads must reject unknown ownership models, malformed ownership hints, over-broad hints such as `docs`, `fixtures`, `tests`, or `packages`, hint lists longer than the declared limit, and payloads larger than the declared byte limit.
- Hook guardrail trace payloads using `hook-operator-message-v1` must include compact remediation codes for warned or blocked decisions and must not include long operator text such as `userFacingMessage` or full `remediationHints`.
- Hook guardrail trace payloads may include `tracePayloadMode`. When present, it must be `full` or `compacted`; compacted payloads must use the canonical compacted detail string.

## P0 Rule

Doctor reports local health. Missing current-state artifacts are warnings, not hard CLI failures.
