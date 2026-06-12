import { describe, expect, it } from "vitest";
import { generateAgentsAdapter } from "./generate-agents.js";
import { generateHooksTemplate } from "./generate-hooks.js";
import { generateRuntimeSkillTemplate } from "./generate-runtime-skill.js";

const expectedHookEvents = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PreCompact",
  "PostCompact",
  "Stop",
];

function expectKRNCommandFlow(output: string): void {
  for (const phrase of [
    "KRN Harness",
    "krn status",
    'krn start "<task>"',
    "krn context",
    "STOP",
    "krn verify",
    "krn verify --execute",
    "krn handoff",
  ]) {
    expect(output).toContain(phrase);
  }
}

describe("Codex adapter generation", () => {
  it("generates a downstream AGENTS adapter with stable user-facing workflow", () => {
    const output = generateAgentsAdapter();

    expect(output.trim().length).toBeGreaterThan(0);
    expectKRNCommandFlow(output);
    expect(output).toContain(".krn/current/task-contract.md");
    expect(output).toContain(".krn/current/context-package.md");
    expect(output).toContain("320-480px");
    expect(output).toContain("1280-1440px");
    expect(output.length).toBeLessThan(2200);
    expect(output).not.toContain("dashboard");
    expect(output).not.toContain("MCP server");
    expect(output).not.toContain("policy engine");
  });

  it("generates a hooks template with all expected lifecycle events", () => {
    const output = generateHooksTemplate();
    const parsed = JSON.parse(output) as {
      hooks: Record<string, Array<{ hooks: Array<{ command: string; type: string }> }>>;
    };

    expect(Object.keys(parsed.hooks)).toEqual(expectedHookEvents);

    for (const event of expectedHookEvents) {
      const handlers = parsed.hooks[event] ?? [];
      expect(handlers.length).toBeGreaterThan(0);
      expect(handlers[0]?.hooks[0]).toMatchObject({
        type: "command",
        command: `krn hook codex ${event}`,
      });
    }
    expect(output).toContain("KRN pre-tool guardrail");
    expect(output).toContain("KRN final guardrail");
  });

  it("generates a short runtime skill that routes through the KRN CLI", () => {
    const output = generateRuntimeSkillTemplate();
    const nonBlankLines = output.split("\n").filter((line) => line.trim().length > 0);

    expect(nonBlankLines.length).toBeLessThanOrEqual(26);
    expectKRNCommandFlow(output);
    expect(output).toContain("name: krn-harness");
    expect(output).toContain(".krn/current/task-contract.md");
    expect(output).toContain(".krn/current/context-package.md");
    expect(output).toContain("320-480px");
    expect(output).not.toContain("dashboard");
    expect(output).not.toContain("MCP server");
  });
});
