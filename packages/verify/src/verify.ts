import type { ContextPackage } from "../../context/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";

export interface VerifyCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export type VerifyStatus = "ready" | "blocked" | "not-runnable";

export interface VerifyResult {
  profile: string;
  status: VerifyStatus;
  taskId?: string;
  contextStop: boolean;
  configuredCommands: string[];
  executedCommands: string[];
  notRunnableReason?: string;
  checks: VerifyCheck[];
}

export interface BuildVerifyResultInput {
  profile?: string;
  taskContract?: TaskContract | undefined;
  contextPackage?: ContextPackage | undefined;
  configuredCommands?: string[];
}

export function buildVerifyResult(input: BuildVerifyResultInput = {}): VerifyResult {
  const configuredCommands = input.configuredCommands ?? [];
  const contextStop = input.contextPackage?.stop ?? false;
  const checks: VerifyCheck[] = [];

  let status: VerifyStatus = "ready";
  let notRunnableReason: string | undefined;

  if (contextStop) {
    status = "blocked";
    notRunnableReason = input.contextPackage?.stopReason ?? "Context package reports STOP";
    checks.push({
      name: "context-stop",
      status: "fail",
      detail: notRunnableReason,
    });
  } else if (configuredCommands.length === 0) {
    status = "not-runnable";
    notRunnableReason = "No verify commands are configured";
    checks.push({
      name: "configured-commands",
      status: "warn",
      detail: notRunnableReason,
    });
  } else {
    checks.push({
      name: "configured-commands",
      status: "pass",
      detail: `${configuredCommands.length} command(s) configured; P0 records them but does not execute them`,
    });
  }

  const result: VerifyResult = {
    profile: input.profile ?? "generic",
    status,
    contextStop,
    configuredCommands,
    executedCommands: [],
    checks,
  };

  const taskId = input.taskContract?.id ?? input.contextPackage?.taskId;
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
    `Status: ${result.status}`,
    `Profile: ${result.profile}`,
    `Task ID: ${result.taskId ?? "none"}`,
    `Context STOP: ${result.contextStop ? "true" : "false"}`,
    "",
    "## Configured Commands",
    "",
  ];

  lines.push(
    ...(result.configuredCommands.length > 0
      ? result.configuredCommands.map((command) => `- ${command}`)
      : ["- none"]),
  );

  lines.push("", "## Executed Commands", "");
  lines.push(
    ...(result.executedCommands.length > 0
      ? result.executedCommands.map((command) => `- ${command}`)
      : ["- none"]),
  );

  if (result.notRunnableReason) {
    lines.push("", "## Not Runnable Reason", "", result.notRunnableReason);
  }

  lines.push("", "## Checks", "");
  for (const check of result.checks) {
    lines.push(`- ${check.name}: ${check.status} - ${check.detail}`);
  }

  lines.push("");
  return lines.join("\n");
}

export async function runVerify(profile = "generic"): Promise<VerifyResult> {
  return buildVerifyResult({
    profile,
  });
}
