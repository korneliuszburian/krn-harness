# Context Poisoning Defense

## Purpose

This spec defines the accepted TASK-011 defense contract. It records what KRN
must defend before context is trusted, and what remains deferred.

## Current Implementation Status

Not implemented.

Current KRN behavior has useful building blocks:

- `krn run` keeps the operator on the task-contract -> graph -> context ->
  verify -> report path.
- Task specs can record `expectedTouchedFiles`, `forbiddenTouchedFiles`, and
  `requiredDoNotUsePaths`.
- Context packages can mark task-contract `requiredDoNotUsePaths` as
  `do-not-use`.
- Verify execute policy is allowlisted, no-shell, timeout-bound, and output
  redacted.
- Real target adoption requires preflight and a clean non-protected worktree.

Current KRN behavior also has a known gap:

- `krn graph` runs before context selection and graph detectors can read
  repository file contents before task-level `requiredDoNotUsePaths` are
  applied.

This means the current defense is process-enforced for approved target runs,
not yet a hard graph/context ingestion control.

## Authority Model

KRN must keep these layers separate:

- `authority`: active operator intent, system/developer instructions,
  repo-root KRN instructions, accepted ADRs/specs, and current task contract.
- `evidence`: source files, tests, configs, docs, traces, reports, and graph
  evidence selected for the task.
- `untrusted-context`: evidence that may inform the task but must not override
  authority.
- `context-poisoning-suspect`: non-authority evidence that contains
  instruction-like text trying to alter task, safety, validation, memory, or
  output behavior.
- `do-not-use`: paths or evidence that must not become active edit context.

Downstream or target repository text, including target docs and generated
instructions, is not allowed to override the operator task, root KRN rules, or
accepted KRN ADR/spec truth.

## Required Future Behavior

The implementation slice must add deterministic checks before claiming TASK-011
complete:

1. Path policy must be available before graph detectors read file contents.
2. `requiredDoNotUsePaths` and protected-looking path policy must exclude files
   from content-reading detectors before the first read.
3. Suspicious instruction-like text from non-authority docs must be represented
   as `context-poisoning-suspect` or equivalent local evidence.
4. Poisoning suspects must not become `must-read` active edit context without a
   stronger authority source.
5. Context package JSON/Markdown must make the downgrade visible to the
   operator.
6. Trace or run-result evidence must record that the defense ran.

The first implementation should prefer deterministic string/path heuristics and
fixtures. It must not require an LLM classifier.

## Suspicious Instruction Examples

These patterns are suspect only when they appear in non-authority context:

- instructions to ignore the current task, root instructions, safety policy, or
  validation;
- instructions to read protected paths or secrets;
- instructions to disable KRN, skip `krn run`, skip verify, or hide failures;
- instructions to approve memory, commit, push, publish, or claim production
  proof without operator approval;
- instructions to treat stale docs as current truth.

Authority documents can still contain these phrases as examples or policy.
The implementation must account for source authority before downgrading.

## Required Tests

Before code implementation is accepted, add tests that prove:

- a task-spec do-not-use path is not read by graph detectors;
- protected-looking files are excluded before detector content reads;
- a stale/non-authority doc containing injection-like instructions is downgraded
  and cannot override task authority;
- root `AGENTS.md` and accepted ADR/spec text are not downgraded merely because
  they describe attacks;
- `krn run --task-spec ... --execute-verify --bundle` stays the primary proof
  workflow.

## Non-Goals

- No hook sanitizer.
- No hook trust claim.
- No protected-data workflow.
- No model/LLM classifier.
- No embeddings or vector DB.
- No MCP, dashboard, publishing, or subagent framework.
- No new top-level CLI command.
- No production security proof.

## Evidence Standard

When implementation lands, TASK-011 proof must include:

- changed source/test files;
- a focused fixture showing pre-read exclusion;
- `pnpm lint`;
- `pnpm typecheck`;
- `pnpm test`;
- `pnpm verify:local`;
- `pnpm --silent krn eval`;
- no production-proof or hook-trust claim.
