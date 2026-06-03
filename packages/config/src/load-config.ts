import { readFile } from "node:fs/promises";
import { ValidationError } from "../../core/src/index.js";
import { detectConfig } from "./detect-config.js";
import { defaultConfig, isKRNConfig, type KRNConfig } from "./schemas.js";

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
  const parsed = JSON.parse(raw) as unknown;

  if (!isKRNConfig(parsed)) {
    throw new ValidationError("krn.config.json must be an object with version: 1");
  }

  return {
    config: {
      ...defaultConfig,
      ...parsed,
      runtime: {
        ...defaultConfig.runtime,
        ...parsed.runtime,
      },
    },
    path: configPath,
    source: "file",
  };
}
