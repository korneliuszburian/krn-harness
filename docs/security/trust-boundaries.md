# Trust Boundaries

## Boundaries

- User prompt: intent, constraints, and approvals.
- Repository files: checked-in source truth.
- `.krn/`: local runtime state and trace evidence.
- Hooks: guardrail decisions and trace points, not a sandbox.
- Generated `AGENTS.md`: downstream guidance, not enforcement.
- Generated hooks template: local command execution that requires repo-owner review.
- Generated runtime skill: workflow adapter, not the product brain.
- Future MCP: external tool boundary requiring separate auth and policy.
- Memory: local recall that requires governance before active truth.

## Rule

KRN must not treat unverified runtime artifacts, stale docs, or future memory records as authoritative without evidence.
