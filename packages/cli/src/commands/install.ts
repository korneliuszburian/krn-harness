import { chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  generateAgentsAdapter,
  generateHooksTemplate,
  generateRuntimeSkillTemplate,
} from "../../../codex-adapter/src/index.js";
import { pathExists, readJsonFile } from "../../../core/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import { buildCliIdentity } from "../identity.js";
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

async function isHarnessSource(cwd: string): Promise<boolean> {
  const parsed = await readJsonFile<{ name?: string }>(path.join(cwd, "package.json"));
  return parsed?.name === "krn-harness";
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

async function writeExecutableFileIfMissing(
  cwd: string,
  relativePath: string,
  content: string,
): Promise<InstallAction> {
  const action = await writeFileIfMissing(cwd, relativePath, content);

  if (action.status === "created") {
    await chmod(path.join(cwd, relativePath), 0o755);
    return {
      ...action,
      detail: "executable file created",
    };
  }

  return action;
}

function pinnedKrnWrapper(sourceRootPath: string): string {
  return `#!/usr/bin/env sh
export KRN_HARNESS_BIN_WRAPPER="$0"
export KRN_HARNESS_SOURCE_ROOT="${sourceRootPath}"
exec node --import "${sourceRootPath}/node_modules/tsx/dist/esm/index.mjs" "${sourceRootPath}/packages/cli/src/index.ts" "$@"
`;
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

export async function runInstall(
  cwd: string,
  input: { sourceRootPath?: string | undefined } = {},
): Promise<InstallResult> {
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
    await ensureDirectory(cwd, ".krn/runs"),
    await ensureDirectory(cwd, ".krn/memory"),
    await ensureDirectory(cwd, ".krn/bin"),
    await writeFileIfMissing(cwd, "krn.config.json", defaultConfig()),
    await writeFileIfMissing(cwd, "AGENTS.md", generateAgentsAdapter()),
    await writeExecutableFileIfMissing(
      cwd,
      ".krn/bin/krn",
      pinnedKrnWrapper(input.sourceRootPath ?? process.cwd()),
    ),
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
  const result = await runInstall(runtime.cwd, {
    sourceRootPath: buildCliIdentity(runtime).sourceRootPath,
  });

  await writeTraceEvent(
    createTraceEvent("install.ran", {
      now: runtime.now?.(),
      data: {
        status: result.status,
        created: result.created,
        skipped: result.skipped,
        reason: result.reason ?? null,
        actions: result.actions.map((action) => ({
          path: action.path,
          kind: action.kind,
          status: action.status,
        })),
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(renderInstallOutput(result));
  return 0;
}
