import { access } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../../../config/src/index.js";
import {
  buildVerifyResult,
  renderVerifyResultMarkdown,
  resolveVerifyProfile,
} from "../../../verify/src/index.js";
import {
  readCurrentContextPackage,
  readCurrentTaskContract,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "../current-state.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function parseVerifyArgs(args: string[]): { profileName?: string | undefined; error?: string } {
  if (args.length === 0) {
    return {};
  }

  if (args[0] === "--profile" && args[1] && args.length === 2) {
    return { profileName: args[1] };
  }

  return { error: "KRN verify: expected `krn verify [--profile <name>]`" };
}

export async function verifyCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const parsedArgs = parseVerifyArgs(args);
  if (parsedArgs.error) {
    runtime.stderr(`${parsedArgs.error}\n`);
    return 1;
  }

  const [taskContract, contextPackage, loadedConfig] = await Promise.all([
    readCurrentTaskContract(runtime.cwd),
    readCurrentContextPackage(runtime.cwd),
    loadConfig(runtime.cwd),
  ]);
  const resolvedProfile = resolveVerifyProfile(loadedConfig.config.verify, parsedArgs.profileName);
  const result = buildVerifyResult({
    taskContract,
    contextPackage,
    profile: resolvedProfile.profile,
    profileIssue: resolvedProfile.issue,
    configSource: loadedConfig.source,
    generatedAt: (runtime.now?.() ?? new Date()).toISOString(),
    graphArtifactPresent: await pathExists(
      path.join(runtime.cwd, ".krn", "graph", "repo-graph.json"),
    ),
    currentRunTracePresent: await pathExists(
      path.join(
        runtime.cwd,
        ".krn",
        "runs",
        taskContract?.id ?? contextPackage?.taskId ?? "missing-task",
        "trace.jsonl",
      ),
    ),
  });

  await writeCurrentJson(runtime.cwd, "verify-result.json", result);
  await writeCurrentMarkdown(runtime.cwd, "verify-result.md", renderVerifyResultMarkdown(result));

  await emitCliTrace(runtime, "verify.ran", {
    taskId: result.taskId,
    runScoped: true,
    data: {
      profileName: result.profileName,
      mode: result.mode,
      status: result.status,
      contextStop: result.contextStop,
      graphArtifactPresent: result.graphArtifactPresent,
      currentRunTracePresent: result.currentRunTracePresent,
      totalCommands: result.summary.totalCommands,
      allowedCommands: result.summary.allowedCommands,
      blockedCommands: result.summary.blockedCommands,
      executedCommands: result.summary.executedCommands,
    },
  });

  runtime.stdout(`KRN verify: ${result.status}
profile: ${result.profileName}
mode: ${result.mode}
commands: ${result.summary.totalCommands}
result: .krn/current/verify-result.md
`);

  return 0;
}
