---
name: wycinek
description: KRN Harness small vertical implementation-slice workflow. Use when writing or modifying TypeScript packages, CLI commands, schemas, trace writer, graph-lite detectors, context package builder, doctor checks, verify profiles, eval fixtures, or focused implementation code.
---

# Wycinek

## Invocation

Use explicitly as `$wycinek` for one small measurable TypeScript/docs testable
slice after the architecture scope is clear.

Expected output: one vertical slice with owned files, acceptance criteria, proof
commands, and a stop condition for unaccepted architecture.

Use this to implement KRN Harness in small measurable vertical slices.

## Scope

Job: deliver one small measurable code/docs/test slice after scope is clear.

Use when:
- editing TypeScript packages, CLI commands, schemas, trace, graph, context,
  doctor, verify, eval fixtures, or focused docs/tests;
- acceptance and proof commands can be named before editing.

Do not use when:
- the work needs architecture classification first, which belongs to `$pilnuj`;
- the work is broad multi-step delivery coordination, which belongs to `$buduj`;
- the work is only final evidence audit, which belongs to `$review`.

Stop when the slice expands beyond the owned files, needs an unaccepted
dependency or surface, or cannot be verified with focused local evidence.

## Workflow API

Inputs:
- one accepted bead with owned files or package area;
- acceptance criteria, proof commands, forbidden scope, and residual risk;
- current local patterns and helper APIs for the touched package.

Output:
- the smallest working source/docs/test change that satisfies the bead;
- focused tests or checks aligned to the changed behavior;
- no unrelated cleanup and no hidden architecture expansion.

Escalation:
- use `$pilnuj` if implementation exposes new scope, dependency, surface, or
  architecture risk;
- use `$kanon` if a source change needs active spec/ADR/canon wording first;
- use `$review` after the slice is complete and evidence needs independent
  judgment.

Proof:
- run the bead-specific focused test or command before broader gates;
- for code/schema/parser/generated-artifact changes, also run relevant typecheck
  and test coverage before claiming completion.

Condensation:
- reuse existing helpers and schemas before adding abstractions;
- remove or supersede duplicated wording only inside owned files.

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
