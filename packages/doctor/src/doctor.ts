import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../../config/src/index.js";

export interface DoctorCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export type DoctorStatus = "pass" | "warn" | "fail";

export interface DoctorResult {
  status: DoctorStatus;
  checks: DoctorCheck[];
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

function deriveStatus(checks: DoctorCheck[]): DoctorStatus {
  if (checks.some((check) => check.status === "fail")) {
    return "fail";
  }

  if (checks.some((check) => check.status === "warn")) {
    return "warn";
  }

  return "pass";
}

async function isHarnessSource(cwd: string): Promise<boolean> {
  const packageJson = await readJson<{ name?: string }>(path.join(cwd, "package.json"));
  return packageJson?.name === "krn-harness";
}

function artifactCheck(name: string, present: boolean, relativePath: string): DoctorCheck {
  return {
    name,
    status: present ? "pass" : "warn",
    detail: present ? `${relativePath} is present` : `${relativePath} is missing`,
  };
}

async function configCheck(cwd: string): Promise<DoctorCheck> {
  try {
    const loaded = await loadConfig(cwd);
    return {
      name: "config",
      status: loaded.source === "file" ? "pass" : "warn",
      detail:
        loaded.source === "file"
          ? `${path.relative(cwd, loaded.path ?? "krn.config.json")} is valid`
          : "krn.config.json is missing; default config is active",
    };
  } catch (error) {
    return {
      name: "config",
      status: "fail",
      detail: error instanceof Error ? error.message : "krn.config.json is invalid",
    };
  }
}

async function sourceTreeCheck(
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

export async function runDoctor(cwd = process.cwd()): Promise<DoctorResult> {
  const currentDir = path.join(cwd, ".krn", "current");
  const tracePath = path.join(cwd, ".krn", "traces", "trace.jsonl");
  const contextPackage = await readJson<{ stop?: boolean; stopReason?: string }>(
    path.join(currentDir, "context-package.json"),
  );

  const checks: DoctorCheck[] = [
    await configCheck(cwd),
    artifactCheck(
      "current-task-contract",
      await pathExists(path.join(currentDir, "task-contract.json")),
      ".krn/current/task-contract.json",
    ),
    artifactCheck(
      "current-context-package",
      await pathExists(path.join(currentDir, "context-package.json")),
      ".krn/current/context-package.json",
    ),
    {
      name: "context-stop",
      status: contextPackage === undefined || contextPackage.stop ? "warn" : "pass",
      detail:
        contextPackage === undefined
          ? "No current context package is available"
          : contextPackage.stop
            ? (contextPackage.stopReason ?? "Current context package reports STOP")
            : "Current context package does not report STOP",
    },
    artifactCheck(
      "current-verify-result",
      await pathExists(path.join(currentDir, "verify-result.json")),
      ".krn/current/verify-result.json",
    ),
    artifactCheck(
      "current-handoff",
      await pathExists(path.join(currentDir, "handoff.md")),
      ".krn/current/handoff.md",
    ),
    await sourceTreeCheck(cwd, {
      name: "adapter-templates",
      paths: [
        "packages/codex-adapter/src/templates/AGENTS.md.tmpl",
        "packages/codex-adapter/src/templates/hooks.json.tmpl",
        "packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl",
      ],
    }),
    await sourceTreeCheck(cwd, {
      name: "build-time-skills",
      paths: [
        ".agents/skills/buduj/SKILL.md",
        ".agents/skills/pilnuj/SKILL.md",
        ".agents/skills/wycinek/SKILL.md",
        ".agents/skills/handoff/SKILL.md",
      ],
    }),
    artifactCheck("trace", await pathExists(tracePath), ".krn/traces/trace.jsonl"),
  ];

  return {
    status: deriveStatus(checks),
    checks,
  };
}

export function renderDoctorResultMarkdown(result: DoctorResult): string {
  const lines = ["# KRN Doctor Result", "", `Status: ${result.status}`, "", "## Checks", ""];

  for (const check of result.checks) {
    lines.push(`- ${check.name}: ${check.status} - ${check.detail}`);
  }

  lines.push("");
  return lines.join("\n");
}
