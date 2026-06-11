export interface KRNConfig {
  version: 1;
  project?: {
    name?: string;
  };
  runtime?: {
    dir?: string;
  };
  verify?: {
    commands?: VerifyCommandConfig[];
    profiles?: Record<string, VerifyProfileConfig>;
    defaultProfile?: string;
    mode?: "record-only" | "execute";
    timeoutMs?: number;
    maxOutputBytes?: number;
  };
}

export type VerifyCommandConfig =
  | string
  | {
      command: string;
      args?: string[];
      label?: string;
    };

export interface VerifyProfileConfig {
  commands?: VerifyCommandConfig[];
  mode?: "record-only" | "execute";
  timeoutMs?: number;
  maxOutputBytes?: number;
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

function isVerifyMode(value: unknown): value is "record-only" | "execute" {
  return value === "record-only" || value === "execute";
}

function validatePositiveInteger(value: unknown, fieldName: string, issues: string[]): void {
  if (
    value !== undefined &&
    (typeof value !== "number" || !Number.isInteger(value) || value <= 0)
  ) {
    issues.push(`${fieldName} must be a positive integer`);
  }
}

function validateVerifyCommand(value: unknown, fieldName: string, issues: string[]): void {
  if (typeof value === "string") {
    return;
  }

  if (!isRecord(value)) {
    issues.push(`${fieldName} must be a string or command object`);
    return;
  }

  if (typeof value.command !== "string") {
    issues.push(`${fieldName}.command must be a string`);
  }

  if (
    value.args !== undefined &&
    (!Array.isArray(value.args) || value.args.some((arg) => typeof arg !== "string"))
  ) {
    issues.push(`${fieldName}.args must be an array of strings`);
  }

  if (value.label !== undefined && typeof value.label !== "string") {
    issues.push(`${fieldName}.label must be a string`);
  }
}

function validateVerifyCommands(value: unknown, fieldName: string, issues: string[]): void {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value)) {
    issues.push(`${fieldName} must be an array`);
    return;
  }

  for (const [index, command] of value.entries()) {
    validateVerifyCommand(command, `${fieldName}[${index}]`, issues);
  }
}

function validateVerifyProfile(value: unknown, fieldName: string, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push(`${fieldName} must be an object`);
    return;
  }

  validateVerifyCommands(value.commands, `${fieldName}.commands`, issues);

  if (value.mode !== undefined && !isVerifyMode(value.mode)) {
    issues.push(`${fieldName}.mode must be record-only or execute`);
  }

  validatePositiveInteger(value.timeoutMs, `${fieldName}.timeoutMs`, issues);
  validatePositiveInteger(value.maxOutputBytes, `${fieldName}.maxOutputBytes`, issues);
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
    } else {
      validateVerifyCommands(value.verify.commands, "verify.commands", issues);

      if (
        value.verify.defaultProfile !== undefined &&
        typeof value.verify.defaultProfile !== "string"
      ) {
        issues.push("verify.defaultProfile must be a string");
      }

      if (value.verify.mode !== undefined && !isVerifyMode(value.verify.mode)) {
        issues.push("verify.mode must be record-only or execute");
      }

      validatePositiveInteger(value.verify.timeoutMs, "verify.timeoutMs", issues);
      validatePositiveInteger(value.verify.maxOutputBytes, "verify.maxOutputBytes", issues);

      if (value.verify.profiles !== undefined) {
        if (!isRecord(value.verify.profiles)) {
          issues.push("verify.profiles must be an object");
        } else {
          for (const [profileName, profile] of Object.entries(value.verify.profiles)) {
            validateVerifyProfile(profile, `verify.profiles.${profileName}`, issues);
          }

          if (
            typeof value.verify.defaultProfile === "string" &&
            value.verify.profiles[value.verify.defaultProfile] === undefined
          ) {
            issues.push("verify.defaultProfile must reference a configured profile");
          }
        }
      }
    }
  }

  return issues;
}
