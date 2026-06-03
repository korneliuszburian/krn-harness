# Context Poisoning

## Risk

Prompt injection and stale or malicious context can steer Codex away from the operator's task.

## P0 Mitigation

- Keep `AGENTS.md` short and explicit.
- Distinguish active truth from raw research.
- Build context packages from ranked evidence.
- Preserve STOP when required context is missing.
- Record trace evidence for starts, context builds, verification, hooks, and handoffs.

## Evidence

- https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- https://arxiv.org/abs/2307.03172
