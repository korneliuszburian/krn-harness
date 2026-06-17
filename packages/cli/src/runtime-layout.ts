import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { loadConfig } from "../../config/src/index.js";
import {
  buildRuntimeLayout,
  defaultRuntimeDir,
  type RuntimeLayout,
  setRuntimeLayout,
} from "../../core/src/index.js";
import type { CliRuntime } from "./runtime.js";

const execFileAsync = promisify(execFile);

export async function resolveCliRuntimeLayout(cwd: string): Promise<RuntimeLayout> {
  const loaded = await loadConfig(cwd);
  const layout = buildRuntimeLayout(loaded.config.runtime?.dir ?? defaultRuntimeDir);
  setRuntimeLayout(cwd, layout);
  return layout;
}

export function applyRuntimeLayout(runtime: CliRuntime, layout: RuntimeLayout): CliRuntime {
  return {
    ...runtime,
    runtimeDir: layout.root,
  };
}

export async function runtimeDirTrackedByGit(cwd: string, runtimeDir: string): Promise<boolean> {
  try {
    await execFileAsync("git", ["-C", cwd, "rev-parse", "--is-inside-work-tree"]);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw error;
    }
    return false;
  }

  const { stdout } = await execFileAsync("git", ["-C", cwd, "ls-files", "--", runtimeDir]);
  return stdout.trim().length > 0;
}

export async function guardWritableRuntimeDir(runtime: CliRuntime): Promise<boolean> {
  const runtimeDir = runtime.runtimeDir ?? defaultRuntimeDir;

  try {
    if (!(await runtimeDirTrackedByGit(runtime.cwd, runtimeDir))) {
      return true;
    }
  } catch {
    runtime.stderr(
      `KRN runtime warning: could not confirm whether runtime directory ${runtimeDir} is tracked by git; continuing.\n`,
    );
    return true;
  }

  runtime.stderr(
    `KRN runtime blocker: runtime directory ${runtimeDir} is tracked by this repository; configure runtime.dir such as .krn-harness.\n`,
  );
  return false;
}
