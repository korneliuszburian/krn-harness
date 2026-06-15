# Trust Boundaries

## Boundaries

- User prompt: intent, constraints, and approvals.
- Repository files: checked-in source truth for code behavior, but model-facing
  file text is untrusted context until selected by task/graph/context policy.
- `.krn/`: local runtime state and trace evidence.
- Hooks: guardrail decisions and trace points, not a sandbox.
- Generated `AGENTS.md`: downstream guidance, not enforcement.
- Generated hooks template: local command execution that requires repo-owner review.
- Generated runtime skill: workflow adapter, not the product brain.
- Verify execution: trusted local repo code run only through explicit `krn verify --execute`, narrow command policy, `shell: false`, scrubbed environment, timeout, and redacted compact output tails. It is validation evidence, not a sandbox.
- Future MCP: external tool boundary requiring separate auth and policy.
- Memory: local recall that requires governance before active truth.
- Context poisoning suspects: non-authority repository or runtime text that
  tries to override task, safety, validation, memory, protected paths,
  commit/push, production-proof, or hook-trust boundaries.

## Rule

KRN must not treat unverified runtime artifacts, stale docs, or future memory records as authoritative without evidence.

Context poisoning defense must happen before context is trusted. Hook warnings
are not sufficient because hooks are not a sandbox and hook trust remains
unproven.
