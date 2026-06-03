import { access } from "node:fs/promises";
import path from "node:path";

export const CONFIG_FILE = "krn.config.json";

export async function detectConfig(cwd = process.cwd()): Promise<string | undefined> {
  const candidate = path.join(cwd, CONFIG_FILE);

  try {
    await access(candidate);
    return candidate;
  } catch {
    return undefined;
  }
}
