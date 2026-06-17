#!/usr/bin/env tsx

import path from "node:path";
import { fileURLToPath } from "node:url";
import { artifactsCommand } from "./commands/artifacts.js";
import { configCommand } from "./commands/config.js";
import { contextCommand } from "./commands/context.js";
import { doctorCommand } from "./commands/doctor.js";
import { evalCommand } from "./commands/eval.js";
import { graphCommand } from "./commands/graph.js";
import { handoffCommand } from "./commands/handoff.js";
import { hookCommand } from "./commands/hook.js";
import { installCommand } from "./commands/install.js";
import { memoryCommand } from "./commands/memory.js";
import { releaseCheckCommand } from "./commands/release-check.js";
import { reportCommand } from "./commands/report.js";
import { reviewCommand } from "./commands/review.js";
import { runCommand } from "./commands/run.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { summaryCommand } from "./commands/summary.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { verifyCommand } from "./commands/verify.js";
import { type CliRuntime, defaultRuntime } from "./runtime.js";
import {
  applyRuntimeLayout,
  guardWritableRuntimeDir,
  resolveCliRuntimeLayout,
} from "./runtime-layout.js";

export const helpText = `KRN Harness CLI

Usage:
  krn --help
  krn run --task "<task>" [--dry-run] [--json] [--execute-verify] [--bundle]
  krn run --task-spec <json> [--execute-verify] [--bundle]

Advanced plumbing / troubleshooting:
  krn status
  krn start "<task>"
  krn start --task-spec <json>
  krn graph
  krn context
  krn verify [--profile <name>] [--execute]
  krn handoff
  krn doctor
  krn doctor cli
  krn eval
  krn install
  krn install --dry-run
  krn uninstall --dry-run
  krn config <command>
  krn summary
  krn review
  krn report
  krn release-check
  krn artifacts <command>
  krn memory <command>
  krn hook codex <event>
`;

export async function runCli(
  argv: string[],
  runtime: CliRuntime = defaultRuntime(),
): Promise<number> {
  const [command, ...rest] = argv;

  if (!command || command === "--help" || command === "-h" || command === "help") {
    runtime.stdout(helpText);
    return 0;
  }

  let commandRuntime = runtime;
  if (command !== "config") {
    try {
      commandRuntime = applyRuntimeLayout(runtime, await resolveCliRuntimeLayout(runtime.cwd));
    } catch (error) {
      runtime.stderr(`KRN config: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }

  const writeProducingCommands = new Set([
    "run",
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
    "summary",
    "review",
    "report",
    "release-check",
    "artifacts",
    "memory",
    "hook",
  ]);

  if (writeProducingCommands.has(command) && !(await guardWritableRuntimeDir(commandRuntime))) {
    return 1;
  }

  if (command === "status") {
    return statusCommand(commandRuntime);
  }

  if (command === "run") {
    return runCommand(rest, commandRuntime);
  }

  if (command === "start") {
    return startCommand(rest, commandRuntime);
  }

  if (command === "graph") {
    return graphCommand(commandRuntime);
  }

  if (command === "context") {
    return contextCommand(commandRuntime);
  }

  if (command === "verify") {
    return verifyCommand(rest, commandRuntime);
  }

  if (command === "handoff") {
    return handoffCommand(commandRuntime);
  }

  if (command === "doctor") {
    return doctorCommand(rest, commandRuntime);
  }

  if (command === "eval") {
    return evalCommand(commandRuntime);
  }

  if (command === "install") {
    return installCommand(rest, commandRuntime);
  }

  if (command === "uninstall") {
    return uninstallCommand(rest, commandRuntime);
  }

  if (command === "config") {
    return configCommand(rest, runtime);
  }

  if (command === "summary") {
    return summaryCommand(rest, commandRuntime);
  }

  if (command === "review") {
    return reviewCommand(rest, commandRuntime);
  }

  if (command === "report") {
    return reportCommand(rest, commandRuntime);
  }

  if (command === "release-check") {
    return releaseCheckCommand(rest, commandRuntime);
  }

  if (command === "artifacts") {
    return artifactsCommand(rest, commandRuntime);
  }

  if (command === "memory") {
    return memoryCommand(rest, commandRuntime);
  }

  if (command === "hook") {
    return hookCommand(rest, commandRuntime);
  }

  runtime.stderr(`Unknown command: ${command}\n`);
  runtime.stdout(helpText);
  return 1;
}

const entrypointPath = fileURLToPath(import.meta.url);
const argvPath = process.argv[1] ? path.resolve(process.argv[1]) : undefined;
const isEntrypoint =
  argvPath === entrypointPath || argvPath?.endsWith("packages/cli/src/index.ts") === true;

if (isEntrypoint) {
  const code = await runCli(process.argv.slice(2));
  process.exitCode = code;
}
