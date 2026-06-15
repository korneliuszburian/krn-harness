# ADR-0018: Runtime Schema Validation

## Status

Accepted.

## Context

KRN Harness stores and reads operator-facing artifacts as JSON: `krn.config.json`,
task contracts, task specs, trace JSONL, verify results, reports, and run
bundles. TypeScript interfaces document those shapes during development, but
they do not validate untrusted JSON at runtime.

TASK-001 in GOAL-8H requires schema-backed runtime validation before broader
workflow expansion. This is especially important for `krn run --task-spec`,
config loading, and trace replay because those paths turn local JSON into
trusted typed data.

## Decision

Use Zod as the P0 runtime schema library for KRN-owned JSON/domain inputs.

Define runtime schemas first in the existing schema modules, then export
TypeScript types with `z.infer`. Keep compatibility wrappers such as
`validateKRNConfig`, `isKRNConfig`, and existing public type names so callers do
not need an API migration during this slice.

Apply schemas first at these boundaries:

- `krn.config.json` loading;
- `krn start --task-spec` and `krn run --task-spec`;
- `.krn/current/task-contract.json` reads;
- trace JSONL read/write paths;
- generated task-contract validation helpers.

Do not use this ADR to rewrite every test-side `JSON.parse`, add new CLI
commands, add JSON Schema generation, or validate unrelated downstream project
files.

## Drivers

- Runtime safety: reject malformed JSON artifacts before they become typed KRN
  state.
- Operator clarity: surface path-aware validation errors in CLI/run artifacts.
- Type discipline: keep schema and static types in one source of truth.
- Scope control: add one small dependency instead of a custom validation
  framework.

## Consequences

Zod becomes a runtime dependency of KRN Harness.

Schema modules own validation behavior and path formatting. Some validation
messages become more structured, but command-level prefixes remain stable.

Unknown fields are not a new supported extension mechanism. Future schema
expansion still needs docs/spec/ADR rationale when it changes operator-facing
contracts.

Future GOAL-8H ADR numbering shifts: ADR-0019 is now reserved for the queryable
trace read model, so the context-poisoning ADR planned in the GOAL-8H backlog
should use ADR-0020 unless another accepted ADR claims that number first.

## Alternatives Considered

- Keep hand-written validators: rejected because config, task-spec, contract,
  and trace validation would continue to drift independently.
- JSON Schema only: rejected for this slice because KRN needs TypeScript-first
  inferred types and lightweight runtime parsing now; JSON Schema export can be
  considered later if an external contract requires it.
- Valibot or custom parser helpers: rejected because the active task names Zod,
  and Zod directly supports schema definition, parsing, safe parsing, and type
  inference in one dependency.

## Evidence/Source References

- `packages/config/src/schemas.ts`
- `packages/task-contract/src/schema.ts`
- `packages/trace/src/schema.ts`
- `docs/specs/krn-config.schema.md`
- `docs/specs/task-contract.schema.md`
- `docs/specs/trace.schema.md`
- Zod official docs: https://zod.dev/

## Revisit When

Revisit if schema validation needs JSON Schema export for downstream consumers,
if Zod creates unacceptable runtime/package cost, or if a future publishing
workflow requires a stricter public compatibility policy.
