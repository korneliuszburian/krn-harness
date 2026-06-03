export const downstreamHooksTemplatePath = "packages/codex-adapter/src/templates/hooks.json.tmpl";

export function generateHooksTemplate(): string {
  return JSON.stringify(
    {
      hooks: {
        SessionStart: [{ hooks: [{ type: "command", command: "krn hook codex SessionStart" }] }],
        UserPromptSubmit: [
          { hooks: [{ type: "command", command: "krn hook codex UserPromptSubmit" }] },
        ],
        PreToolUse: [
          { matcher: "*", hooks: [{ type: "command", command: "krn hook codex PreToolUse" }] },
        ],
        PostToolUse: [
          { matcher: "*", hooks: [{ type: "command", command: "krn hook codex PostToolUse" }] },
        ],
        PreCompact: [
          { matcher: "*", hooks: [{ type: "command", command: "krn hook codex PreCompact" }] },
        ],
        PostCompact: [
          { matcher: "*", hooks: [{ type: "command", command: "krn hook codex PostCompact" }] },
        ],
        Stop: [{ hooks: [{ type: "command", command: "krn hook codex Stop" }] }],
      },
    },
    null,
    2,
  );
}
