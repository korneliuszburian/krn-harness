# Target Adoption Playbook

## When To Use KRN

Use KRN when a target repo can be validated locally with deterministic commands
and the operator needs durable `krn run` evidence: task contract, context,
verify result, handoff, review/summary/report, and run bundle.

Do not use KRN adoption proof for protected-data work, production deployment,
hook trust claims, or direct target-main changes.

## Safe Target Selection

- Prefer a user-owned, non-protected repo.
- Use an isolated clone or worktree.
- Reject active scope with secrets, private/client data, raw corpora, dumps,
  backups, credentials, invoices, contracts, or production-only dependencies.
- Do path-level safety classification before content reads.
- If a repo already tracks a product-owned `.krn/` directory, configure
  `runtime.dir` to a local ignored directory such as `.krn-harness`.

## Config-Only Adoption Flow

1. Confirm the target validation command.
2. Create a conservative `krn.config.json`.
3. Run `krn config doctor --json`.
4. Create a relative task spec under the chosen runtime dir, for example
   `.krn/local/` or `.krn-harness/local/`.
5. Run `krn run --task-spec <runtime-dir>/local/<task>.json --execute-verify --bundle`.
6. Review `<runtime-dir>/current/run-result.md` and
   `<runtime-dir>/current/run-bundle/manifest.json`.

Only open a target PR when the allowed diff is limited to `krn.config.json`,
`.gitignore` for `.krn/`, or a safe adoption note. Do not push target main and
do not merge the PR as part of adoption proof.

## Runtime Artifacts

KRN writes local runtime evidence under `.krn/` by default. If the target owns
`.krn/`, set `runtime.dir` to `.krn-harness` or another safe repo-relative
dot-directory. The chosen runtime directory should be ignored by the target and
must never be staged.

Generated target outputs such as `.local/`, `out/`, caches, and `__pycache__/`
remain local unless the target already treats them as tracked product artifacts.

## Task Spec Rules

- `--task-spec` must be repo-relative.
- Put the task prompt in the `prompt` field.
- Include expected local proof files.
- Put protected paths that must not be read in structured do-not-use fields when
  possible; they are safety boundaries, not active context.
- Do not put protected paths in expected touched files unless the task is
  intentionally blocked for safety review.
- Keep validation command, rollback, no-push, no-merge, target isolation,
  target approval, approval reference, protected-data exclusion,
  productionProof false, and hookTrust unproven boundaries explicit.
- Use `boundaries.targetValidation` when a target-owned verify command is part
  of the proof claim. This does not approve target mutation, shell execution,
  production proof, hook trust, push, merge, or rollback automation.
- A task spec with `boundaries.targetValidation` must also include
  `expectedTouchedFiles`, `forbiddenTouchedFiles`, `boundaries.rollback`,
  `boundaries.noPush`, `boundaries.noMerge`, and
  `boundaries.targetIsolation`, `boundaries.targetApproval` with an
  `approvalRef`, plus
  `boundaries.protectedData`; deterministic review fails missing target-run
  boundaries.

## Target Validation Contract v0

Stage 6 adds a task-spec carrier for this contract at
`boundaries.targetValidation`. This is still not a broader verify allowlist:
the declared command must be configured and executed by existing verify policy.
Until older adoption notes are migrated, handoffs may also repeat the same
authority, coverage, limitation, and unsafe-condition wording.

```text
boundaries:
  targetValidation:
    authority: target-owned
    command: <allowlisted command or wrapper>
    coverage: full-suite | fast-quality-gate | smoke | lint-only
    reason: <why this gate is authoritative for this task>
    limitations: [...]
    unsafeIf: [...]
  targetIsolation:
    isolated: true
    sourceCheckoutRejected: true
    isolatedPath: <isolated checkout/worktree path>
    baseCommit: <target base commit>
    reason: <why the source checkout is not the target>
  targetApproval:
    required: true
    approvalRef: <operator approval evidence>
  protectedData:
    allowed: false
    paths: [...]
    reason: <why protected data is outside this run>
```

Rules:

- `authority` must be `target-owned`: the target repo, target docs, or target
  operator must already treat the command as meaningful validation.
- `command` must still pass KRN verify policy. This contract does not approve
  shell mode, arbitrary `python3 -m pytest`, network commands, destructive
  commands, or broad package-script arguments.
- `coverage` names what the run proves. If only a fast gate ran, do not imply
  full-suite proof in `run-result`, review notes, handoff, or adoption docs.
- `reason` must connect the gate to the actual change. A README-only check, a
  config-only check, and a product-code check may have different authorities.
