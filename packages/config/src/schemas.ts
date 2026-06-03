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
  return validateKRNConfig(value).length === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object") {
    return false;
  }

  return !Array.isArray(value);
}

export function validateKRNConfig(value: unknown): string[] {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return ["config must be a JSON object"];
  }

  if (value.version !== 1) {
    issues.push("version must be 1");
  }

  if (value.project !== undefined) {
    if (!isRecord(value.project)) {
      issues.push("project must be an object");
    } else if (value.project.name !== undefined && typeof value.project.name !== "string") {
      issues.push("project.name must be a string");
    }
  }

  if (value.runtime !== undefined) {
    if (!isRecord(value.runtime)) {
      issues.push("runtime must be an object");
    } else if (value.runtime.dir !== undefined && typeof value.runtime.dir !== "string") {
      issues.push("runtime.dir must be a string");
    }
  }

  if (value.verify !== undefined) {
    if (!isRecord(value.verify)) {
      issues.push("verify must be an object");
    } else if (
      value.verify.commands !== undefined &&
      (!Array.isArray(value.verify.commands) ||
        value.verify.commands.some((command) => typeof command !== "string"))
    ) {
      issues.push("verify.commands must be an array of strings");
    }
  }

  return issues;
}
