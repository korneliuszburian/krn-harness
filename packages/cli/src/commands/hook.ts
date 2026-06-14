import path from "node:path";
import { pathExists } from "../../../core/src/index.js";
import {
  buildHookTracePayload,
  type HookCurrentState,
  handleCodexHook,
  parseCodexHookPayload,
} from "../../../hooks/src/index.js";
import { createTraceEvent, defaultTracePath, writeTraceEvent } from "../../../trace/src/index.js";
import {
  readCurrentContextPackage,
  readCurrentTaskContract,
  readCurrentVerifyResult,
} from "../current-state.js";
import type { CliRuntime } from "../runtime.js";

async function currentHookState(cwd: string): Promise<HookCurrentState> {
  const [taskContract, contextPackage, verifyResult, handoffPresent] = await Promise.all([
    readCurrentTaskContract(cwd),
    readCurrentContextPackage(cwd),
    readCurrentVerifyResult(cwd),
    pathExists(path.join(cwd, ".krn", "current", "handoff.md")),
  ]);

  return {
    taskPresent: Boolean(taskContract),
    contextPresent: Boolean(contextPackage),
    contextStop: contextPackage?.stop ?? false,
    verifyPresent: Boolean(verifyResult),
    handoffPresent,
    taskId: taskContract?.id ?? contextPackage?.taskId ?? verifyResult?.taskId,
    taskText: taskContract?.task,
    contextStopReason: contextPackage?.stopReason,
    writablePaths: [
      ...(contextPackage?.buckets.mustRead.map((item) => item.path) ?? []),
      ...(contextPackage?.buckets.shouldRead.map((item) => item.path) ?? []),
    ],
    doNotUsePaths: contextPackage?.buckets.doNotUse.map((item) => item.path) ?? [],
    missingContextPaths: contextPackage?.buckets.missingContext.map((item) => item.path) ?? [],
    verifyStatus: verifyResult?.status,
  };
}

export async function hookCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const [provider, event] = args;

  if (provider !== "codex" || !event) {
    runtime.stderr("KRN hook: expected `krn hook codex <event>`\n");
    return 1;
  }

  const payload = parseCodexHookPayload(await runtime.stdin?.());
  const result = handleCodexHook(event, {
    payload,
    state: await currentHookState(runtime.cwd),
  });
  await writeTraceEvent(
    createTraceEvent("hook.received", {
      now: runtime.now?.(),
      data: buildHookTracePayload(result),
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);

  return 0;
}