- `limitations` must say what was not proven, including skipped full suites,
  known target failures, local-only config, or wrapper indirection.
- `unsafeIf` must name conditions that invalidate the command for KRN adoption,
  such as protected data, network access, production services, destructive
  mutation, secret-dependent setup, or a target push/merge requirement.

When a full target suite fails but a target-owned fast quality gate passes,
record both facts. The KRN proof is `fast-quality-gate` only; it is not
full-suite proof, production proof, hook trust, or target-main approval.

## Stage 9/10 Pre-Run Approval Packet

Before any Stage 9 or Stage 10 target run, prepare a compact approval packet.
The packet is readiness evidence only. It is not approval by itself, does not
execute KRN, and does not authorize target mutation, push, merge, production
proof, hook trust, or protected-data access.

Required packet fields:

- target repo, isolated checkout/worktree path, and base commit;
- target safety classification with `protectedData.allowed: false`, protected
  exclusions, and why the source checkout is not being used as the target;
- task class, task prompt, and why it is a tiny product-code/test-code slice;
- `expectedTouchedFiles`, `forbiddenTouchedFiles`, rollback boundary,
  `noPush: true`, `noMerge: true`, and target-isolation boundary;
- target validation authority, command, coverage, reason, limitations, and
  unsafe conditions;
- runtime directory plan and artifact ignore/cleanup expectation;
- `targetApproval.required: true` and the exact operator `approvalRef` that
  permits this isolated target run;
- Stage 10 baseline plan when the run is part of delta measurement: baseline
  actor, same task class, same target validation authority, no KRN artifact
  pipeline, comparison packet path, and outcome dimensions to record.

If the packet lacks an approval reference, protected-data exclusion, target
validation authority, or isolation plan, treat the run as not approved for
Stage 9/10 proof. A prepared packet may be copied into task-spec metadata and
the final handoff, but Stage 9/10 evidence begins only after the approved run
records actual `krn run --task-spec ... --execute-verify --bundle` artifacts.

Packet template:

```text
stage: 9-or-10
target:
  repo: <target repo>
  isolatedPath: <isolated checkout/worktree path>
  baseCommit: <target base commit>
  sourceCheckoutRejected: true
safety:
  protectedData:
    allowed: false
    paths: [...]
    reason: <why protected data is outside this run>
task:
  class: product-code | test-code
  prompt: <tiny approved task>
  expectedTouchedFiles: [...]
  forbiddenTouchedFiles: [...]
boundaries:
  targetIsolation:
    isolated: true
    sourceCheckoutRejected: true
    isolatedPath: <isolated checkout/worktree path>
    baseCommit: <target base commit>
    reason: <why the source checkout is not the target>
  rollback: <manual rollback boundary>
  noPush: true
  noMerge: true
  targetValidation:
    authority: target-owned
    command: <allowlisted command or wrapper>
    coverage: full-suite | fast-quality-gate | smoke | lint-only
    reason: <why this validates the task>
    limitations: [...]
    unsafeIf: [...]
  targetApproval:
    required: true
    approvalRef: <literal operator approval reference>
runtime:
  dir: .krn | .krn-harness | <ignored runtime dir>
  artifactsIgnoredOrCleaned: true
stage10Baseline:
  required: true | false
  comparisonId: <stable local comparison id>
  actor: codex | claude | other
  sameTaskClass: true
  sameTargetValidationAuthority: true
  noKrnArtifactPipeline: true
  comparisonPacketPath: <handoff or evidence artifact path>
  outcomeDimensions:
    - success/failure
    - verify pass/fail
    - retry burden
    - operator interventions
    - missing-context incidents
    - scope violations
    - protected-path incidents
    - false-done or overclaim events
    - validation clarity
    - operator confidence
    - review time/usefulness
    - artifact auditability
    - memory reuse
    - repeated mistakes avoided or repeated
    - frontend defects found or missed when the task is UI-facing
    - time to auditable proof
```

## Baseline Comparison For Stage 10

Stage 10 comparison is a target-run handoff requirement, not a new KRN command,
schema, dashboard, or benchmark suite. Use it only after the operator approves
a non-protected isolated target run.

The simpler baseline must be comparable:

- same target repo and isolated checkout shape where feasible;
- same task class and similar change size;
- same target validation authority;
- Codex or Claude Code with minimal repo instructions;
- no KRN task-contract, context package, review/report, memory, or run-bundle
  pipeline.

The KRN comparison must use the normal primary workflow:

- `krn run --task-spec ... --execute-verify --bundle`;
- the same target validation authority as the baseline;
- structured expected touched files, forbidden paths, rollback, no-push,
  no-merge, and target-isolation boundaries, plus target approval reference
  and protected-data exclusion;
