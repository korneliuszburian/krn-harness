import { describe, expect, it } from "vitest";
import { runInTemp } from "./cli-test-utils.js";
import { parseGitStatusPath } from "./commands/handoff.js";

describe("krn CLI core", () => {
  it("parses git status paths for handoff changed files", () => {
    expect(parseGitStatusPath(" M packages/cli/src/commands/handoff.ts")).toBe(
      "packages/cli/src/commands/handoff.ts",
    );
    expect(parseGitStatusPath("?? docs/specs/handoff.md")).toBe("docs/specs/handoff.md");
    expect(parseGitStatusPath("R  old/path.ts -> new/path.ts")).toBe("new/path.ts");
  }, 15_000);

  it("prints help", async () => {
    const result = await runInTemp(["--help"]);

    expect(result.code).toBe(0);
    for (const command of [
      'krn run --task "<task>" [--dry-run] [--json] [--execute-verify] [--bundle]',
      "krn run --task-spec <json> [--execute-verify] [--bundle]",
      "Advanced plumbing / troubleshooting:",
      "krn status",
      'krn start "<task>"',
      "krn graph",
      "krn context",
      "krn verify [--profile <name>] [--execute]",
      "krn handoff",
      "krn doctor",
      "krn doctor cli",
      "krn eval",
      "krn install",
      "krn install --dry-run",
      "krn uninstall --dry-run",
      "krn config <command>",
      "krn summary",
      "krn review",
      "krn report",
      "krn release-check",
      "krn artifacts <command>",
      "krn memory <command>",
      "krn hook codex <event>",
    ]) {
      expect(result.stdout).toContain(command);
    }
    expect(result.stdout).not.toContain("release-check --bundle");
  }, 15_000);
});
