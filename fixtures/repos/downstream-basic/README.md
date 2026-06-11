# Downstream Basic

Tiny downstream fixture for KRN Harness onboarding acceptance tests.

## Smoke

```txt
krn install
krn status
krn start "Harden downstream basic fixture context"
krn graph
krn context
krn hook codex SessionStart
krn hook codex PreToolUse
krn verify
krn verify --execute
krn handoff
krn doctor
krn eval
```

## Expected Artifacts

- `AGENTS.md`
- `.codex/hooks.json`
- `.agents/skills/krn-harness/SKILL.md`
- `.krn/current/task-contract.json`
- `.krn/current/context-package.json`
- `.krn/current/verify-result.json`
- `.krn/current/handoff.md`
- `.krn/current/doctor-result.json`
- `.krn/current/eval-result.json`
- `.krn/graph/repo-graph.json`
- `.krn/traces/trace.jsonl`
- `.krn/runs/<task_id>/trace.jsonl`

This fixture is local-only evidence. It does not launch Codex, call CI, or require dependency install.
