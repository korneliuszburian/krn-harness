# Trust Boundaries

## Boundaries

- User prompt: intent, constraints, and approvals.
- Repository files: checked-in source truth.
- `.krn/`: local runtime state and trace evidence.
- Hooks: guardrails and trace points, not a sandbox.
- Generated templates: downstream guidance, not enforcement.
- Future MCP: external tool boundary requiring separate auth and policy.
- Memory: local recall that requires governance before active truth.

## Rule

KRN must not treat unverified runtime artifacts, stale docs, or future memory records as authoritative without evidence.
