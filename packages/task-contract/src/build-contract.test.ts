import { describe, expect, it } from "vitest";
import { buildTaskContract } from "./build-contract.js";
import { classifyTask, isNonTrivialTask, modeForClassification } from "./classify-task.js";
import { parseTaskSpecInput, TaskContractSchema } from "./schema.js";
import { validateContract } from "./validate-contract.js";

describe("task contract", () => {
  it("builds a deterministic editable task contract", () => {
    const contract = buildTaskContract("goal 2 smoke task");

    expect(contract).toEqual({
      id: "task-1354ea37dd50",
      rawUserIntent: "goal 2 smoke task",
      task: "goal 2 smoke task",
      intentQuality: "medium",
      intentWarnings: ["Task intent is very short."],
      interpretation: "Treat this as implementation work and gather context before edits.",
      classification: "implementation",
      mode: "edit",
      nonTrivial: true,
      acceptance: [
        "Scope is explicit",
        "Relevant context is gathered",
        "Validation evidence is recorded",
      ],
      proof: ["krn verify", "krn handoff"],
      evidenceRequirements: [
        "current task contract",
        "current context package",
        "trace event for task start",
        "validation command output or explicit reason it could not run",
      ],
      stopConditions: [
        {
          code: "task.empty",
          reason: "Task text is empty",
          active: false,
        },
      ],
      stop: false,
    });
    expect(validateContract(contract)).toEqual([]);
  });

  it("classifies basic task types and modes", () => {
    expect(classifyTask("review this diff")).toBe("review");
    expect(classifyTask("update ADR docs")).toBe("docs");
    expect(classifyTask("fix src/regional-tax.ts using docs/current-tax.md")).toBe(
      "implementation",
    );
    expect(classifyTask("research official source")).toBe("research");
    expect(modeForClassification("review")).toBe("review");
    expect(modeForClassification("research")).toBe("read-only");
    expect(modeForClassification("implementation")).toBe("edit");
  });

  it("detects basic non-trivial tasks", () => {
    expect(isNonTrivialTask("fix")).toBe(false);
    expect(isNonTrivialTask("goal 2 smoke task")).toBe(true);
  });

  it("builds a STOP contract for empty intent", () => {
    const contract = buildTaskContract("  ");

    expect(contract.stop).toBe(true);
    expect(contract.stopReason).toBe("Task text is empty");
    expect(contract.stopConditions).toEqual([
      {
        code: "task.empty",
        reason: "Task text is empty",
        active: true,
      },
    ]);
  });

  it("warns when task intent looks like a slug-only dogfood id", () => {
    const contract = buildTaskContract("wp-acf-field-mapping");

    expect(contract.intentQuality).toBe("low");
    expect(contract.intentWarnings).toEqual(
      expect.arrayContaining([
        "Task intent looks like a slug or task id; pass the full user intent to krn start.",
        "Dogfood-shaped task id lacks prompt, constraints, and proof requirements.",
      ]),
    );
  });

  it("keeps full task intent above the low quality warning path", () => {
    const contract = buildTaskContract(
      "Update ACF hero field mapping: edit src/theme/acf-fields.php and tests/theme.test.js, avoid docs/stale-acf-notes.md and acf/legacy_group.json, verify with configured profile.",
    );

    expect(contract.intentQuality).toBe("high");
    expect(contract.intentWarnings).toEqual([]);
  });

  it("reports validation gaps for malformed contracts", () => {
    const contract = buildTaskContract("goal 2 smoke task");

    expect(
      validateContract({
        ...contract,
        interpretation: "",
        evidenceRequirements: [],
      }),
    ).toEqual([
      "contract.interpretation is required",
      "contract.evidenceRequirements must not be empty",
    ]);
  });

  it("validates task contracts through the runtime schema", () => {
    const contract = buildTaskContract("goal 2 smoke task");

    expect(TaskContractSchema.safeParse(contract).success).toBe(true);
  });

  it("parses task-spec input with deterministic path errors", () => {
    expect(
      parseTaskSpecInput({
        prompt: "Task spec smoke",
        expectedTouchedFiles: ["src/index.ts"],
        boundaries: {
          targetValidation: {
            authority: "target-owned",
            command: "node target.test.js",
            coverage: "fast-quality-gate",
            reason: "Target repository owns this validation command.",
            limitations: ["Fast gate, not full release validation."],
            unsafeIf: ["Dependencies are not installed."],
          },
          rollback: {
            boundary: "No automatic rollback; operator owns any revert.",
          },
          noPush: true,
          noMerge: true,
          targetIsolation: {
            isolated: true,
            sourceCheckoutRejected: true,
            isolatedPath: "/tmp/target-worktree",
            baseCommit: "abc1234",
            reason: "Target proof runs outside the source checkout.",
          },
          targetApproval: {
            required: true,
            approvalRef: "operator-approved-local-run",
          },
          protectedData: {
            allowed: false,
            paths: [".env", "private/"],
            reason: "Protected data is outside task scope.",
          },
        },
      }),
    ).toEqual({
      prompt: "Task spec smoke",
      expectedTouchedFiles: ["src/index.ts"],
      boundaries: {
        targetValidation: {
          authority: "target-owned",
          command: "node target.test.js",
          coverage: "fast-quality-gate",
          reason: "Target repository owns this validation command.",
          limitations: ["Fast gate, not full release validation."],
          unsafeIf: ["Dependencies are not installed."],
        },
        rollback: {
          boundary: "No automatic rollback; operator owns any revert.",
        },
        noPush: true,
        noMerge: true,
        targetIsolation: {
          isolated: true,
          sourceCheckoutRejected: true,
          isolatedPath: "/tmp/target-worktree",
          baseCommit: "abc1234",
          reason: "Target proof runs outside the source checkout.",
        },
        targetApproval: {
          required: true,
          approvalRef: "operator-approved-local-run",
        },
        protectedData: {
          allowed: false,
          paths: [".env", "private/"],
          reason: "Protected data is outside task scope.",
        },
      },
    });

    expect(() =>
      parseTaskSpecInput({
        prompt: "",
        expectedTouchedFiles: [""],
      }),
    ).toThrow("must include a prompt; expectedTouchedFiles must be an array of non-empty strings");

    expect(() =>
      parseTaskSpecInput({
        prompt: "Task spec smoke",
        boundaries: {
          noMerge: false,
          targetIsolation: {
            isolated: false,
            sourceCheckoutRejected: false,
          },
        },
      }),
    ).toThrow(
      "boundaries.targetIsolation.isolated must be true; boundaries.targetIsolation.sourceCheckoutRejected must be true; boundaries.noMerge must be true",
    );

    expect(() =>
      parseTaskSpecInput({
        prompt: "Task spec smoke",
        boundaries: {
          targetValidation: {
            authority: "codex-owned",
            command: "",
            coverage: "full",
            reason: "",
            limitations: [""],
          },
        },
      }),
    ).toThrow(
      "boundaries.targetValidation.authority must be target-owned; boundaries.targetValidation.command must be a non-empty string; boundaries.targetValidation.coverage must be full-suite, fast-quality-gate, smoke, or lint-only; boundaries.targetValidation.reason must be a non-empty string; boundaries.targetValidation.limitations must be an array of non-empty strings",
    );
  });

  it("parses frontend visual proof task-spec metadata", () => {
    expect(
      parseTaskSpecInput({
        prompt: "Update the responsive hero component.",
        visualProof: {
          route: "/landing",
          component: "HeroSection",
          viewports: ["mobile 390x844", "desktop 1440x900"],
          designConstraints: ["Match existing spacing scale."],
          a11yExpectations: ["CTA contrast remains AA."],
          copyStatus: "approved",
          manualVisualArtifact: "operator review note or target-owned visual artifact path",
          targetOwnedVisualCommand: {
            authority: "target-owned",
            command: "pnpm preview:hero",
            reason: "Target repository owns this visual preview command.",
            limitations: ["Manual visual inspection only; no generated snapshot proof."],
            unsafeIf: ["Preview command needs protected environment variables."],
          },
        },
      }),
    ).toEqual({
      prompt: "Update the responsive hero component.",
      visualProof: {
        route: "/landing",
        component: "HeroSection",
        viewports: ["mobile 390x844", "desktop 1440x900"],
        designConstraints: ["Match existing spacing scale."],
        a11yExpectations: ["CTA contrast remains AA."],
        copyStatus: "approved",
        manualVisualArtifact: "operator review note or target-owned visual artifact path",
        targetOwnedVisualCommand: {
          authority: "target-owned",
          command: "pnpm preview:hero",
          reason: "Target repository owns this visual preview command.",
          limitations: ["Manual visual inspection only; no generated snapshot proof."],
          unsafeIf: ["Preview command needs protected environment variables."],
        },
      },
    });

    expect(() =>
      parseTaskSpecInput({
        prompt: "Update the responsive hero component.",
        visualProof: {},
      }),
    ).toThrow("visualProof must declare at least one visual proof field");

    expect(() =>
      parseTaskSpecInput({
        prompt: "Update the responsive hero component.",
        visualProof: {
          viewports: [""],
          copyStatus: "final",
          targetOwnedVisualCommand: {
            authority: "codex-owned",
            command: "",
            reason: "",
          },
        },
      }),
    ).toThrow(
      "visualProof.viewports must be an array of non-empty strings; visualProof.copyStatus must be draft, approved, or unknown; visualProof.targetOwnedVisualCommand.authority must be target-owned; visualProof.targetOwnedVisualCommand.command must be a non-empty string; visualProof.targetOwnedVisualCommand.reason must be a non-empty string",
    );
  });
});
