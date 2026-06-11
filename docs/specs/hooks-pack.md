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

- edit-intent `PreToolUse` without `.krn/current/task-contract.json`;
- edit-intent `PreToolUse` without `.krn/current/context-package.json`;
- edit-intent `PreToolUse` while current context STOP is active;
- edit payloads targeting `do-not-use` paths;
- edit payloads outside current `must-read` and `should-read` context paths, except scoped proof paths;
- final `Stop` without `.krn/current/task-contract.json` or `.krn/current/context-package.json`;
- final `Stop` without `.krn/current/verify-result.json`;
- final `Stop` without `.krn/current/handoff.md`.

P0 records `warn` decisions for:

- initial prompt, read-only `PreToolUse`, `PostToolUse`, `PreCompact`, or `PostCompact` events before current-state artifacts exist;
- invalid JSON stdin payloads;
- scoped test/docs/fixture proof paths outside active context;
- final `Stop` when context STOP was already captured in verify/handoff artifacts.

P0 scoped proof paths are limited to `docs/`, `fixtures/`, `tests/`, `test/`, `README.md`, `*.test.*`, and `*.spec.*`. They produce `proof-path-exception` warnings, not hard blocks, when a current task and context package exist. Paths marked `do-not-use` still block.

P0 payload parsing is shallow and deterministic. It recognizes JSON stdin, common tool name fields, path fields, and simple patch file headers. It is not a full Codex policy engine.

## Downstream Template

`krn install` writes the generated hooks template to `.codex/hooks.json` only when that file does not already exist. Repo owners must review it before relying on it.

## Evidence

- https://developers.openai.com/codex/hooks
