# Task Contract Schema

## Purpose

The task contract turns user intent into a typed artifact before edits.

Runtime validation lives in `packages/task-contract/src/schema.ts`.

## Fields

- `id`: deterministic task identifier.
- `rawUserIntent`: exact user task text before trimming.
- `task`: task text.
- `intentQuality`: deterministic `low`, `medium`, or `high` signal for whether the task text is rich enough to build useful context.
- `intentWarnings`: non-blocking warnings such as slug-only or very short task starts.
- `metadata`: optional local task-spec metadata such as expected touched
  files, forbidden touched files, required do-not-use paths, and declared
  task boundaries. UI-facing task specs may also declare `visualProof` metadata.
  `expectedTouchedFiles` are active work hints. `requiredDoNotUsePaths` are
  exclusion boundaries and must not be read as active context. If the same
  protected-looking path appears as both expected-touched and do-not-use,
  active use wins and deterministic review must still block.
  `boundaries.targetValidation` may declare a target-owned validation command,
  coverage level, reason, limitations, and unsafe conditions. Deterministic
  review checks that the declared command is configured and executed in verify
  evidence, fails when target-run boundaries are incomplete, fails Python
  `tools/*.py` wrappers that omit limitations or unsafe conditions, and warns
  when coverage is narrower than `full-suite`. Target-run proof must also carry
  `boundaries.targetApproval.required: true`, an `approvalRef`, and
  `boundaries.targetIsolation.isolated: true`,
  `boundaries.targetIsolation.sourceCheckoutRejected: true`, and
  `boundaries.protectedData.allowed: false`; this is declarative approval,
  isolation, and safety evidence, not approval automation, target execution, or
  a protected-data workflow.
  `visualProof` may declare route/component scope, viewports, design constraints,
  a11y expectations, copy status, a manual visual artifact reference, and a
  target-owned visual command. It is declarative task evidence metadata, not
  browser automation, screenshot generation, Figma/MCP access, external visual
  review, or visual correctness proof from build output.
- `interpretation`: concise KRN interpretation of the task.
- `classification`: `implementation`, `docs`, `research`, `review`, or `unknown`.
- `mode`: `edit`, `read-only`, `review`, or `unknown`.
- `nonTrivial`: basic flag for whether the task is more than a trivial one-word request.
- `acceptance`: acceptance hints.
- `proof`: proof hints.
- `evidenceRequirements`: evidence expected before completion.
- `stopConditions`: typed STOP conditions with `code`, `reason`, and `active`.
- `stop`: whether edits should stop.
- `stopReason`: optional reason when STOP is true.

## Normalized Helper Views

P0 keeps `acceptance` and `proof` as existing string arrays for artifact compatibility. Callers that need structure can use `normalizeAcceptanceCriteria(contract)` and `normalizeProofRequirements(contract)` to derive typed records with stable ids, text, kind, and `required: true`.

## Task Spec Boundary Metadata

Required now:

- `boundaries.targetValidation.authority`: must be `target-owned`.
- `boundaries.targetValidation.command`: non-empty verify command text.
- `boundaries.targetValidation.coverage`: `full-suite`, `fast-quality-gate`,
  `smoke`, or `lint-only`.
- `boundaries.targetValidation.reason`: non-empty explanation of why the target
  command is meaningful for this task.
- `boundaries.targetValidation.limitations`: optional non-empty string array;
  deterministic review requires it for wrapper commands such as
  `python3 tools/*.py`.
- `boundaries.targetValidation.unsafeIf`: optional non-empty string array;
  deterministic review requires it for wrapper commands such as
  `python3 tools/*.py`.
- `boundaries.rollback.boundary`: optional non-empty rollback boundary text.
- `boundaries.noPush`: optional literal `true`; false is invalid.
- `boundaries.noMerge`: optional literal `true`; false is invalid.
- `boundaries.targetIsolation.isolated`: optional literal `true`; false is
  invalid.
- `boundaries.targetIsolation.sourceCheckoutRejected`: optional literal `true`;
  false is invalid.
- `boundaries.targetIsolation.isolatedPath`: optional non-empty string.
- `boundaries.targetIsolation.baseCommit`: optional non-empty string.
- `boundaries.targetIsolation.reason`: optional non-empty string.
- `boundaries.targetApproval.required`: optional literal `true`; false is
  invalid. `approvalRef` is schema-optional, but deterministic review requires
  it when `boundaries.targetValidation` is present for target-run proof.
- `boundaries.protectedData.allowed`: optional literal `false`; true is
  invalid. `paths` and `reason` may explain protected data exclusions.

## Frontend Visual Proof Metadata

Required only when a UI-facing task needs visual acceptance metadata:

- `visualProof.route`: optional non-empty route or URL path under review.
- `visualProof.component`: optional non-empty component, section, or UI surface
  name.
- `visualProof.viewports`: optional non-empty string array such as `mobile
  390x844` or `desktop 1440x900`.
- `visualProof.designConstraints`: optional non-empty string array for existing
  design-system, layout, spacing, responsive, or brand constraints.
- `visualProof.a11yExpectations`: optional non-empty string array for keyboard,
  contrast, focus, landmark, reduced-motion, or screen-reader expectations.
- `visualProof.copyStatus`: optional `draft`, `approved`, or `unknown`.
- `visualProof.manualVisualArtifact`: optional non-empty reference supplied by
  the operator or target workflow, such as a review note, target-owned artifact
  path, design URL, or comparison note. KRN must not generate snapshots for this
  field in the audit-consolidation goal.
- `visualProof.targetOwnedVisualCommand.authority`: optional visual command
  authority, always `target-owned`.
- `visualProof.targetOwnedVisualCommand.command`: non-empty target-owned command
  text when the target already has a visual preview/check command.
- `visualProof.targetOwnedVisualCommand.reason`: non-empty explanation of why
  that command is meaningful for the UI task.
- `visualProof.targetOwnedVisualCommand.limitations`: optional non-empty string
  array.
- `visualProof.targetOwnedVisualCommand.unsafeIf`: optional non-empty string
  array.

`visualProof` must contain at least one field when present. It does not replace
`boundaries.targetValidation`, `krn run`, `verify`, review, handoff, or target
approval evidence. Manual visual notes are weaker than rendered proof and should
be treated as task evidence only after code/test/lint and target-owned gates are
stable.

Future schema candidates, not implemented now:

- automatic rollback behavior;
- GitHub push or merge automation;
- target mutation approval workflows beyond declarative task metadata;
- target-isolation automation or target worktree creation;
- protected-data access approvals;
- KRN-owned browser automation, Playwright, screenshot/appshot generation, Figma
  capture, or external visual-review service;
- broader verify allowlists or shell execution modes.

When `boundaries.targetValidation` is present for target-run proof, deterministic
review expects these additional task-spec boundaries to be present:

- `expectedTouchedFiles`;
- `forbiddenTouchedFiles`;
- `boundaries.rollback`;
- `boundaries.noPush`;
- `boundaries.noMerge`;
- `boundaries.targetApproval`;
- `boundaries.targetApproval.approvalRef`.
- `boundaries.targetIsolation`;
- `boundaries.protectedData`.

Missing target-run boundaries fail review because the task spec is not complete
enough to support isolated target proof.
