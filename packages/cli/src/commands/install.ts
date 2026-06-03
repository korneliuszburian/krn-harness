import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  generateAgentsAdapter,
  generateHooksTemplate,
  generateRuntimeSkillTemplate,
} from "../../../codex-adapter/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import type { CliRuntime } from "../runtime.js";

export interface InstallAction {
  path: string;
  kind: "file" | "directory";
  status: "created" | "skipped";
  detail: string;
}

export interface InstallResult {
  status: "installed" | "skipped";
  created: number;
  skipped: number;
  reason?: string;
  actions: InstallAction[];
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isHarnessSource(cwd: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(await readFile(path.join(cwd, "package.json"), "utf8")) as {
      name?: string;
    };
    return parsed.name === "krn-harness";
  } catch {
    return false;
  }
}

async function ensureDirectory(cwd: string, relativePath: string): Promise<InstallAction> {
  const absolutePath = path.join(cwd, relativePath);
  const exists = await pathExists(absolutePath);
  await mkdir(absolutePath, { recursive: true });

  return {
    path: relativePath,
    kind: "directory",
    status: exists ? "skipped" : "created",
    detail: exists ? "directory already exists" : "directory created",
  };
}

async function writeFileIfMissing(
  cwd: string,
  relativePath: string,
  content: string,
): Promise<InstallAction> {
  const absolutePath = path.join(cwd, relativePath);

  if (await pathExists(absolutePath)) {
    return {
      path: relativePath,
      kind: "file",
      status: "skipped",
      detail: "existing file preserved",
    };
  }

  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");

  return {
    path: relativePath,
    kind: "file",
    status: "created",
    detail: "file created",
  };
}

function defaultConfig(): string {
  return `${JSON.stringify(
    {
      version: 1,
      runtime: {
        dir: ".krn",
      },
    },
    null,
    2,
  )}\n`;
}

export async function runInstall(cwd: string): Promise<InstallResult> {
  if (await isHarnessSource(cwd)) {
    return {
      status: "skipped",
      created: 0,
      skipped: 0,
      reason: "source checkout detected; install targets downstream repositories",
      actions: [],
    };
  }

  const actions = [
    await ensureDirectory(cwd, ".krn/current"),
    await ensureDirectory(cwd, ".krn/graph"),
    await ensureDirectory(cwd, ".krn/traces"),
    await writeFileIfMissing(cwd, "krn.config.json", defaultConfig()),
    await writeFileIfMissing(cwd, "AGENTS.md", generateAgentsAdapter()),
    await writeFileIfMissing(cwd, ".codex/hooks.json", generateHooksTemplate()),
    await writeFileIfMissing(
      cwd,
      ".agents/skills/krn-harness/SKILL.md",
      generateRuntimeSkillTemplate(),
    ),
  ];
  const created = actions.filter((action) => action.status === "created").length;
  const skipped = actions.length - created;

  return {
    status: "installed",
    created,
    skipped,
    actions,
  };
}

function renderInstallOutput(result: InstallResult): string {
  const lines = [`KRN install: ${result.status}`];

  if (result.reason) {
    lines.push(`reason: ${result.reason}`);
  }

  lines.push(`created: ${result.created}`, `skipped: ${result.skipped}`);

  for (const action of result.actions) {
    lines.push(`- ${action.status} ${action.path}: ${action.detail}`);
  }

  lines.push("");
  return lines.join("\n");
}

export async function installCommand(runtime: CliRuntime): Promise<number> {
  const result = await runInstall(runtime.cwd);

  await writeTraceEvent(
    createTraceEvent("install.ran", {
      now: runtime.now?.(),
      data: {
        status: result.status,
        created: result.created,
        skipped: result.skipped,
        reason: result.reason ?? null,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(renderInstallOutput(result));
  return 0;
}
