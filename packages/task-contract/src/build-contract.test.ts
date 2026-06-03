import { describe, expect, it } from "vitest";
import { buildTaskContract } from "./build-contract.js";
import { classifyTask, isNonTrivialTask, modeForClassification } from "./classify-task.js";
import { validateContract } from "./validate-contract.js";

describe("task contract", () => {
  it("builds a deterministic editable task contract", () => {
    const contract = buildTaskContract("goal 2 smoke task");

    expect(contract).toEqual({
      id: "task-1354ea37dd50",
      rawUserIntent: "goal 2 smoke task",
      task: "goal 2 smoke task",
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
});
