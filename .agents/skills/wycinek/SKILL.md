---
name: wycinek
description: KRN Harness small vertical implementation-slice workflow. Use when writing or modifying TypeScript packages, CLI commands, schemas, trace writer, graph-lite detectors, context package builder, doctor checks, verify profiles, eval fixtures, or focused implementation code.
---

# Wycinek

Use this to implement KRN Harness in small measurable vertical slices.

## Workflow

1. Define one small outcome.
2. State owned files and areas.
3. Define observable acceptance criteria.
4. Define the proof command or test before editing.
5. Implement only the slice.
6. Prefer thin working behavior over large unfinished scaffolding.
7. Keep APIs minimal, typed, and exportable.
8. Add or update focused tests.
9. Stop if the slice requires unaccepted architecture.

## Default Shape

```text
Bead: <small outcome>
Files/areas: <owned paths>
Acceptance: <observable repo state or behavior>
Proof: <command/test/output>
Risk: <remaining uncertainty>
```

## Guardrails

- Do not rewrite unrelated files.
- Do not smuggle P1/P2/P3 features into P0.
- Do not add dependencies without justification.
- Keep command output deterministic where tests depend on it.
