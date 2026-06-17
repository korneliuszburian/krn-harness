import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../../../config/src/index.js";
import { pathExists } from "../../../core/src/index.js";
import {
  resolveVerifyProfile,
  verifyCommandPolicy,
  verifyCommandText,
} from "../../../verify/src/index.js";
import { writeCurrentJson, writeCurrentMarkdown } from "../current-state.js";
import { renderConfig } from "../install-lifecycle.js";
import type { CliRuntime } from "../runtime.js";
import {
  applyRuntimeLayout,
  guardWritableRuntimeDir,
  resolveCliRuntimeLayout,
} from "../runtime-layout.js";

type ConfigStatus = "pass" | "warn" | "fail" | "blocked";

interface ConfigCheck {
  name: string;
  status: ConfigStatus;
  detail: string;
}

interface ConfigDoctorResult {
  schema: "krn-config-doctor-v1";
  generatedAt: string;
  status: ConfigStatus;
  source: "file" | "default" | "invalid";
  path?: string | undefined;
  profileName?: string | undefined;
  checks: ConfigCheck[];
  commands: Array<{
    command: string;
    allowed: boolean;
    reason?: string | undefined;
  }>;
  nextActions: string[];
}

interface ConfigInitResult {
  schema: "krn-config-init-result-v1";
  generatedAt: string;
  dryRun: boolean;
  write: boolean;
  status: "planned" | "written" | "blocked";
  path: string;
  profile: "minimal" | "readonly-python" | "node-test" | "quality";
  config: unknown;
  nextActions: string[];
}

function aggregateStatus(checks: ConfigCheck[]): ConfigStatus {
  if (checks.some((check) => check.status === "fail")) return "fail";
  if (checks.some((check) => check.status === "blocked")) return "blocked";
  if (checks.some((check) => check.status === "warn")) return "warn";
  return "pass";
}

function renderDoctorMarkdown(result: ConfigDoctorResult): string {
  return [
    "# KRN Config Doctor",
    "",
    `Status: ${result.status}`,
    `Source: ${result.source}`,
    `Path: ${result.path ?? "none"}`,
    `Profile: ${result.profileName ?? "none"}`,
    "",
    "## Checks",
    "",
    "| Check | Status | Detail |",
    "| --- | --- | --- |",
    ...result.checks.map(
      (check) => `| ${check.name} | ${check.status} | ${check.detail.replaceAll("|", "\\|")} |`,
    ),
    "",
    "## Commands",
    "",
    ...(result.commands.length > 0
      ? result.commands.map(
          (command) =>
            `- ${command.allowed ? "allowed" : "blocked"} ${command.command}${command.reason ? `: ${command.reason}` : ""}`,
        )
      : ["- none"]),
    "",
    "## Next Actions",
    "",
    ...(result.nextActions.length > 0 ? result.nextActions.map((item) => `- ${item}`) : ["- none"]),
    "",
  ].join("\n");
}

async function buildConfigDoctor(runtime: CliRuntime): Promise<ConfigDoctorResult> {
  const generatedAt = (runtime.now?.() ?? new Date()).toISOString();
  const checks: ConfigCheck[] = [];

  try {
    const loaded = await loadConfig(runtime.cwd);
    checks.push({
      name: "config-load",
      status: loaded.source === "file" ? "pass" : "warn",
      detail:
        loaded.source === "file"
          ? "krn.config.json loaded"
          : "No krn.config.json found; using default config",
    });

    const resolved = resolveVerifyProfile(loaded.config.verify);
    if (resolved.issue) {
      checks.push({
        name: "verify-profile",
        status: "fail",
        detail: resolved.issue,
      });
    } else if (resolved.profile.commands.length === 0) {
      checks.push({
        name: "verify-profile",
        status: "warn",
        detail: "Verify profile has no configured commands",
      });
    } else {
      checks.push({
        name: "verify-profile",
        status: "pass",
        detail: `Verify profile ${resolved.profile.name} resolved`,
      });
    }

    const commands = resolved.profile.commands.map((command) => {
      const policy = verifyCommandPolicy(command);
      return {
        command: verifyCommandText(command),
        allowed: policy.allowed,
        reason: policy.reason,
      };
    });
    const blocked = commands.filter((command) => !command.allowed);
    if (blocked.length > 0) {
      checks.push({
        name: "verify-command-policy",
        status: "fail",
        detail: `${blocked.length} verify command(s) are blocked by policy`,
      });
    } else if (commands.length > 0) {
      checks.push({
        name: "verify-command-policy",
        status: "pass",
        detail: "All configured verify commands are allowed",
      });
    }

    const status = aggregateStatus(checks);
    return {
      schema: "krn-config-doctor-v1",
      generatedAt,
      status,
      source: loaded.source,
      path: loaded.path,
      profileName: resolved.profile.name,
      checks,
      commands,
      nextActions:
        status === "pass"
          ? []
          : [
              "Run `krn config init --dry-run --profile readonly-python` for a safe starter config.",
              "Run `krn verify` before `krn verify --execute` to inspect policy decisions.",
            ],
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown config error";
    checks.push({
      name: "config-load",
      status: "fail",
      detail,
    });
    return {
      schema: "krn-config-doctor-v1",
      generatedAt,
      status: "fail",
      source: "invalid",
      checks,
      commands: [],
      nextActions: ["Fix krn.config.json, then rerun `krn config doctor`."],
    };
  }
}

async function configDoctorCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const format = args.includes("--json") ? "json" : "markdown";
  if (args.some((arg) => arg !== "--json")) {
    runtime.stderr("KRN config doctor: expected `krn config doctor [--json]`\n");
    return 1;
  }

  const result = await buildConfigDoctor(runtime);
  const writeRuntime =
    result.source === "invalid"
      ? runtime
      : applyRuntimeLayout(runtime, await resolveCliRuntimeLayout(runtime.cwd));
  if (!(await guardWritableRuntimeDir(writeRuntime))) {
    return 1;
  }

  await writeCurrentJson(writeRuntime.cwd, "config-doctor.json", result);
  await writeCurrentMarkdown(writeRuntime.cwd, "config-doctor.md", renderDoctorMarkdown(result));

  if (format === "json") {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return result.status === "fail" || result.status === "blocked" ? 1 : 0;
  }

  runtime.stdout(`KRN config doctor: ${result.status}
result: .krn/current/config-doctor.md
`);
  return result.status === "fail" || result.status === "blocked" ? 1 : 0;
}

