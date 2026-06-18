# EXT-003 Governed Memory Usefulness Proof

Date: 2026-06-18

## Scope

Operator-approved slice: EXT-003 governed-memory usefulness proof only.

Not approved and not performed:

- Stage 9 target runs;
- Stage 10 baseline comparison;
- target repository mutation;
- protected-data access;
- production proof;
- hook-trust claim;
- verify allowlist broadening;
- dashboard, MCP, vector, subagent, publishing, or browser evidence surfaces.

## Official Codex Source Check

Codex manual fetched on 2026-06-18 via `$openai-docs`
`fetch-codex-manual.mjs`; local status reported: `local manual was updated`.

Official sources used for surface boundaries:

- Codex skills:
  `https://developers.openai.com/codex/skills.md`
- AGENTS.md guidance:
  `https://developers.openai.com/codex/guides/agents-md.md`
- Codex hooks:
  `https://developers.openai.com/codex/hooks.md`
- Codex appshots:
  `https://developers.openai.com/codex/appshots.md`
- Codex memories:
  `https://developers.openai.com/codex/memories.md`

Implications for this proof:

- repo truth and mandatory team guidance belong in `AGENTS.md` or checked-in
  docs, not only in memory;
- skills are reusable Codex workflows, so `grill-with-docs` should not exist as
  an unmanaged quasi-canon skill when `$review`, `$kanon`, and `$handoff`
  already cover the bounded workflows;
- hook trust is a separate Codex trust surface and is not proven by memory,
  source docs, or manual diagnostics;
- appshots/screenshots are Codex app attachment context, not KRN proof for this
  goal; no appshot, screenshot, or browser proof was generated;
- Codex personal memories under `~/.codex` are a local recall layer and remain
  separate from KRN governed memory under `.krn/memory/*`.

## Approved Candidate

Memory id: `memory-9ea13b133ba2`

Summary:

```text
For KRN Harness target adoption, keep Python/nonstandard target validation wrapper-first: prefer target-owned tools/*.py quality-gate wrappers over broadening KRN verify allowlists until repeated approved target evidence justifies a new narrow profile.
```

Evidence path: `docs/product/adoption-friction-register.md`

Scope/use case: project/workflow; target-adoption validation discipline.

Why governed memory instead of canon: the durable rule remains in the adoption
friction register and target-adoption playbook. This memory is a recall aid for
future adoption tasks so Codex can surface the wrapper-first constraint as
reference-only context without making it an active instruction or a new verify
policy.

## Store Transition Evidence

Commands:

```bash
pnpm --silent krn memory propose "<summary>" --evidence docs/product/adoption-friction-register.md
pnpm --silent krn memory approve memory-9ea13b133ba2
pnpm --silent krn memory list
```

Observed transition:

```text
proposed: memory-9ea13b133ba2 -> pending
approved: memory-9ea13b133ba2 -> approved
pending count: 0
approved count: 2
deprecated count: 1
```

New approved record:

```json
{
  "schemaVersion": 1,
  "id": "memory-9ea13b133ba2",
  "summary": "For KRN Harness target adoption, keep Python/nonstandard target validation wrapper-first: prefer target-owned tools/*.py quality-gate wrappers over broadening KRN verify allowlists until repeated approved target evidence justifies a new narrow profile.",
  "status": "approved",
  "createdAt": "2026-06-18T18:29:27.514Z",
  "updatedAt": "2026-06-18T18:29:32.678Z",
  "source": "manual",
  "evidencePath": "docs/product/adoption-friction-register.md",
  "approvedAt": "2026-06-18T18:29:32.678Z"
}
```

Pending store after approval:

```json
{
  "schemaVersion": 1,
  "status": "pending",
  "records": []
}
```

Deprecated store remains non-active:

```text
deprecated memory-2595700e608c: goal memory smoke
```

## Relevant Context Proof

Relevant task:

```text
Prepare KRN Harness target adoption hardening around Python validation wrapper-first quality gate wrappers without broadening verify allowlists.
```

Commands:

```bash
pnpm --silent krn start "<relevant task>"
pnpm --silent krn context
```

Observed context result:

```json
{
  "taskId": "task-541eb65a54c4",
  "stop": false,
  "referenceOnlyMemoryIds": ["memory-9ea13b133ba2"],
  "mustReadMemoryCount": 0,
  "shouldReadMemoryCount": 0,
  "doNotUseMemoryCount": 0
}
```

Reference-only memory item:

```json
{
  "path": ".krn/memory/approved.json#memory-9ea13b133ba2",
  "bucket": "reference-only",
  "status": "available",
  "source": "memory",
  "selector": "approved-memory-task-match",
  "memoryId": "memory-9ea13b133ba2",
  "approvedAt": "2026-06-18T18:29:32.678Z",
  "evidencePath": "docs/product/adoption-friction-register.md",
  "matchedTerms": [
    "adoption",
    "allowlists",
    "broadening",
    "first",
    "gate",
    "harness",
    "python",
    "quality",
    "target",
    "validation",
    "verify",
    "wrapper",
    "wrappers"
  ]
}
```

## Opt-Out Proof

Opt-out task:

```text
bez pamięci: Prepare KRN Harness target adoption hardening around Python validation wrapper-first quality gate wrappers without broadening verify allowlists.
```

Commands:

```bash
pnpm --silent krn start "<opt-out task>"
pnpm --silent krn context
```

Observed context result:

```json
{
  "taskId": "task-d2310dc1acf5",
  "stop": false,
  "memoryItems": [],
  "referenceOnlyMemoryIds": [],
  "anyApprovedMemoryPath": false,
  "pendingOrDeprecatedMemoryPaths": []
}
```

## Usefulness Decision

Decision: `useful` for governed context recall.

Reason: the approved memory surfaced in a later relevant KRN task as
reference-only context with memory id, approval timestamp, matched terms, and
evidence path. It did not become must-read or should-read active context, and an
explicit Polish opt-out suppressed it completely.

Boundary: this proves the memory layer can carry a real adoption friction into a
later relevant context package. It does not prove Stage 9 target success, Stage
10 delta, production proof, hook trust, or a new verify allowlist policy.
