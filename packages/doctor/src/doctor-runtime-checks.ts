import { readFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../../config/src/index.js";
import { pathExists } from "../../core/src/index.js";
import {
  resolveVerifyProfile,
  type VerifyCommandResult,
  verifyCommandPolicy,
  verifyCommandText,
} from "../../verify/src/index.js";
import { isRecord, parseJsonFile, readJson } from "./doctor-json.js";
import type { DoctorCheck } from "./doctor-types.js";

function isCurrentRunPointer(value: unknown): value is {
  schemaVersion: number;
  taskId: string;
  runDir: string;
  tracePath: string;
  taskContractPath: string;
  contextPackagePath: string;
  graphArtifactPath: string;
  verifyResultPath: string;
  handoffPath: string;
  doctorResultPath: string;
  evalResultPath: string;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const stringKeys = [
    "taskId",
    "runDir",
    "tracePath",
    "taskContractPath",
    "contextPackagePath",
    "graphArtifactPath",
    "verifyResultPath",
    "handoffPath",
    "doctorResultPath",
    "evalResultPath",
  ];

  return (
    candidate.schemaVersion === 1 && stringKeys.every((key) => typeof candidate[key] === "string")
  );
}

function isRunMetadata(value: unknown, taskId: string): boolean {
  return (
    isRecord(value) &&
    value.schemaVersion === 1 &&
    value.taskId === taskId &&
    typeof value.startedAt === "string" &&
    typeof value.lastEventAt === "string" &&
    Array.isArray(value.events) &&
    isRecord(value.artifactPaths) &&
    value.current === true
  );
}

export async function currentRunCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/current/run.json";
  const filePath = path.join(cwd, relativePath);

  if (!(await pathExists(filePath))) {
    return {
      name: "current-run",
      status: "warn",
      detail: `${relativePath} is missing`,
    };
  }

  let pointer: unknown;
  try {
    pointer = JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch {
    return {
      name: "current-run",
      status: "fail",
      detail: `${relativePath} is malformed`,
    };
  }

  if (!isCurrentRunPointer(pointer)) {
    return {
      name: "current-run",
      status: "fail",
      detail: `${relativePath} is incomplete`,
    };
  }

  const taskContract = await readJson<{ id?: string }>(
    path.join(cwd, ".krn", "current", "task-contract.json"),
  );

  if (taskContract?.id && pointer.taskId !== taskContract.id) {
    return {
      name: "current-run",
      status: "fail",
      detail: `${relativePath} taskId does not match current task contract`,
    };
  }

  return {
    name: "current-run",
    status: "pass",
    detail: `${relativePath} points to ${pointer.runDir}`,
  };
}

export async function runTraceCheck(cwd: string): Promise<DoctorCheck> {
  const taskContract = await readJson<{ id?: string }>(
    path.join(cwd, ".krn", "current", "task-contract.json"),
  );

  if (!taskContract?.id) {
    return {
      name: "run-trace",
      status: "pass",
      detail: "No current task; run trace check skipped",
    };
  }

  const traceRelativePath = `.krn/runs/${taskContract.id}/trace.jsonl`;
  const metadataRelativePath = `.krn/runs/${taskContract.id}/run.json`;
  const parsedMetadata = await parseJsonFile(path.join(cwd, metadataRelativePath));

  if (parsedMetadata.status === "malformed") {
    return {
      name: "run-trace",
      status: "fail",
      detail: `${metadataRelativePath} is malformed`,
    };
  }

  if (parsedMetadata.status === "parsed" && !isRunMetadata(parsedMetadata.value, taskContract.id)) {
    return {
      name: "run-trace",
      status: "fail",
      detail: `${metadataRelativePath} is incomplete`,
    };
  }

  if (!(await pathExists(path.join(cwd, traceRelativePath)))) {
    return {
      name: "run-trace",
      status: "warn",
      detail: `${traceRelativePath} is missing`,
    };
  }

  if (parsedMetadata.status === "missing") {
    return {
      name: "run-trace",
      status: "warn",
      detail: `${metadataRelativePath} is missing`,
    };
  }

  return {
    name: "run-trace",
    status: "pass",
    detail: `${traceRelativePath} is present`,
  };
}

export async function configCheck(cwd: string): Promise<DoctorCheck> {
  try {
    const loaded = await loadConfig(cwd);
    return {
      name: "config",
      status: loaded.source === "file" ? "pass" : "warn",
      detail:
        loaded.source === "file"
          ? `${path.relative(cwd, loaded.path ?? "krn.config.json")} is valid`
          : "krn.config.json is missing; default config is active",
    };
  } catch (error) {
    return {
      name: "config",
      status: "fail",
      detail: error instanceof Error ? error.message : "krn.config.json is invalid",
    };
  }
}

export async function verifyConfigPolicyCheck(cwd: string): Promise<DoctorCheck> {
  try {
    const loaded = await loadConfig(cwd);
    const profiles = loaded.config.verify?.profiles;
    const profileNames = profiles
      ? Object.keys(profiles).sort((left, right) => left.localeCompare(right))
      : [loaded.config.verify?.commands ? "default" : "generic"];
    const failures: string[] = [];
    let commandCount = 0;

    for (const profileName of profileNames) {
      const resolved = resolveVerifyProfile(loaded.config.verify, profileName);

      if (resolved.issue) {
        failures.push(resolved.issue);
        continue;
      }

      for (const command of resolved.profile.commands) {
        commandCount += 1;
        const policy = verifyCommandPolicy(command);

        if (!policy.allowed) {
          failures.push(
            `${profileName}: ${verifyCommandText(command)} - ${policy.reason ?? "not allowed"}`,
          );
        }
      }
    }

    if (failures.length > 0) {
      return {
        name: "verify-config-policy",
        status: "fail",
        detail: `Disallowed verify command(s): ${failures.join("; ")}`,
      };
    }

    return {
      name: "verify-config-policy",
      status: "pass",
      detail:
        commandCount === 0
          ? "No verify commands configured; policy check skipped"
          : `${commandCount} verify command(s) pass policy`,
    };
  } catch (error) {
    return {
      name: "verify-config-policy",
      status: "fail",
      detail: error instanceof Error ? error.message : "Verify config policy check failed",
    };
  }
}

function isVerifyCommandResult(value: unknown): value is VerifyCommandResult {
  return (
    isRecord(value) &&
    isRecord(value.command) &&
    typeof value.command.command === "string" &&
    Array.isArray(value.command.args) &&
    value.command.args.every((arg) => typeof arg === "string") &&
    typeof value.commandText === "string" &&
    typeof value.allowed === "boolean" &&
    typeof value.status === "string"
  );
}

export async function currentVerifyResultCheck(cwd: string): Promise<DoctorCheck> {
  const relativePath = ".krn/current/verify-result.json";
  const parsed = await parseJsonFile(path.join(cwd, relativePath));

  if (parsed.status === "missing") {
    return {
      name: "current-verify-result",
      status: "warn",
      detail: `${relativePath} is missing`,
    };
  }

  if (parsed.status === "malformed") {
    return {
      name: "current-verify-result",
      status: "fail",
      detail: `${relativePath} is malformed`,
    };
  }

  const value = parsed.value;
  if (
    !isRecord(value) ||
    value.schemaVersion !== 1 ||
    typeof value.generatedAt !== "string" ||
    typeof value.profileName !== "string" ||
    (value.mode !== "record-only" && value.mode !== "execute") ||
    !["pass", "warn", "fail", "blocked", "not-runnable"].includes(String(value.status)) ||
    (value.configSource !== "file" && value.configSource !== "default") ||
    typeof value.contextStop !== "boolean" ||
    !isRecord(value.summary) ||
    typeof value.summary.totalCommands !== "number" ||
    typeof value.summary.allowedCommands !== "number" ||
    typeof value.summary.blockedCommands !== "number" ||
    typeof value.summary.executedCommands !== "number" ||
    !isRecord(value.limits) ||
    typeof value.limits.maxOutputBytes !== "number" ||
    typeof value.limits.timeoutMs !== "number" ||
    !Array.isArray(value.commands) ||
    !value.commands.every(isVerifyCommandResult)
  ) {
    return {
      name: "current-verify-result",
      status: "fail",
      detail: `${relativePath} is missing required verify result fields`,
    };
  }

  const commands = value.commands as VerifyCommandResult[];
  const maxOutputBytes = value.limits.maxOutputBytes;
  const commandWithOversizedOutput = commands.find((command) => {
    const stdoutBytes = Buffer.byteLength(command.stdoutTail ?? "", "utf8");
    const stderrBytes = Buffer.byteLength(command.stderrTail ?? "", "utf8");
    return stdoutBytes + stderrBytes > maxOutputBytes;
  });

  if (commandWithOversizedOutput) {
    return {
      name: "current-verify-result",
      status: "fail",
      detail: `${commandWithOversizedOutput.commandText} output exceeds verify maxOutputBytes`,
    };
  }

  if (
    value.status === "pass" &&
    commands.some((command) => command.status !== "passed" || command.exitCode !== 0)
  ) {
    return {
      name: "current-verify-result",
      status: "fail",
      detail: "Verify result status is pass but at least one command did not pass",
    };
  }

  if (
    value.mode === "execute" &&
    commands.some(
      (command) =>
        (command.status === "passed" || command.status === "failed") &&
        typeof command.exitCode !== "number",
    )
  ) {
    return {
      name: "current-verify-result",
      status: "fail",
      detail: "Executed verify command result is missing exitCode",
    };
  }

  if (value.status === "not-runnable") {
    return {
      name: "current-verify-result",
      status: "warn",
      detail:
        "Current verify result is not-runnable; configure or select a runnable verify profile",
    };
  }

  return {
    name: "current-verify-result",
    status: "pass",
    detail: `${relativePath} is valid with status ${String(value.status)}`,
  };
}
