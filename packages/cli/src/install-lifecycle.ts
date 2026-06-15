import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  generateAgentsAdapter,
  generateHooksTemplate,
  generateRuntimeSkillTemplate,
} from "../../codex-adapter/src/index.js";
import { pathExists, readJsonFile } from "../../core/src/index.js";

export const KRN_MANAGED_MARKER = "KRN-HARNESS-MANAGED:v1";

export type InstallActionStatus = "created" | "skipped" | "would-create" | "would-skip";

export interface InstallAction {
  path: string;
  kind: "file" | "directory";
  status: InstallActionStatus;
  detail: string;
}

export interface InstallResult {
  schema: "krn-install-result-v1";
  generatedAt: string;
  dryRun: boolean;
  status: "installed" | "planned" | "skipped";
  created: number;
  skipped: number;
  reason?: string | undefined;
  actions: InstallAction[];
}

export interface InstallOptions {
  dryRun: boolean;
  sourceRootPath: string;
  configProfile?: "minimal" | "readonly-python" | "node-test" | "quality" | undefined;
  generatedAt: string;
}

interface FileTarget {
  path: string;
  content: string;
  executable?: boolean | undefined;
}

export interface UninstallCandidate {
  path: string;
  kind: "file";
  status: "would-remove" | "removed";
  detail: string;
}

export interface UninstallRefusal {
  path: string;
  reason: string;
}

export interface UninstallResult {
  schema: "krn-uninstall-result-v1";
  generatedAt: string;
  dryRun: boolean;
  confirm: boolean;
  status: "planned" | "uninstalled" | "blocked";
  removed: number;
  candidates: UninstallCandidate[];
  refused: UninstallRefusal[];
  preserved: string[];
}

function normalizeRelativePath(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function assertSafeRelativePath(relativePath: string): void {
  const normalized = normalizeRelativePath(relativePath);
  if (
    normalized.length === 0 ||
    normalized.startsWith("/") ||
    normalized.startsWith("../") ||
    normalized.includes("/../")
  ) {
    throw new Error(`unsafe relative path: ${relativePath}`);
  }
}

export async function isHarnessSource(cwd: string): Promise<boolean> {
  const parsed = await readJsonFile<{ name?: string }>(path.join(cwd, "package.json"));
  return parsed?.name === "krn-harness";
}

export function pinnedKrnWrapper(sourceRootPath: string): string {
  return `#!/usr/bin/env sh
# ${KRN_MANAGED_MARKER}
export KRN_HARNESS_BIN_WRAPPER="$0"
export KRN_HARNESS_SOURCE_ROOT="${sourceRootPath}"
exec node --import "${sourceRootPath}/node_modules/tsx/dist/esm/index.mjs" "${sourceRootPath}/packages/cli/src/index.ts" "$@"
`;
}

export function configObjectForProfile(
  profile: "minimal" | "readonly-python" | "node-test" | "quality" = "minimal",
): Record<string, unknown> {
  const base = {
    version: 1,
    runtime: {
      dir: ".krn",
    },
  };

  if (profile === "readonly-python") {
    return {
      ...base,
      verify: {
        defaultProfile: "readonly",
        mode: "record-only",
        timeoutMs: 180_000,
        maxOutputBytes: 16_000,
        profiles: {
          readonly: {
            commands: [
              {
                command: "python3",
                args: ["tools/check_all_readonly.py"],
                label: "readonly suite",
              },
            ],
          },
        },
      },
    };
  }

  if (profile === "node-test") {
    return {
      ...base,
      verify: {
        defaultProfile: "unit",
        mode: "record-only",
        profiles: {
          unit: {
            commands: [
              {
                command: "node",
                args: ["src/index.test.ts"],
                label: "unit smoke",
              },
            ],
          },
        },
      },
    };
  }

  if (profile === "quality") {
    return {
      ...base,
      verify: {
        defaultProfile: "quality",
        mode: "record-only",
        profiles: {
          quality: {
            commands: ["pnpm lint", "pnpm typecheck", "pnpm test"],
          },
        },
      },
    };
  }

  return base;
}

export function renderConfig(
  profile?: "minimal" | "readonly-python" | "node-test" | "quality",
): string {
  return `${JSON.stringify(configObjectForProfile(profile ?? "minimal"), null, 2)}\n`;
}

function managedText(content: string, markerStyle: "markdown" | "shell"): string {
  if (markerStyle === "shell") {
    return content.includes(KRN_MANAGED_MARKER) ? content : `# ${KRN_MANAGED_MARKER}\n${content}`;
  }

  return content.includes(KRN_MANAGED_MARKER)
    ? content
    : `<!-- ${KRN_MANAGED_MARKER} -->\n${content}`;
}

function managedHooksTemplate(): string {
  const parsed = JSON.parse(generateHooksTemplate()) as Record<string, unknown>;
  return `${JSON.stringify({ _krnManaged: KRN_MANAGED_MARKER, ...parsed }, null, 2)}\n`;
}

function installDirectories(): string[] {
  return [".krn/current", ".krn/graph", ".krn/traces", ".krn/runs", ".krn/memory", ".krn/bin"];
}

function installFiles(options: InstallOptions): FileTarget[] {
  return [
    {
      path: "krn.config.json",
      content: renderConfig(options.configProfile),
    },
    {
      path: "AGENTS.md",
      content: managedText(generateAgentsAdapter(), "markdown"),
    },
    {
      path: ".krn/bin/krn",
      content: pinnedKrnWrapper(options.sourceRootPath),
      executable: true,
    },
    {
      path: ".codex/hooks.json",
      content: managedHooksTemplate(),
    },
    {
      path: ".agents/skills/krn-harness/SKILL.md",
      content: managedText(generateRuntimeSkillTemplate(), "markdown"),
    },
  ];
}

async function planDirectory(
  cwd: string,
  relativePath: string,
  dryRun: boolean,
): Promise<InstallAction> {
  assertSafeRelativePath(relativePath);
  const absolutePath = path.join(cwd, relativePath);
  const exists = await pathExists(absolutePath);
  if (!dryRun) {
    await mkdir(absolutePath, { recursive: true });
  }

  return {
    path: relativePath,
    kind: "directory",
    status: exists ? (dryRun ? "would-skip" : "skipped") : dryRun ? "would-create" : "created",
    detail: exists
      ? "directory already exists"
      : dryRun
        ? "directory would be created"
        : "directory created",
  };
}

async function planFile(cwd: string, target: FileTarget, dryRun: boolean): Promise<InstallAction> {
  assertSafeRelativePath(target.path);
  const absolutePath = path.join(cwd, target.path);
  const exists = await pathExists(absolutePath);
  if (exists) {
    return {
      path: target.path,
      kind: "file",
      status: dryRun ? "would-skip" : "skipped",
      detail: "existing file preserved",
    };
  }

  if (!dryRun) {
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, target.content, "utf8");
    if (target.executable === true) {
      await chmod(absolutePath, 0o755);
    }
  }

  return {
    path: target.path,
    kind: "file",
    status: dryRun ? "would-create" : "created",
    detail:
      target.executable === true
        ? dryRun
          ? "executable file would be created"
          : "executable file created"
        : dryRun
          ? "file would be created"
          : "file created",
  };
}

