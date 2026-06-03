import { readFile } from "node:fs/promises";
import { ValidationError } from "../../core/src/index.js";
import { detectConfig } from "./detect-config.js";
import { defaultConfig, type KRNConfig, validateKRNConfig } from "./schemas.js";

export interface LoadedConfig {
  config: KRNConfig;
  path?: string;
  source: "file" | "default";
}

export async function loadConfig(cwd = process.cwd()): Promise<LoadedConfig> {
  const configPath = await detectConfig(cwd);

  if (!configPath) {
    return {
      config: defaultConfig,
      source: "default",
    };
  }

  const raw = await readFile(configPath, "utf8");
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    throw new ValidationError("krn.config.json must be valid JSON");
  }

  const issues = validateKRNConfig(parsed);
  if (issues.length > 0) {
    throw new ValidationError(`krn.config.json is invalid: ${issues.join("; ")}`);
  }

  const config = parsed as KRNConfig;

  return {
    config: {
      ...defaultConfig,
      ...config,
      runtime: {
        ...defaultConfig.runtime,
        ...config.runtime,
      },
    },
    path: configPath,
    source: "file",
  };
}
