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
      configuredCommands: result.configuredCommands.length,
    },
  });

  runtime.stdout(`KRN verify: ${result.status}
profile: ${result.profile}
result: .krn/current/verify-result.md
`);

  return 0;
}
