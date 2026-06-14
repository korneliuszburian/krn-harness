# Next Implementation Backlog

## Purpose

This is the next P1 backlog after executable `krn review` and `krn summary`.

It keeps product value ordered by evidence:

```txt
real repo proof -> hardening -> static report -> memory lifecycle -> retrieval eval -> MCP contract -> reviewer expansion
```

## Priority 1: Real-Repo Manual Dogfood Execution

Goal: run KRN on an approved non-protected repository with a pinned local `krn`.

Current evidence: manual KRN-assisted Codex execution has run on isolated
`krn-llm-wiki` worktrees. The execution-result artifact uses
`krn-real-repo-execution-result-v1`, changed only `README.md`, used a pinned KRN
pre-loop, passed the target repo read-only validation suite, and leaves
`productionProof: false`. A later isolated `krn-llm-wiki` worktree also proved a
temporary safe `python3 tools/check_all_readonly.py` verify profile through
`krn verify --execute`; the Codex edit step was blocked because
`KRN_REAL_REPO_CODEX_APPROVED` was not set.

Likely files:

- `docs/demo/real-repo-dogfood.md`
- `scripts/krn-real-repo-dogfood.sh`
- `.krn/dogfood/**/summary.json`
- `docs/specs/real-repo-execution-result.schema.md`
- `scripts/krn-real-repo-execution-report.sh`

Acceptance:

- Preflight passes.
- Operator approval is explicit.
- No protected data is used.
- Summary records `readiness`, `blocked`, `skipped`, or executed result honestly.
- Missing-env skipped reports include exact env instructions and an explicit not-validation claim.
- Execution-result reports distinguish manual Codex evidence from production proof.

Tests:

- Existing script tests.
- Manual artifact inspection.

Risk:

- Overclaiming readiness as validation.
- Treating skipped missing-env reports as real-repo proof.
- Treating preflight-only reports as execution proof.
- Treating local execution evidence as production proof.
- Remaining without committed real target verify profiles or trusted hook evidence.

Stop conditions:

- Dirty or protected repo.
- Missing approval.
- Global `krn` fallback.

## Priority 2: Hardening After Real-Repo Result

Goal: turn real-repo findings into focused fixes.

Likely files:

- `packages/graph/src/*`
- `packages/context/src/*`
- `packages/cli/src/operator-summary.ts`
- `packages/cli/src/commands/review.ts`

Acceptance:

- Every fix maps to a dogfood finding.
- Tests cover the finding.
- No broad detector rewrite.

Tests:

- Focused unit tests.
- `pnpm test`.

Risk:

- Treating one repo as universal evidence.

Stop conditions:

- No source artifact for the finding.
- Fix requires protected data.

## Priority 3: Dashboard-Lite Generated Static HTML

Goal: generate a local static HTML view from `operator-summary.json`.

Likely files:

- `packages/cli/src/commands/report.ts`
- `docs/adr/ADR-0014-dashboard-lite-read-only-report-viewer.md`

Acceptance:

- Input is `operator-summary.json`.
- Output is a static local HTML file.
- No server, frontend framework, database, or hosted dashboard.

Tests:

- HTML generation fixture.
- No network assertion.

Risk:

- UI becomes source of truth.

Stop conditions:

- Summary schema is not stable enough.
- Any server or dashboard dependency is required.

## Priority 4: Memory Proposal Lifecycle Commands

Goal: make governed memory actions ergonomic without auto-approval.

Likely files:

- `packages/cli/src/commands/memory.ts`
- `packages/memory/src/*`
- `docs/specs/memory.schema.md`

Acceptance:

- Propose, approve, deprecate, and list remain explicit.
- Pending memory never becomes active automatically.

Tests:

- CLI memory command tests.
- Memory store tests.

Risk:

- Memory poisoning through convenience.

Stop conditions:

- Any automatic approval path.
- Any hidden rewrite of active truth.

## Priority 5: Retrieval Synthetic Eval Harness

Goal: evaluate context/retrieval quality before vector dependencies.

Likely files:

- `packages/evals/src/*`
- `fixtures/repos/*`
- `docs/adr/ADR-0016-retrieval-vector-experiment-harness.md`

Acceptance:

- Synthetic relevance fixtures exist.
- Metrics separate retrieval relevance from answer quality.
- No embeddings or vector DB dependency.

Tests:

- Fixture eval tests.
- Docs regression.

Risk:

- Adding vector infrastructure before measuring need.

Stop conditions:

- Requires external model calls.
- Requires vector DB.

## Priority 6: MCP Read-Only Fake Adapter / Schema Tests

Goal: define MCP resources over current artifacts without building a server.

Likely files:

- `docs/adr/ADR-0015-mcp-read-only-contract-spike.md`
- `docs/specs/mcp-resources.md`
- `packages/evals/src/*`

Acceptance:

- Resource names and payloads are documented.
- Tests use fake adapter data.
- No MCP server or tools.

Tests:

- Schema fixture tests.
- Docs regression.

Risk:

- Accidental action surface.

Stop conditions:

- Any write/action tool.
- Any server runtime.

## Priority 7: Reviewer Expansion

Goal: add reviewers only after current reviewers show operator value.

Likely files:

- `packages/cli/src/commands/review.ts`
- `docs/product/reviewers.md`
- `docs/specs/reviewer-result.schema.md`

Acceptance:

- New reviewer reads artifacts only.
- Output maps to `krn-reviewer-result-v1`.
- Tests include pass/warn/fail/blocked where relevant.

Tests:

- CLI review tests.

Risk:

- Reviewer layer becomes subagent framework.

Stop conditions:

- Needs model call.
- Needs shell execution.
- Needs source mutation.

## Blocked Until

- Dashboard-lite is blocked until `operator-summary.json` has real dogfood evidence.
- MCP server is blocked until read-only resources have schema tests.
- Vector DB is blocked until retrieval eval has failures worth solving.
- Subagents are blocked until deterministic reviewers are useful.
- CI is blocked until local release contract stabilizes.

## Do Not Build Yet

- Production dashboard.
- MCP server.
- Vector DB.
- Embeddings dependency.
- Autonomous subagent framework.
- Real Codex execution wrapper.
- Protected-data workflow.
- Package publishing.
- GitHub Actions.
