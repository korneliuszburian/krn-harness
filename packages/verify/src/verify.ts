import type { ContextPackage } from "../../context/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";
import {
  parseVerifyCommandString,
  type VerifyProfileCommand,
  verifyCommandPolicy,
  verifyCommandText,
} from "./command-policy.js";

export type VerifyMode = "record-only" | "execute";
export type VerifyStatus = "pass" | "warn" | "fail" | "blocked" | "not-runnable";
export type VerifyConfigSource = "file" | "default";

export interface VerifyLimits {
  timeoutMs: number;
  maxOutputBytes: number;
}

export interface VerifyProfile {
  name: string;
  mode: VerifyMode;
  commands: VerifyProfileCommand[];
  limits: VerifyLimits;
}

export interface VerifyConfigCommandObject {
  command: string;
  args?: string[] | undefined;
  label?: string | undefined;
}

export type VerifyConfigCommand = string | VerifyConfigCommandObject;

export interface VerifyConfigProfileInput {
  commands?: VerifyConfigCommand[] | undefined;
  mode?: VerifyMode | undefined;
  timeoutMs?: number | undefined;
  maxOutputBytes?: number | undefined;
}

export interface VerifyConfigInput extends VerifyConfigProfileInput {
  profiles?: Record<string, VerifyConfigProfileInput> | undefined;
  defaultProfile?: string | undefined;
}

export interface ResolvedVerifyProfile {
  profile: VerifyProfile;
  issue?: string | undefined;
}

export interface VerifyCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface VerifyCommandResult {
  command: VerifyProfileCommand;
  commandText: string;
  allowed: boolean;
  status: "recorded" | "blocked" | "not-run";
  reason?: string | undefined;
  exitCode?: number | undefined;
  signal?: string | undefined;
  durationMs?: number | undefined;
  timedOut?: boolean | undefined;
  stdoutTail?: string | undefined;
  stderrTail?: string | undefined;
}

export interface VerifySummary {
  totalCommands: number;
  allowedCommands: number;
  blockedCommands: number;
  executedCommands: number;
}

export interface VerifyResult {
  schemaVersion: 1;
  generatedAt: string;
  profileName: string;
  profile: string;
  mode: VerifyMode;
  status: VerifyStatus;
  summary: VerifySummary;
  configSource: VerifyConfigSource;
  limits: VerifyLimits;
  taskId?: string | undefined;
  contextStop: boolean;
  graphArtifactPresent: boolean;
  currentRunTracePresent: boolean;
  commands: VerifyCommandResult[];
  configuredCommands: string[];
  executedCommands: string[];
  notRunnableReason?: string | undefined;
  checks: VerifyCheck[];
}

export interface BuildVerifyResultInput {
  profile?: VerifyProfile | undefined;
  profileIssue?: string | undefined;
  taskContract?: TaskContract | undefined;
  contextPackage?: ContextPackage | undefined;
  graphArtifactPresent?: boolean | undefined;
  currentRunTracePresent?: boolean | undefined;
  configSource?: VerifyConfigSource | undefined;
  generatedAt?: string | undefined;
}

const defaultVerifyLimits: VerifyLimits = {
  timeoutMs: 120_000,
  maxOutputBytes: 12_000,
};

export const defaultVerifyProfile: VerifyProfile = {
  name: "generic",
  mode: "record-only",
  commands: [],
  limits: defaultVerifyLimits,
};

function normalizeLimits(input: VerifyConfigProfileInput | undefined): VerifyLimits {
  return {
    timeoutMs: input?.timeoutMs ?? defaultVerifyLimits.timeoutMs,
    maxOutputBytes: input?.maxOutputBytes ?? defaultVerifyLimits.maxOutputBytes,
  };
}

function normalizeCommand(input: VerifyConfigCommand): VerifyProfileCommand {
  if (typeof input === "string") {
    return parseVerifyCommandString(input);
  }

  return {
    command: input.command.trim(),
    args: input.args ?? [],
    label: input.label,
  };
}

function normalizeCommands(input: VerifyConfigCommand[] | undefined): VerifyProfileCommand[] {
  return (input ?? []).map(normalizeCommand);
}

