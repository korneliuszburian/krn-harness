import { chmod, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  generateAgentsAdapter,
  generateHooksTemplate,
  generateRuntimeSkillTemplateFiles,
} from "../../codex-adapter/src/index.js";
import { pathExists, readJsonFile } from "../../core/src/index.js";

export const KRN_MANAGED_MARKER = "KRN-HARNESS-MANAGED:v1";
const KRN_HOOKS_PATH = ".codex/hooks.json";
const KRN_HOOKS_MANAGED_SIDECAR_PATH = ".codex/hooks.json.krn-managed";

export type InstallActionStatus =
  | "created"
  | "skipped"
  | "updated"
  | "would-create"
  | "would-skip"
  | "would-update";

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
        timeoutMs: 360_000,
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

function managedText(
  content: string,
  markerStyle: "frontmatter-markdown" | "markdown" | "shell" | "yaml",
): string {
  if (markerStyle === "shell") {
    return content.includes(KRN_MANAGED_MARKER) ? content : `# ${KRN_MANAGED_MARKER}\n${content}`;
  }

  if (markerStyle === "yaml") {
    return content.includes(KRN_MANAGED_MARKER) ? content : `# ${KRN_MANAGED_MARKER}\n${content}`;
  }

  if (markerStyle === "frontmatter-markdown") {
    if (content.includes(KRN_MANAGED_MARKER)) {
      return content;
    }

    return content.startsWith("---\n")
      ? `---\n# ${KRN_MANAGED_MARKER}\n${content.slice("---\n".length)}`
      : `<!-- ${KRN_MANAGED_MARKER} -->\n${content}`;
  }

  return content.includes(KRN_MANAGED_MARKER)
    ? content
    : `<!-- ${KRN_MANAGED_MARKER} -->\n${content}`;
}

function managedHooksTemplate(): string {
  const parsed = JSON.parse(generateHooksTemplate()) as Record<string, unknown>;
  return `${JSON.stringify(parsed, null, 2)}\n`;
}

function managedHooksSidecarTemplate(): string {
  return `${KRN_MANAGED_MARKER}\ntarget=${KRN_HOOKS_PATH}\n`;
}

function installDirectories(): string[] {
  return [".krn/current", ".krn/graph", ".krn/traces", ".krn/runs", ".krn/memory", ".krn/bin"];
}

function installFilesBeforeHooks(options: InstallOptions): FileTarget[] {
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
  ];
}

