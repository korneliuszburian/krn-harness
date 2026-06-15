# ADR-0023: Context Poisoning Defense

## Status

Accepted. Pre-read path policy and poisoning-suspect downgrade implemented.

## Context

GOAL-8H TASK-011 asks for context poisoning defense. KRN already has several
partial protections: explicit task contracts, `requiredDoNotUsePaths`, ranked
context buckets, STOP on missing context, governed memory gates, verify command
policy, and local trace evidence.

Those protections were not yet a complete context-poisoning defense. The first
implementation slice made task-level `requiredDoNotUsePaths` and
protected-looking path policy available to graph-lite before content-reading
detectors walk files. This narrows the earlier gap where graph-lite could read
repository files before context selection applied task-level do-not-use
boundaries.

The second implementation slice adds deterministic Markdown classification for
instruction-like non-authority docs and downgrades those docs to
`context-poisoning-suspect` / `do-not-use` context evidence. This is still not a
full protected-data or prompt-injection barrier, and approved target runs still
require clean, non-protected, preflighted worktrees.

The relevant security model is that repository text and external files can
carry indirect prompt injection. OWASP classifies prompt injection as a top
GenAI risk and calls out external files as indirect inputs. The NCSC guidance
also warns that LLMs do not enforce a reliable instruction/data boundary inside
the prompt. KRN therefore must not rely on prompt wording or hook warnings as
the defense.

This ADR must not turn into hook trust work. Hooks remain guardrails and trace
points, not a sandbox, and real hook loading/trust remains unproven.

## Decision

Adopt a context-poisoning defense contract and implement it as deterministic
graph/context ingestion policy.

The implementation must defend before model-facing context is trusted. The first
implementation surface is graph/context ingestion policy, not a hook sanitizer:

- task-spec `requiredDoNotUsePaths` and forbidden/protected path policy must be
  available before any detector reads file contents;
- detector file walking must be able to exclude protected/do-not-use paths
  before reading them;
- suspicious instruction-like text found in non-authority Markdown content must
  be represented as local evidence, not followed as an instruction;
- downstream `AGENTS.md`, stale docs, generated artifacts, and target repo docs
  are context evidence unless explicitly promoted by repo/operator policy;
- root/user/system instructions and the active task contract outrank repository
  text selected by graph/context;
- `krn run` remains the primary workflow.

The accepted future evidence vocabulary is:

- `authority`: instructions that may shape KRN operation, such as current
  operator intent, repo-root KRN instructions, and accepted ADR/spec truth;
- `evidence`: repository or runtime material selected for the task;
- `untrusted-context`: selected material that may inform the task but must not
  override authority;
- `context-poisoning-suspect`: evidence containing instruction-like text from a
  non-authority source;
- `do-not-use`: protected, stale, forbidden, or poisoned material that must not
  become active edit context.

The implementation adds tests proving that a file marked by task-spec
do-not-use policy is excluded before content-reading detectors process it, that
protected-looking paths are excluded by default, and that instruction-like
non-authority docs are downgraded without downgrading root `AGENTS.md` or
accepted ADR/spec examples.

## Drivers

- Security: prompt injection cannot be solved by prompt text alone.
- Protected-data safety: preflight should remain mandatory, but KRN should not
  have a graph ingestion path that silently reads forbidden files.
- Scope control: implement deterministic path/content policy before any
  classifier, embeddings, or model-based sanitizer.
- Product honesty: context poisoning defense is local risk reduction, not
  production security proof.

## Consequences

TASK-011 now has source/test implementation for pre-read path exclusion and
poisoning-suspect downgrade.

`krn graph` and `krn context` load the current task contract and pass scan policy
into graph-lite. `krn run` already starts by writing that task contract, so
`krn run --task-spec ...` remains the primary proof workflow without adding a
new CLI surface.

Graph artifacts expose `context-poisoning-suspect` status counts and examples.
Context packages place matching suspects in `do-not-use` with an operator
message instead of `reference-only` or active context.

This remains local risk reduction only. Real target runs still require:

- clean isolated target worktree;
- preflight before `krn run`;
- no protected data;
- explicit task-spec forbidden/do-not-use paths;
- no target push;
- no production-proof or hook-trust claim.

## Non-Goals

- No hook sanitizer implementation.
- No hook trust claim.
- No MCP, vector DB, embeddings, dashboard, subagent framework, publishing, or
  protected-data workflow.
- No LLM classifier or model-based prompt-injection detector.
- No new top-level CLI command.
- No production security guarantee.

## Alternatives Considered

- Add a hook-level sanitizer first: rejected because hooks run too late for
  graph/context ingestion and hook trust is unproven.
- Rely on `AGENTS.md` warnings: rejected because prompt text is not a security
  boundary.
- Add embeddings or semantic detection: rejected as P0/P1 scope creep.
- Keep only operator preflight: rejected as insufficient long-term because
  `krn run` should carry deterministic local safety evidence.

## Evidence/Source References

- `docs/specs/context-poisoning-defense.md`
- `docs/security/context-poisoning.md`
- `docs/security/trust-boundaries.md`
- `packages/cli/src/commands/run.ts`
- `packages/cli/src/commands/graph.ts`
- `packages/graph/src/path-utils.ts`
- `packages/context/src/build-context-package.ts`
- OWASP LLM01 Prompt Injection: https://genai.owasp.org/llmrisk/llm01-prompt-injection/
- NCSC Prompt Injection Guidance: https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection

## Revisit When

Revisit before allowing protected-data workflows, before adding model-based
poisoning detection, before broadening authority-path exemptions, or before
making hooks part of an enforcement claim.