export function resolveVerifyProfile(
  config: VerifyConfigInput | undefined,
  requestedProfileName?: string | undefined,
): ResolvedVerifyProfile {
  if (!config) {
    if (requestedProfileName && requestedProfileName !== "generic") {
      return {
        profile: {
          ...defaultVerifyProfile,
          name: requestedProfileName,
        },
        issue: `Unknown verify profile: ${requestedProfileName}`,
      };
    }

    return { profile: defaultVerifyProfile };
  }

  const defaultProfileName = config?.defaultProfile ?? (config?.commands ? "default" : "generic");
  const profileName = requestedProfileName ?? defaultProfileName;
  const profileConfig =
    profileName === "default" && config?.commands
      ? config
      : (config?.profiles?.[profileName] ?? (profileName === "generic" ? config : undefined));

  if (!profileConfig) {
    return {
      profile: {
        ...defaultVerifyProfile,
        name: profileName,
      },
      issue: `Unknown verify profile: ${profileName}`,
    };
  }

  return {
    profile: {
      name: profileName,
      mode: profileConfig.mode ?? config?.mode ?? "record-only",
      commands: normalizeCommands(profileConfig.commands),
      limits: normalizeLimits({
        timeoutMs: profileConfig.timeoutMs ?? config?.timeoutMs,
        maxOutputBytes: profileConfig.maxOutputBytes ?? config?.maxOutputBytes,
      }),
    },
  };
}

function commandResultsFor(profile: VerifyProfile): VerifyCommandResult[] {
  return profile.commands.map((command) => {
    const policy = verifyCommandPolicy(command);

    return {
      command,
      commandText: verifyCommandText(command),
      allowed: policy.allowed,
      status: policy.allowed ? "recorded" : "blocked",
      reason: policy.reason,
    };
  });
}

export function buildVerifyResult(input: BuildVerifyResultInput = {}): VerifyResult {
  const profile = input.profile ?? defaultVerifyProfile;
  const contextStop = input.contextPackage?.stop ?? false;
  const commands = commandResultsFor(profile);
  const blockedCommands = commands.filter((command) => !command.allowed);
  const checks: VerifyCheck[] = [];

  let status: VerifyStatus = "warn";
  let notRunnableReason: string | undefined;

  if (input.profileIssue) {
    status = "blocked";
    notRunnableReason = input.profileIssue;
    checks.push({
      name: "verify-profile",
      status: "fail",
      detail: input.profileIssue,
    });
  } else {
    checks.push({
      name: "verify-profile",
      status: "pass",
      detail: `Profile ${profile.name} resolved in ${profile.mode} mode`,
    });
  }

  if (contextStop) {
    status = "blocked";
    notRunnableReason = input.contextPackage?.stopReason ?? "Context package reports STOP";
    checks.push({
      name: "context-stop",
      status: "fail",
      detail: notRunnableReason,
    });
  }

  if (profile.commands.length === 0 && !contextStop && !input.profileIssue) {
    status = "not-runnable";
    notRunnableReason = "No verify commands are configured";
    checks.push({
      name: "configured-commands",
      status: "warn",
      detail: notRunnableReason,
    });
  } else if (blockedCommands.length > 0) {
    status = "blocked";
    notRunnableReason = `Blocked verify command(s): ${blockedCommands
      .map((command) => `${command.commandText} (${command.reason ?? "not allowed"})`)
      .join(", ")}`;
    checks.push({
      name: "configured-commands",
      status: "fail",
      detail: notRunnableReason,
    });
  } else if (profile.commands.length > 0) {
    checks.push({
      name: "configured-commands",
      status: "pass",
      detail: `${profile.commands.length} command(s) configured and allowed; ${profile.mode} mode does not execute commands yet`,
    });
  }

  if (profile.mode === "execute" && status !== "blocked") {
    status = "not-runnable";
    notRunnableReason = "Execute mode is configured, but the execution engine is not implemented";
    checks.push({
      name: "execution-engine",
      status: "warn",
      detail: notRunnableReason,
    });
  }

  if (input.graphArtifactPresent !== undefined) {
    checks.push({
      name: "graph-artifact",
      status: input.graphArtifactPresent ? "pass" : "warn",
      detail: input.graphArtifactPresent
        ? ".krn/graph/repo-graph.json is present"
        : ".krn/graph/repo-graph.json is missing",
    });
  }

  if (input.currentRunTracePresent !== undefined) {
    checks.push({
      name: "current-run-trace",
      status: input.currentRunTracePresent ? "pass" : "warn",
      detail: input.currentRunTracePresent
        ? "Current run trace is present"
        : "Current run trace is missing",
    });
  }

  const summary = {
    totalCommands: commands.length,
    allowedCommands: commands.filter((command) => command.allowed).length,
    blockedCommands: blockedCommands.length,
    executedCommands: 0,
  };
  const taskId = input.taskContract?.id ?? input.contextPackage?.taskId;
  const result: VerifyResult = {
    schemaVersion: 1,
    generatedAt: input.generatedAt ?? new Date(0).toISOString(),
    profileName: profile.name,
    profile: profile.name,
    mode: profile.mode,
    status,
    summary,
    configSource: input.configSource ?? "default",
    limits: profile.limits,
    contextStop,
    graphArtifactPresent: input.graphArtifactPresent ?? false,
    currentRunTracePresent: input.currentRunTracePresent ?? false,
    commands,
    configuredCommands: commands.map((command) => command.commandText),
    executedCommands: [],
    checks,
  };

  if (taskId) {
    result.taskId = taskId;
  }

  if (notRunnableReason) {
    result.notRunnableReason = notRunnableReason;
  }

  return result;
}

