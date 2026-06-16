import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathExists } from "../../core/src/index.js";
import { supportedCodexHookEvents } from "../../hooks/src/index.js";
import { isRecord, parseJsonFile, readJson } from "./doctor-json.js";
import type { DoctorCheck } from "./doctor-types.js";

export async function isHarnessSource(cwd: string): Promise<boolean> {
  const packageJson = await readJson<{ name?: string }>(path.join(cwd, "package.json"));
  return packageJson?.name === "krn-harness";
}

export function artifactCheck(name: string, present: boolean, relativePath: string): DoctorCheck {
  return {
    name,
    status: present ? "pass" : "warn",
    detail: present ? `${relativePath} is present` : `${relativePath} is missing`,
  };
}

export async function downstreamAgentsCheck(cwd: string, source: boolean): Promise<DoctorCheck> {
  const relativePath = "AGENTS.md";
  const filePath = path.join(cwd, relativePath);
  const present = await pathExists(filePath);

  if (!present) {
    return {
      name: "downstream-agents",
      status: "warn",
      detail: source
        ? "AGENTS.md is missing in source checkout; source guidance unavailable"
        : "AGENTS.md is missing; run `krn install` in the downstream repo",
    };
  }

  if (!source) {
    const content = await readFile(filePath, "utf8");
    if (
      !content.includes("KRN Harness") ||
      !content.includes("krn start") ||
      !content.includes("krn context")
    ) {
      return {
        name: "downstream-agents",
        status: "warn",
        detail:
          "AGENTS.md is present but does not mention the KRN workflow; review project guidance or run `krn install` if KRN should manage onboarding",
      };
    }
  }

  return {
    name: "downstream-agents",
    status: "pass",
    detail: source
      ? "AGENTS.md is present for source checkout guidance"
      : "AGENTS.md is present; downstream guidance may be project-owned",
  };
}

export async function downstreamRuntimeSkillCheck(
  cwd: string,
  source: boolean,
): Promise<DoctorCheck> {
  const relativePath = ".agents/skills/krn-harness/SKILL.md";
  const absolutePath = path.join(cwd, relativePath);

  if (!(await pathExists(absolutePath))) {
    return {
      name: "downstream-runtime-skill",
      status: "warn",
      detail: source
        ? `${relativePath} is not installed in the source checkout; adapter template is checked separately`
        : `${relativePath} is missing; run \`krn install\` in the downstream repo`,
    };
  }

  const content = await readFile(absolutePath, "utf8");
  const missingCommands = [
    "krn status",
    "krn start",
    "krn context",
    "krn verify",
    "krn handoff",
  ].filter((command) => !content.includes(command));

  if (missingCommands.length > 0) {
    return {
      name: "downstream-runtime-skill",
      status: "fail",
      detail: `${relativePath} is missing runtime command(s): ${missingCommands.join(", ")}`,
    };
  }

  if (content.includes("Architecture Spec") || content.length > 1600) {
    return {
      name: "downstream-runtime-skill",
      status: "fail",
      detail: `${relativePath} is too broad for downstream active context`,
    };
  }

  return {
    name: "downstream-runtime-skill",
    status: "pass",
    detail: `${relativePath} is present and routes through the KRN CLI`,
  };
}

export async function downstreamHooksTemplateCheck(
  cwd: string,
  source: boolean,
): Promise<DoctorCheck> {
  const relativePath = ".codex/hooks.json";
  const absolutePath = path.join(cwd, relativePath);

  if (!(await pathExists(absolutePath))) {
    return {
      name: "downstream-hooks-template",
      status: "warn",
      detail: source
        ? `${relativePath} is not installed in the source checkout; adapter template is checked separately`
        : `${relativePath} is missing; run \`krn install\` in the downstream repo`,
    };
  }

  const parsed = await parseJsonFile(absolutePath);

  if (parsed.status !== "parsed") {
    return {
      name: "downstream-hooks-template",
      status: "fail",
      detail: `${relativePath} is malformed`,
    };
  }

  if (!isRecord(parsed.value) || !isRecord(parsed.value.hooks)) {
    return {
      name: "downstream-hooks-template",
      status: "fail",
      detail: `${relativePath} is missing hooks object`,
    };
  }

  const hooks = parsed.value.hooks;
  const missingEvents = supportedCodexHookEvents.filter((event) => {
    const entries = hooks[event];

    return !(
      Array.isArray(entries) &&
      isRecord(entries[0]) &&
      Array.isArray(entries[0].hooks) &&
      isRecord(entries[0].hooks[0]) &&
      entries[0].hooks[0].command === `./.krn/bin/krn hook codex ${event}`
    );
  });

  if (missingEvents.length > 0) {
    return {
      name: "downstream-hooks-template",
      status: "fail",
      detail: `${relativePath} is missing hook event(s): ${missingEvents.join(", ")}`,
    };
  }

  return {
    name: "downstream-hooks-template",
    status: "pass",
    detail: `${relativePath} covers ${supportedCodexHookEvents.length} P0 Codex hook event(s)`,
  };
}

export async function sourceTreeCheck(
  cwd: string,
  input: { name: string; paths: string[] },
): Promise<DoctorCheck> {
  const source = await isHarnessSource(cwd);
  const missing = [];

  for (const relativePath of input.paths) {
    if (!(await pathExists(path.join(cwd, relativePath)))) {
      missing.push(relativePath);
    }
  }

  if (missing.length === 0) {
    return {
      name: input.name,
      status: "pass",
      detail: `${input.paths.length} source path(s) are present`,
    };
  }

  return {
    name: input.name,
    status: source ? "fail" : "warn",
    detail: source
      ? `Missing source path(s): ${missing.join(", ")}`
      : "Not running inside the krn-harness source tree; source-only check skipped",
  };
}
