import path from "node:path";

export interface VerifyProfileCommand {
  command: string;
  args: string[];
  label?: string | undefined;
}

export interface VerifyCommandPolicyResult {
  allowed: boolean;
  reason?: string | undefined;
}

const blockedShellTokens = ["&&", "||", ";", "|", ">", "<"];

function hasShellSyntax(value: string): boolean {
  return blockedShellTokens.some((token) => value.includes(token));
}

function isSafeRelativeNodePath(filePath: string): boolean {
  return (
    filePath.length > 0 &&
    !path.isAbsolute(filePath) &&
    !filePath.startsWith("-") &&
    !filePath.split(/[\\/]+/).includes("..") &&
    /^[A-Za-z0-9._/-]+$/.test(filePath) &&
    /\.(cjs|js|mjs|ts)$/.test(filePath)
  );
}

function commandText(command: VerifyProfileCommand): string {
  return [command.command, ...command.args].join(" ");
}

export function verifyCommandText(command: VerifyProfileCommand): string {
  return commandText(command);
}

export function verifyCommandPolicy(command: VerifyProfileCommand): VerifyCommandPolicyResult {
  const tokens = [command.command, ...command.args];

  if (tokens.some(hasShellSyntax)) {
    return { allowed: false, reason: "shell syntax is not allowed" };
  }

  if (command.command === "rm") {
    return { allowed: false, reason: "`rm` is not allowed" };
  }

  if (command.command === "scp") {
    return { allowed: false, reason: "`scp` is not allowed" };
  }

  if (command.command === "git" && command.args[0] === "reset" && command.args[1] === "--hard") {
    return { allowed: false, reason: "`git reset --hard` is not allowed" };
  }

  if (command.command === "git" && command.args[0] === "clean") {
    return { allowed: false, reason: "`git clean` is not allowed" };
  }

  if (command.command === "curl" || command.command === "wget") {
    return { allowed: false, reason: "`curl` and `wget` are not allowed in verify profiles" };
  }

  if (
    command.command === "pnpm" &&
    command.args.length === 1 &&
    ["lint", "typecheck", "test"].includes(command.args[0] ?? "")
  ) {
    return { allowed: true };
  }

  if (
    command.command === "npm" &&
    (command.args.join(" ") === "test" || command.args.join(" ") === "run test")
  ) {
    return { allowed: true };
  }

  if (
    command.command === "node" &&
    command.args.length === 1 &&
    isSafeRelativeNodePath(command.args[0] ?? "")
  ) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: `unknown verify command: ${commandText(command)}`,
  };
}

export function parseVerifyCommandString(value: string): VerifyProfileCommand {
  const normalized = value.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return { command: "", args: [] };
  }

  const [command = "", ...args] = normalized.split(" ");
  return { command, args };
}
