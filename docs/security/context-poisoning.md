# Context Poisoning

## Risk

Prompt injection and stale or malicious context can steer Codex away from the operator's task.

## P0 Mitigation

- Keep `AGENTS.md` short and explicit.
- Distinguish active truth from raw research.
- Build context packages from ranked evidence.
- Preserve STOP when required context is missing.
- Record trace evidence for starts, context builds, verification, hooks, and handoffs.

## TASK-011 Contract

ADR-0023 accepts context poisoning defense as a graph/context ingestion
contract. The implementation includes pre-read path exclusion for task-spec
do-not-use paths and protected-looking paths, plus deterministic downgrade of
instruction-like non-authority Markdown docs.

The important boundary is pre-context trust. Repository text is evidence, not
authority, unless repo/operator policy promotes it. Non-authority files that try
to override the task, safety policy, validation, memory, protected paths,
commit/push limits, production proof, or hook trust are treated as
`context-poisoning-suspect` / `do-not-use` context evidence when detected by the
deterministic Markdown policy.

Current limitation: this is deterministic local risk reduction, not a sandbox
or complete prompt-injection detector. Approved real target runs still require a
clean isolated target, target preflight, no protected data, and explicit
task-spec forbidden/do-not-use paths before
`krn run --task-spec ... --execute-verify --bundle`.

This is not a hook sanitizer, hook trust proof, protected-data workflow, or
production security guarantee.

## Evidence

- https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection
- https://arxiv.org/abs/2307.03172
- `docs/adr/ADR-0023-context-poisoning-defense.md`
- `docs/specs/context-poisoning-defense.md`