function installFilesAfterHooks(): FileTarget[] {
  return [
    ...generateRuntimeSkillTemplateFiles().map((file) => ({
      path: file.path,
      content: managedText(file.content, file.markerStyle),
    })),
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
    const current = await readFile(absolutePath, "utf8");
    if (current.includes(KRN_MANAGED_MARKER) && current !== target.content) {
      if (!dryRun) {
        await writeFile(absolutePath, target.content, "utf8");
        if (target.executable === true) {
          await chmod(absolutePath, 0o755);
        }
      }

      return {
        path: target.path,
        kind: "file",
        status: dryRun ? "would-update" : "updated",
        detail:
          target.executable === true
            ? dryRun
              ? "managed executable file would be updated"
              : "managed executable file updated"
            : dryRun
              ? "managed file would be updated"
              : "managed file updated",
      };
    }

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

async function hasManagedHooksSidecar(cwd: string): Promise<boolean> {
  try {
    const content = await readFile(path.join(cwd, KRN_HOOKS_MANAGED_SIDECAR_PATH), "utf8");
    return content.includes(KRN_MANAGED_MARKER) && content.includes(`target=${KRN_HOOKS_PATH}`);
  } catch {
    return false;
  }
}

async function planHooksFiles(cwd: string, dryRun: boolean): Promise<InstallAction[]> {
  assertSafeRelativePath(KRN_HOOKS_PATH);
  assertSafeRelativePath(KRN_HOOKS_MANAGED_SIDECAR_PATH);

  const hooksPath = path.join(cwd, KRN_HOOKS_PATH);
  const sidecarPath = path.join(cwd, KRN_HOOKS_MANAGED_SIDECAR_PATH);
  const hooksExists = await pathExists(hooksPath);
  const sidecarExists = await pathExists(sidecarPath);
  const hooksContent = managedHooksTemplate();
  const sidecarContent = managedHooksSidecarTemplate();

  if (!hooksExists) {
    if (!dryRun) {
      await mkdir(path.dirname(hooksPath), { recursive: true });
      await writeFile(hooksPath, hooksContent, "utf8");
      await writeFile(sidecarPath, sidecarContent, "utf8");
    }

    return [
      {
        path: KRN_HOOKS_PATH,
        kind: "file",
        status: dryRun ? "would-create" : "created",
        detail: dryRun ? "file would be created" : "file created",
      },
      {
        path: KRN_HOOKS_MANAGED_SIDECAR_PATH,
        kind: "file",
        status: dryRun ? "would-create" : "created",
        detail: dryRun
          ? "hooks ownership sidecar would be created"
          : "hooks ownership sidecar created",
      },
    ];
  }

  const currentHooks = await readFile(hooksPath, "utf8");
  const hooksManaged =
    currentHooks.includes(KRN_MANAGED_MARKER) || (await hasManagedHooksSidecar(cwd));
  if (!hooksManaged) {
    return [
      {
        path: KRN_HOOKS_PATH,
        kind: "file",
        status: dryRun ? "would-skip" : "skipped",
        detail: "existing file preserved",
      },
    ];
  }

  const hooksAction: InstallAction =
    currentHooks === hooksContent
      ? {
          path: KRN_HOOKS_PATH,
          kind: "file",
          status: dryRun ? "would-skip" : "skipped",
          detail: "managed file already current",
        }
      : {
          path: KRN_HOOKS_PATH,
          kind: "file",
          status: dryRun ? "would-update" : "updated",
          detail: dryRun ? "managed file would be updated" : "managed file updated",
        };

  if (!dryRun && currentHooks !== hooksContent) {
    await writeFile(hooksPath, hooksContent, "utf8");
  }

  const currentSidecar = sidecarExists ? await readFile(sidecarPath, "utf8") : undefined;
  const sidecarAction: InstallAction =
    currentSidecar === sidecarContent
      ? {
          path: KRN_HOOKS_MANAGED_SIDECAR_PATH,
          kind: "file",
          status: dryRun ? "would-skip" : "skipped",
          detail: "hooks ownership sidecar already current",
        }
      : {
          path: KRN_HOOKS_MANAGED_SIDECAR_PATH,
          kind: "file",
          status: sidecarExists
            ? dryRun
              ? "would-update"
              : "updated"
            : dryRun
              ? "would-create"
              : "created",
          detail: sidecarExists
            ? dryRun
              ? "hooks ownership sidecar would be updated"
              : "hooks ownership sidecar updated"
            : dryRun
              ? "hooks ownership sidecar would be created"
              : "hooks ownership sidecar created",
        };

  if (!dryRun && currentSidecar !== sidecarContent) {
    await mkdir(path.dirname(sidecarPath), { recursive: true });
    await writeFile(sidecarPath, sidecarContent, "utf8");
  }

  return [hooksAction, sidecarAction];
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
  for (const target of installFilesBeforeHooks(options)) {
    actions.push(await planFile(cwd, target, options.dryRun));
  }
  actions.push(...(await planHooksFiles(cwd, options.dryRun)));
  for (const target of installFilesAfterHooks()) {
    actions.push(await planFile(cwd, target, options.dryRun));
  }

  const created = actions.filter(
    (action) =>
      action.status === "created" ||
      action.status === "would-create" ||
      action.status === "updated" ||
      action.status === "would-update",
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
  return [
    "AGENTS.md",
    KRN_HOOKS_PATH,
    KRN_HOOKS_MANAGED_SIDECAR_PATH,
    ".agents/skills/krn-harness/SKILL.md",
    ".agents/skills/krn-harness/agents/openai.yaml",
    ".agents/skills/krn-harness/references/workflow.md",
    ".krn/bin/krn",
  ];
}

async function hasManagedMarker(cwd: string, relativePath: string): Promise<boolean> {
  try {
    const content = await readFile(path.join(cwd, relativePath), "utf8");
    return (
      content.includes(KRN_MANAGED_MARKER) ||
      (relativePath === KRN_HOOKS_PATH && (await hasManagedHooksSidecar(cwd)))
    );
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