export async function runInstallPlan(cwd: string, options: InstallOptions): Promise<InstallResult> {
  if (await isHarnessSource(cwd)) {
    return {
      schema: "krn-install-result-v1",
      generatedAt: options.generatedAt,
      dryRun: options.dryRun,
      status: "skipped",
      created: 0,
      skipped: 0,
      reason: "source checkout detected; install targets downstream repositories",
      actions: [],
    };
  }

  const actions: InstallAction[] = [];
  for (const relativePath of installDirectories()) {
    actions.push(await planDirectory(cwd, relativePath, options.dryRun));
  }
  for (const target of installFiles(options)) {
    actions.push(await planFile(cwd, target, options.dryRun));
  }

  const created = actions.filter(
    (action) => action.status === "created" || action.status === "would-create",
  ).length;
  const skipped = actions.length - created;

  return {
    schema: "krn-install-result-v1",
    generatedAt: options.generatedAt,
    dryRun: options.dryRun,
    status: options.dryRun ? "planned" : "installed",
    created,
    skipped,
    actions,
  };
}

function uninstallTargets(): string[] {
  return ["AGENTS.md", ".codex/hooks.json", ".agents/skills/krn-harness/SKILL.md", ".krn/bin/krn"];
}

async function hasManagedMarker(cwd: string, relativePath: string): Promise<boolean> {
  try {
    return (await readFile(path.join(cwd, relativePath), "utf8")).includes(KRN_MANAGED_MARKER);
  } catch {
    return false;
  }
}

export async function runUninstallPlan(
  cwd: string,
  input: { dryRun: boolean; confirm: boolean; generatedAt: string },
): Promise<UninstallResult> {
  const candidates: UninstallCandidate[] = [];
  const refused: UninstallRefusal[] = [];
  const preserved = [".krn/current", ".krn/graph", ".krn/traces", ".krn/runs", ".krn/memory"];

  for (const relativePath of uninstallTargets()) {
    assertSafeRelativePath(relativePath);
    const exists = await pathExists(path.join(cwd, relativePath));
    if (!exists) {
      continue;
    }

    if (!(await hasManagedMarker(cwd, relativePath))) {
      refused.push({
        path: relativePath,
        reason: "existing file has no KRN managed marker; preserving user-owned content",
      });
      continue;
    }

    candidates.push({
      path: relativePath,
      kind: "file",
      status: input.confirm ? "removed" : "would-remove",
      detail: input.confirm ? "managed file removed" : "managed file would be removed",
    });
  }

  if (input.confirm) {
    for (const candidate of candidates) {
      await rm(path.join(cwd, candidate.path), { force: true });
    }
  }

  return {
    schema: "krn-uninstall-result-v1",
    generatedAt: input.generatedAt,
    dryRun: input.dryRun,
    confirm: input.confirm,
    status: input.confirm ? "uninstalled" : "planned",
    removed: input.confirm ? candidates.length : 0,
    candidates,
    refused,
    preserved,
  };
}
