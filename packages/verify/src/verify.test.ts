import { describe, expect, it } from "vitest";
import type { ContextPackage } from "../../context/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { buildVerifyResult, renderVerifyResultMarkdown } from "./verify.js";

describe("verify result", () => {
  it("records not-runnable when no commands are configured", () => {
    const result = buildVerifyResult({
      taskContract: buildTaskContract("goal 3 smoke task"),
      configuredCommands: [],
    });

    expect(result).toMatchObject({
      status: "not-runnable",
      taskId: "task-d62ea4fbc009",
      contextStop: false,
      configuredCommands: [],
      executedCommands: [],
      notRunnableReason: "No verify commands are configured",
    });
    expect(renderVerifyResultMarkdown(result)).toContain("Status: not-runnable");
  });

  it("records blocked when context STOP is active", () => {
    const contextPackage = {
      taskId: "task-stop",
      stop: true,
      stopReason: "Required context is missing: docs/required.md",
    } as ContextPackage;

    const result = buildVerifyResult({
      contextPackage,
      configuredCommands: ["pnpm test"],
    });

    expect(result).toMatchObject({
      status: "blocked",
      taskId: "task-stop",
      contextStop: true,
      configuredCommands: ["pnpm test"],
      executedCommands: [],
      notRunnableReason: "Required context is missing: docs/required.md",
    });
  });

  it("records configured commands without executing them in P0", () => {
    const result = buildVerifyResult({
      taskContract: buildTaskContract("Update docs"),
      configuredCommands: ["pnpm lint", "pnpm test"],
    });

    expect(result.status).toBe("ready");
    expect(result.configuredCommands).toEqual(["pnpm lint", "pnpm test"]);
    expect(result.executedCommands).toEqual([]);
    expect(result.checks).toEqual([
      {
        name: "configured-commands",
        status: "pass",
        detail: "2 command(s) configured; P0 records them but does not execute them",
      },
    ]);
  });
});