- `run-result` fixture/config/product-code proof-scope statuses;
- memory references only when they are operator-approved, scoped, and
  reference-only.

Record one comparison packet in the handoff or target evidence artifact. It
must include:

- `comparisonId`, target repo, base commit, task class, and target validation
  authority;
- baseline actor, prompt, isolated checkout/worktree path, validation command,
  validation result, retry count, operator intervention count, and changed
  files;
- KRN task spec path, run-result path, bundle manifest path, validation result,
  retry count, operator intervention count, changed files, review/handoff path,
  and memory references used;
- outcome dimensions: success/failure, verify pass/fail, operator
  interventions, scope violations, protected-path incidents, false-done or
  overclaim events, review time/usefulness, artifact auditability, memory reuse,
  repeated mistakes avoided or repeated, UI/frontend defects found or missed
  when applicable, and time to auditable proof;
- decision: `meaningfulDelta: true | false | unclear`, exact dimensions that
  changed, and `narrowScopeIfNoDelta` when the comparison does not justify a
  broader KRN surface.

Stage 10 evidence begins only after both sides of the approved target comparison
exist. A prepared packet, fixture benchmark, or source-side guideline is not
Stage 10 evidence by itself. If the KRN run shows no meaningful delta over the
simpler baseline, narrow KRN product scope instead of adding surfaces.

Do not use fixture-only benchmarks, marketing claims, dashboards, CI-only
signals, target-main approval, production proof, or hook trust as Stage 10
evidence.

## Verify Command Selection

Use the target's own deterministic local validation. Prefer existing quality
gates over inventing broad checks.

KRN v0.1 verify policy is intentionally narrow. For Python targets, a local
`python3 tools/*.py` checker may be needed to call the target-owned quality
gate. Do not broaden KRN source policy during adoption proof.

Python checker wrappers are accepted only as a temporary adapter when all of the
following are true:

- the wrapper lives under `tools/*.py` and is reviewed as target-owned local
  code;
- the wrapper calls or mirrors an existing target quality gate instead of
  inventing a new proof standard;
- the wrapper avoids shell chaining, network access, destructive mutation,
  secret reads, and production services;
- the handoff records the wrapper's authority, coverage, limitations, and
  unsafe conditions through `targetValidation`.

Deterministic review fails `python3 tools/*.py` wrapper proof when
`targetValidation.limitations` or `targetValidation.unsafeIf` is missing. This
keeps wrappers as explicit adoption adapters instead of hidden proof theater.

A wrapper is an evidence smell when it hides a failing full suite, broadens the
validated surface beyond the task, requires protected data, or becomes the only
reason the target appears compatible with KRN.

## UI / Frontend Visual Proof Metadata

For UI-facing target tasks, task specs may include `visualProof` metadata from
`docs/specs/task-contract.schema.md`. Use it to declare the route/component,
viewports, design constraints, a11y expectations, copy status, manual visual
artifact reference, and any target-owned visual command that already exists.

This metadata is an acceptance/proof contract, not a KRN visual engine. It must
not require browser automation, Playwright, Figma/MCP access, generated
screenshots, appshots, Codex-managed worktree snapshots, or external visual
services for Stage 9/10 readiness. A target-owned visual command can support a
UI task only when its authority, reason, limitations, and unsafe conditions are
recorded; it does not replace `boundaries.targetValidation`, run-result, review,
or bundle evidence.

Frontend visual defects may be recorded as Stage 10 comparison dimensions when a
target run is UI-facing, but visual metadata alone is readiness evidence. It is
not Stage 9 or Stage 10 target evidence until an approved isolated target run
records the actual task result and residual risk.

## Final Handoff Checklist

- Target repo, base commit, and isolated path.
- Safety classification and protected exclusions.
- Target validation authority, command, coverage, reason, limitations, and
  unsafe conditions.
- UI task visual proof metadata when applicable: route/component, viewports,
  design constraints, a11y expectations, copy status, manual visual artifact, and
  target-owned visual command boundaries.
- `krn config doctor --json` result.
- `krn run --task-spec ... --execute-verify --bundle` result.
- `run-result` fixture/config/product-code proof-scope statuses.
- Stage 10 baseline comparison fields when the task is part of delta
  measurement.
- Verify command and executed command count.
- Bundle manifest path.
- Changed/untracked target files.
- Target PR URL if opened.
- No target main push.
- No target PR merge.
- No `.krn` artifacts committed.
- `productionProof: false`.
- Hook trust unproven.
- Known blockers and adoption frictions.
