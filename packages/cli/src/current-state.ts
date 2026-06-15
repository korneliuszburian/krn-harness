import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContextPackage } from "../../context/src/index.js";
import { parseTaskContract, type TaskContract } from "../../task-contract/src/index.js";
import type { VerifyResult } from "../../verify/src/index.js";

export function currentStateDir(cwd: string): string {
  return path.join(cwd, ".krn", "current");
}

export function currentStatePath(cwd: string, fileName: string): string {
  return path.join(currentStateDir(cwd), fileName);
}

export async function ensureCurrentStateDir(cwd: string): Promise<string> {
  const dir = currentStateDir(cwd);
  await mkdir(dir, { recursive: true });
  return dir;
}

async function readCurrentJson<T>(
  cwd: string,
  fileName: string,
  parse?: (value: unknown) => T,
): Promise<T | undefined> {
  try {
    const value = JSON.parse(await readFile(currentStatePath(cwd, fileName), "utf8")) as unknown;
    return parse ? parse(value) : (value as T);
  } catch {
    return undefined;
  }
}

export async function writeCurrentJson(
  cwd: string,
  fileName: string,
  value: unknown,
): Promise<void> {
  await ensureCurrentStateDir(cwd);
  await writeFile(currentStatePath(cwd, fileName), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export async function writeCurrentMarkdown(
  cwd: string,
  fileName: string,
  markdown: string,
): Promise<void> {
  await ensureCurrentStateDir(cwd);
  await writeFile(currentStatePath(cwd, fileName), markdown, "utf8");
}

export function readCurrentTaskContract(cwd: string): Promise<TaskContract | undefined> {
  return readCurrentJson<TaskContract>(cwd, "task-contract.json", parseTaskContract);
}

export async function readCurrentTaskId(cwd: string): Promise<string | undefined> {
  return (await readCurrentTaskContract(cwd))?.id;
}

export function readCurrentContextPackage(cwd: string): Promise<ContextPackage | undefined> {
  return readCurrentJson<ContextPackage>(cwd, "context-package.json");
}

export function readCurrentVerifyResult(cwd: string): Promise<VerifyResult | undefined> {
  return readCurrentJson<VerifyResult>(cwd, "verify-result.json");
}
