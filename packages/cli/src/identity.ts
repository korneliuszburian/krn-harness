import path from "node:path";
import { fileURLToPath } from "node:url";
import type { CliRuntime } from "./runtime.js";

export const cliIdentitySchema = "krn-harness-cli-identity-v1";
export const cliPackageName = "@krn-harness/cli";
export const cliPackageVersion = "0.0.0";

export const supportedCliCommands = [
  "status",
  "start",
  "graph",
  "context",
  "verify",
  "handoff",
  "doctor",
  "eval",
  "install",
  "uninstall",
  "config",
  "summary",
  "review",
  "report",
  "release-check",
  "artifacts",
  "memory",
  "hook",
] as const;

export const requiredDogfoodCommands = [
  "status",
  "start",
  "graph",
  "context",
  "verify",
  "handoff",
] as const;

export interface CliIdentity {
  schema: typeof cliIdentitySchema;
  product: "KRN Harness CLI";
  packageName: typeof cliPackageName;
  version: typeof cliPackageVersion;
  commandPath: string;
  binWrapperPath: string;
  sourceRootPath: string;
  runtimeCwd: string;
  runtimeDir: ".krn";
  writesRuntimeToCwd: true;
  supportedCommands: string[];
  requiredCommandsPresent: boolean;
}

function defaultSourceRootPath(): string {
  const sourceFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(sourceFile), "../../..");
}

export function buildCliIdentity(runtime: CliRuntime): CliIdentity {
  const commandPath = process.env.KRN_HARNESS_BIN_WRAPPER ?? process.argv[1] ?? "unknown";
  const sourceRootPath = process.env.KRN_HARNESS_SOURCE_ROOT ?? defaultSourceRootPath();
  const requiredCommandsPresent = requiredDogfoodCommands.every((command) =>
    supportedCliCommands.includes(command),
  );

  return {
    schema: cliIdentitySchema,
    product: "KRN Harness CLI",
    packageName: cliPackageName,
    version: cliPackageVersion,
    commandPath,
    binWrapperPath: process.env.KRN_HARNESS_BIN_WRAPPER ?? "unknown",
    sourceRootPath,
    runtimeCwd: runtime.cwd,
    runtimeDir: ".krn",
    writesRuntimeToCwd: true,
    supportedCommands: [...supportedCliCommands],
    requiredCommandsPresent,
  };
}

export function renderCliIdentity(identity: CliIdentity): string {
  return [
    "KRN Harness CLI identity",
    `schema: ${identity.schema}`,
    `package: ${identity.packageName}`,
    `version: ${identity.version}`,
    `command_path: ${identity.commandPath}`,
    `bin_wrapper_path: ${identity.binWrapperPath}`,
    `source_root_path: ${identity.sourceRootPath}`,
    `runtime_cwd: ${identity.runtimeCwd}`,
    `runtime_dir: ${identity.runtimeDir}`,
    `writes_runtime_to_cwd: ${String(identity.writesRuntimeToCwd)}`,
    `supported_commands: ${identity.supportedCommands.join(",")}`,
    `required_commands_present: ${String(identity.requiredCommandsPresent)}`,
    "",
  ].join("\n");
}
