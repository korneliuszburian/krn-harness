export interface KRNConfig {
  version: 1;
  project?: {
    name?: string;
  };
  runtime?: {
    dir?: string;
  };
  verify?: {
    commands?: string[];
  };
}

export const defaultConfig: KRNConfig = {
  version: 1,
  runtime: {
    dir: ".krn",
  },
};

export function isKRNConfig(value: unknown): value is KRNConfig {
  if (!value || typeof value !== "object") {
    return false;
  }

  const maybe = value as { version?: unknown };
  return maybe.version === 1;
}
