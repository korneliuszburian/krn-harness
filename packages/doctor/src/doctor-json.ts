import { readFile } from "node:fs/promises";
import { pathExists, readJsonFile } from "../../core/src/index.js";

export async function readJson<T>(filePath: string): Promise<T | undefined> {
  return readJsonFile<T>(filePath);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function parseJsonFile(
  filePath: string,
): Promise<{ status: "missing" } | { status: "malformed" } | { status: "parsed"; value: unknown }> {
  if (!(await pathExists(filePath))) {
    return { status: "missing" };
  }

  try {
    return {
      status: "parsed",
      value: JSON.parse(await readFile(filePath, "utf8")) as unknown,
    };
  } catch {
    return { status: "malformed" };
  }
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
