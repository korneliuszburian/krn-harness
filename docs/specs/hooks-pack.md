# Hooks Pack

## Purpose

The Codex hooks template connects lifecycle events to `krn hook codex <event>`.

## Events

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `PreCompact`
- `PostCompact`
- `Stop`

## Limitation

Hooks are guardrails and trace points. They are not a complete security boundary or sandbox.

Codex may run multiple matching hooks concurrently, and non-managed command hooks require repo-owner trust before they run. KRN hook output is therefore local guardrail evidence, not OS-level or Codex-level sandbox policy.

P0 hook handling returns a deterministic response and writes `hook.received` with provider, event, support status, guardrail decision, payload source, finding codes, and detail. Unsupported events are ignored without crashing.

## Guardrail Decisions

The P0 response shape includes:

- `decision`: `allow`, `warn`, or `block`.
- `status`: `ok`, `warn`, `blocked`, or `ignored`.
- `enforced`: always `false` in P0, because hooks are guardrails and trace points.
- `findings`: deterministic codes with severity and optional path.

P0 records `block` decisions for:

- missing `.krn/current/task-contract.json` before turn-scope tool/final events;
- missing `.krn/current/context-package.json` before tool, compact, or final events;
- active context STOP before tool or compact events;
- edit payloads targeting `do-not-use` paths;
- edit payloads outside current `must-read` and `should-read` context paths;
- final `Stop` without `.krn/current/verify-result.json`;
- final `Stop` without `.krn/current/handoff.md`.

P0 records `warn` decisions for:

- initial prompt events before a task contract exists;
- invalid JSON stdin payloads;
- final `Stop` when context STOP was already captured in verify/handoff artifacts.

P0 payload parsing is shallow and deterministic. It recognizes JSON stdin, common tool name fields, path fields, and simple patch file headers. It is not a full Codex policy engine.

## Downstream Template

`krn install` writes the generated hooks template to `.codex/hooks.json` only when that file does not already exist. Repo owners must review it before relying on it.

## Evidence

- https://developers.openai.com/codex/hooks