export function renderVerifyResultMarkdown(result: VerifyResult): string {
  const lines = [
    "# KRN Verify Result",
    "",
    "## Summary",
    "",
    `Status: ${result.status}`,
    `Task ID: ${result.taskId ?? "none"}`,
    `Generated at: ${result.generatedAt}`,
    `Total commands: ${result.summary.totalCommands}`,
    `Allowed commands: ${result.summary.allowedCommands}`,
    `Blocked commands: ${result.summary.blockedCommands}`,
    `Executed commands: ${result.summary.executedCommands}`,
    "",
    "## Profile",
    "",
    `Name: ${result.profileName}`,
    `Config source: ${result.configSource}`,
    "",
    "## Mode",
    "",
    `Mode: ${result.mode}`,
    "",
    "## Limits",
    "",
    `Timeout: ${result.limits.timeoutMs}ms`,
    `Max output bytes: ${result.limits.maxOutputBytes}`,
    "",
    "## Context STOP",
    "",
    `Active: ${result.contextStop ? "true" : "false"}`,
    "",
    "## Commands",
    "",
  ];

  lines.push(
    ...(result.commands.length > 0
      ? result.commands.map(
          (command) =>
            `- ${command.commandText}: ${command.status}${command.reason ? ` - ${command.reason}` : ""}`,
        )
      : ["- none"]),
  );

  lines.push("", "## Results", "");
  lines.push(
    ...(result.commands.length > 0
      ? result.commands.map((command) => `- ${command.commandText}: ${command.status}`)
      : ["- none"]),
  );

  if (result.notRunnableReason) {
    lines.push("", "## Not Runnable Reason", "", result.notRunnableReason);
  }

  lines.push("", "## Checks", "");
  for (const check of result.checks) {
    lines.push(`- ${check.name}: ${check.status} - ${check.detail}`);
  }

  lines.push("", "## Next Actions", "");
  if (result.status === "not-runnable") {
    lines.push("- Configure an allowed verify profile or keep the explicit not-runnable evidence.");
  } else if (result.status === "blocked") {
    lines.push("- Resolve blocked verify checks before claiming completion.");
  } else {
    lines.push("- Review verify evidence before handoff.");
  }

  lines.push("");
  return lines.join("\n");
}

export async function runVerify(profileName = "generic"): Promise<VerifyResult> {
  const resolved = resolveVerifyProfile(undefined, profileName);

  return buildVerifyResult({
    profile: resolved.profile,
    profileIssue: resolved.issue,
  });
}
