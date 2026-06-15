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
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { summaryCommand } from "./commands/summary.js";
import { uninstallCommand } from "./commands/uninstall.js";
import { verifyCommand } from "./commands/verify.js";
import { type CliRuntime, defaultRuntime } from "./runtime.js";

export const helpText = `KRN Harness CLI

Usage:
  krn --help
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

  if (command === "status") {
    return statusCommand(runtime);
  }

  if (command === "start") {
    return startCommand(rest, runtime);
  }

  if (command === "graph") {
    return graphCommand(runtime);
  }

  if (command === "context") {
    return contextCommand(runtime);
  }

  if (command === "verify") {
    return verifyCommand(rest, runtime);
  }

  if (command === "handoff") {
    return handoffCommand(runtime);
  }

  if (command === "doctor") {
    return doctorCommand(rest, runtime);
  }

  if (command === "eval") {
    return evalCommand(runtime);
  }

  if (command === "install") {
    return installCommand(rest, runtime);
  }

  if (command === "uninstall") {
    return uninstallCommand(rest, runtime);
  }

  if (command === "config") {
    return configCommand(rest, runtime);
  }

  if (command === "summary") {
    return summaryCommand(rest, runtime);
  }

  if (command === "review") {
    return reviewCommand(rest, runtime);
  }

  if (command === "report") {
    return reportCommand(rest, runtime);
  }

  if (command === "release-check") {
    return releaseCheckCommand(rest, runtime);
  }

  if (command === "artifacts") {
    return artifactsCommand(rest, runtime);
  }

  if (command === "memory") {
    return memoryCommand(rest, runtime);
  }

  if (command === "hook") {
    return hookCommand(rest, runtime);
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
