import { describe, expect, it } from "vitest";
import { formatAgentsQualityError, validateAgentsAdapter } from "./agents-quality.js";
import { generateAgentsAdapter } from "./generate-agents.js";
import { generateHooksTemplate } from "./generate-hooks.js";
import {
  generateRuntimeSkillTemplate,
  generateRuntimeSkillTemplateFiles,
} from "./generate-runtime-skill.js";

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
    "krn start",
    "krn graph",
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
    expect(validateAgentsAdapter(output)).toEqual({
      status: "pass",
      missing: [],
    });
    expect(output).toContain("## Roles");
    expect(output).toContain("## Non-negotiables");
    expect(output).toContain(".krn/current/task-contract.md");
    expect(output).toContain(".krn/current/context-package.md");
    expect(output).toContain(".agents/skills/krn-harness/SKILL.md");
    expect(output).toContain('krn start "<full user intent>"');
    expect(output).toContain("pinned KRN command path");
    expect(output).toContain("do not substitute global `krn`");
    expect(output).toContain("run `krn graph` before `krn context`");
    expect(output).toContain("real non-bypass Codex run emits `hook.received`");
    expect(output).toContain("Do not pass only a task id, slug, or title");
    expect(output).toContain("320-480px");
    expect(output).toContain("1280-1440px");
    expect(output.length).toBeLessThan(2200);
    expect(output).not.toContain("dashboard");
    expect(output).not.toContain("MCP server");
    expect(output).not.toContain("policy engine");
  });

  it("fails downstream AGENTS quality when required onboarding sections are absent", () => {
    const result = validateAgentsAdapter("# AGENTS.md\n\nUse krn start.\n");

    expect(result.status).toBe("fail");
    expect(result.missing).toEqual(
      expect.arrayContaining(["## Roles", "## Non-negotiables", "runtime skill reference"]),
    );
    expect(formatAgentsQualityError(result)).toContain("generated AGENTS.md failed quality gate");
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
        command: `./.krn/bin/krn hook codex ${event}`,
      });
    }
    expect(output).toContain("KRN pre-tool guardrail");
    expect(output).toContain("KRN final guardrail");
  });

  it("generates a short runtime skill that routes through the KRN CLI", () => {
    const output = generateRuntimeSkillTemplate();
    const nonBlankLines = output.split("\n").filter((line) => line.trim().length > 0);

    expect(nonBlankLines.length).toBeLessThanOrEqual(30);
    expectKRNCommandFlow(output);
    expect(output).toContain("name: krn-harness");
    expect(output).toContain(".krn/current/task-contract.md");
    expect(output).toContain(".krn/current/context-package.md");
    expect(output).toContain('krn start "<full user intent>"');
    expect(output).toContain("Use a provided pinned KRN command path");
    expect(output).toContain("references/workflow.md");
    expect(output).toContain("Run `krn graph`, then `krn context`");
    expect(output).toContain("Hooks remain unproven");
    expect(output).toContain('Bad: `krn start "wp-acf-field-mapping"`');
    expect(output).toContain("320-480px");
    expect(output).not.toContain("dashboard");
    expect(output).not.toContain("MCP server");
  });

  it("generates runtime skill support files for downstream install", () => {
    const files = generateRuntimeSkillTemplateFiles();

    expect(files.map((file) => file.path)).toEqual([
      ".agents/skills/krn-harness/SKILL.md",
      ".agents/skills/krn-harness/agents/openai.yaml",
      ".agents/skills/krn-harness/references/workflow.md",
    ]);
    expect(files.find((file) => file.path.endsWith("openai.yaml"))?.content).toContain(
      "default_prompt",
    );
    expect(files.find((file) => file.path.endsWith("workflow.md"))?.content).toContain(
      "Decision Tree",
    );
    expect(files.find((file) => file.path.endsWith("workflow.md"))?.content).toContain(
      "Output Contract",
    );
  });
});
