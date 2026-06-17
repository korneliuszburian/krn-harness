# KRN Mental Model

KRN is a Codex-first local engineering harness: it turns operator intent into a typed task contract, selects bounded context, records graph-lite evidence, runs local verification, writes traceable artifacts, and leaves the next session with reviewable handoff state. It is not a Codex runner; Codex Desktop or CLI remains the actor that reads, edits, reasons, and invokes tools, while KRN provides the environment, contracts, evidence, and guardrails around that work.

## Flow

`Operator -> Codex Desktop/CLI -> KRN environment -> artifacts`

The operator sets the goal and approval boundaries. Codex Desktop/CLI performs the implementation work. The KRN environment supplies repo-local commands, config, context packages, verify policy, hooks, trace files, and review outputs. Artifacts are the durable local evidence that later sessions and reviewers inspect instead of trusting chat memory.

## Artifact Chain

The P0 work loop is:

`task-spec -> run -> verify -> review -> handoff -> next session`

`task-spec` records intent and acceptance hints. `run` coordinates the local task loop and writes current evidence. `verify` records allowed command results and whether execution actually happened. `review` checks task alignment, scope, proof claims, protected paths, and runtime artifact hygiene. `handoff` turns the current state into concise continuation evidence for the next session.

## Hook Lifecycle

Hooks are diagnostic guardrails and trace entrypoints. They can emit allow, warn, or block decisions into local artifacts, but hook loading and trust are diagnostic/unproven until a separate non-bypass hookTrust proof exists. Do not treat hook output as production proof, a sandbox, or guaranteed Codex enforcement.

## Skill Boundary

Skills are procedural guidance, not trusted enforcement. A malicious, stale, or ambiguous skill can mislead the agent. KRN enforcement lives in verify/review/artifacts/CI/human acceptance. Skill scripts are helpers unless invoked by KRN/CI. Do not store secrets in skills/references/assets. Do not let Codex rewrite skills during normal implementation unless the goal is explicitly a skill-editing goal.
