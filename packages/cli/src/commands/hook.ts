import { access } from "node:fs/promises";
import path from "node:path";
import {
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

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

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
      data: {
        provider: result.provider,
        event: result.event,
        supported: result.supported,
        status: result.status,
        decision: result.decision,
        enforced: result.enforced,
        ownershipModel: result.ownershipModel,
        ownedProofPathHintLimit: result.ownedProofPathHintLimit,
        tracePayloadByteLimit: result.tracePayloadByteLimit,
        ownedProofPathHints: result.ownedProofPathHints,
        payloadSource: result.payloadSource,
        detail: result.detail,
        findingCodes: result.findings.map((finding) => finding.code),
        operatorMessageVersion: result.operatorMessageVersion,
        remediationCodes: result.remediationCodes,
      },
    }),
    runtime.tracePath ?? defaultTracePath(runtime.cwd),
  );

  runtime.stdout(`${JSON.stringify(result, null, 2)}\n`);

  return 0;
}