function renderInitMarkdown(result: ConfigInitResult): string {
  return [
    "# KRN Config Init",
    "",
    `Status: ${result.status}`,
    `Profile: ${result.profile}`,
    `Path: ${result.path}`,
    `Dry run: ${String(result.dryRun)}`,
    `Write: ${String(result.write)}`,
    "",
    "## Config",
    "",
    "```json",
    JSON.stringify(result.config, null, 2),
    "```",
    "",
    "## Next Actions",
    "",
    ...(result.nextActions.length > 0 ? result.nextActions.map((item) => `- ${item}`) : ["- none"]),
    "",
  ].join("\n");
}

async function configInitCommand(args: string[], runtime: CliRuntime): Promise<number> {
  let dryRun = false;
  let write = false;
  let format: "markdown" | "json" = "markdown";
  let profile: "minimal" | "readonly-python" | "node-test" | "quality" = "minimal";

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }
    if (arg === "--write") {
      write = true;
      continue;
    }
    if (arg === "--json") {
      format = "json";
      continue;
    }
    if (arg === "--profile") {
      const value = args[index + 1];
      if (
        value !== "minimal" &&
        value !== "readonly-python" &&
        value !== "node-test" &&
        value !== "quality"
      ) {
        runtime.stderr(
          "KRN config init: expected --profile minimal|readonly-python|node-test|quality\n",
        );
        return 1;
      }
      profile = value;
      index += 1;
      continue;
    }

    runtime.stderr(
      "KRN config init: expected `krn config init --dry-run|--write [--profile <name>] [--json]`\n",
    );
    return 1;
  }

  if (dryRun === write) {
    runtime.stderr("KRN config init: requires exactly one of --dry-run or --write\n");
    return 1;
  }

  const configPath = path.join(runtime.cwd, "krn.config.json");
  const exists = await pathExists(configPath);
  const config = JSON.parse(renderConfig(profile)) as unknown;
  const blocked = write && exists;
  const result: ConfigInitResult = {
    schema: "krn-config-init-result-v1",
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    dryRun,
    write,
    status: blocked ? "blocked" : write ? "written" : "planned",
    path: "krn.config.json",
    profile,
    config,
    nextActions: blocked
      ? ["Existing krn.config.json preserved; review it or move it before init."]
      : ["Run `krn config doctor` before `krn verify --execute`."],
  };

  if (write && !blocked) {
    await mkdir(path.dirname(configPath), { recursive: true });
    await writeFile(configPath, renderConfig(profile), "utf8");
    await writeCurrentJson(runtime.cwd, "config-init-result.json", result);
    await writeCurrentMarkdown(runtime.cwd, "config-init-result.md", renderInitMarkdown(result));
  }

  if (format === "json") {
    runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);
    return blocked ? 1 : 0;
  }

  runtime.stdout(`KRN config init: ${result.status}
profile: ${result.profile}
path: ${result.path}
`);
  return blocked ? 1 : 0;
}

export async function configCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const [command, ...rest] = args;

  if (command === "doctor") {
    return configDoctorCommand(rest, runtime);
  }

  if (command === "init") {
    return configInitCommand(rest, runtime);
  }

  runtime.stderr(
    "KRN config: expected `krn config doctor [--json]` or `krn config init --dry-run|--write [--profile <name>] [--json]`\n",
  );
  return 1;
}
