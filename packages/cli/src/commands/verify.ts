import { access } from "node:fs/promises";
import path from "node:path";
import { loadConfig } from "../../../config/src/index.js";
import { buildVerifyResult, renderVerifyResultMarkdown } from "../../../verify/src/index.js";
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

export async function verifyCommand(runtime: CliRuntime): Promise<number> {
  const [taskContract, contextPackage, loadedConfig] = await Promise.all([
    readCurrentTaskContract(runtime.cwd),
    readCurrentContextPackage(runtime.cwd),
    loadConfig(runtime.cwd),
  ]);
  const result = buildVerifyResult({
    taskContract,
    contextPackage,
    configuredCommands: loadedConfig.config.verify?.commands ?? [],
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
      profile: result.profile,
      status: result.status,
      contextStop: result.contextStop,
      graphArtifactPresent: result.graphArtifactPresent,
      currentRunTracePresent: result.currentRunTracePresent,
      configuredCommands: result.configuredCommands.length,
    },
  });

  runtime.stdout(`KRN verify: ${result.status}
profile: ${result.profile}
result: .krn/current/verify-result.md
`);

  return 0;
}
