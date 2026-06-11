# Doctor Result Schema

## Purpose

`krn doctor` records deterministic P0 health checks for local KRN Harness state.

## Current Artifacts

- `.krn/current/doctor-result.json`
- `.krn/current/doctor-result.md`

## Fields

- `status`: `pass`, `warn`, or `fail`.
- `checks`: ordered health findings with `name`, `status`, and `detail`.

## P0 Checks

- Config validity or missing default-config state.
- Current task, current run, context, verify, and handoff artifact presence.
- Downstream `AGENTS.md`, runtime skill, and hooks template presence.
- Current context STOP state when available.
- Source checkout adapter template and build-time skill presence when applicable.
- Trace file and current-run pointer presence/shape.

## P0 Rule

Doctor reports local health. Missing current-state artifacts are warnings, not hard CLI failures.
