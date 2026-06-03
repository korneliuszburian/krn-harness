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

P0 hook handling returns a deterministic response and writes `hook.received`. Unsupported events are ignored without crashing. P0 does not parse or enforce full hook payload policy.

## Downstream Template

`krn install` writes the generated hooks template to `.codex/hooks.json` only when that file does not already exist. Repo owners must review it before relying on it.

## Evidence

- https://developers.openai.com/codex/hooks
