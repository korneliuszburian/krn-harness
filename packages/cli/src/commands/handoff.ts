import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  readCurrentContextPackage,
  readCurrentTaskContract,
  readCurrentVerifyResult,
  writeCurrentMarkdown,
} from "../current-state.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

const execFileAsync = promisify(execFile);

export function parseGitStatusPath(line: string): string | undefined {
  const rawPath = line.slice(3).trim();
  if (!rawPath) {
    return undefined;
  }

  const renameSeparator = " -> ";
  const renameIndex = rawPath.lastIndexOf(renameSeparator);
  if (renameIndex >= 0) {
    return rawPath.slice(renameIndex + renameSeparator.length).trim();
  }

  return rawPath;
}

async function changedFiles(cwd: string): Promise<string[]> {
  try {
    const { stdout } = await execFileAsync("git", ["status", "--short"], { cwd });
    return [
      ...new Set(
        stdout
          .split("\n")
          .map(parseGitStatusPath)
          .filter((file): file is string => Boolean(file)),
      ),
    ].sort();
  } catch {
    return [];
  }
}

function renderHandoffMarkdown(input: {
  taskId?: string | undefined;
  taskSummary: string;
  contextStop: boolean;
  contextStopReason?: string | undefined;
  verifyStatus: string;
  changedFiles: string[];
}): string {
  const lines = [
    "# KRN Handoff",
    "",
    `Task ID: ${input.taskId ?? "none"}`,
    `Task: ${input.taskSummary || "none"}`,
    `Context STOP: ${input.contextStop ? "true" : "false"}`,
  ];

  if (input.contextStopReason) {
    lines.push(`STOP reason: ${input.contextStopReason}`);
  }

  lines.push("", "## Verify", "", `Status: ${input.verifyStatus}`, "", "## Changed Files", "");
  lines.push(
    ...(input.changedFiles.length > 0 ? input.changedFiles.map((file) => `- ${file}`) : ["- none"]),
  );

  lines.push(
    "",
    "## Known Gaps",
    "",
    "- P0 handoff is generated from local current-state artifacts only.",
    "",
    "## Residual Risks",
    "",
    "- Verification commands are recorded, not executed by the P0 verifier.",
    "",
    "## Next Safe Action",
    "",
    "- Review current artifacts, then run configured validation manually if needed.",
    "",
  );

  return lines.join("\n");
}

export async function handoffCommand(runtime: CliRuntime): Promise<number> {
  const [taskContract, contextPackage, verifyResult, files] = await Promise.all([
    readCurrentTaskContract(runtime.cwd),
    readCurrentContextPackage(runtime.cwd),
    readCurrentVerifyResult(runtime.cwd),
    changedFiles(runtime.cwd),
  ]);
  const taskId = taskContract?.id ?? contextPackage?.taskId ?? verifyResult?.taskId;
  const contextStop = contextPackage?.stop ?? false;
  const markdown = renderHandoffMarkdown({
    taskId,
    taskSummary: taskContract?.task ?? "",
    contextStop,
    contextStopReason: contextPackage?.stopReason,
    verifyStatus: verifyResult?.status ?? "missing",
    changedFiles: files,
  });

  await writeCurrentMarkdown(runtime.cwd, "handoff.md", markdown);

  await emitCliTrace(runtime, "handoff.created", {
    taskId,
    runScoped: true,
    data: {
      contextStop,
      verifyStatus: verifyResult?.status ?? "missing",
    },
  });

  runtime.stdout(`KRN handoff: ready
handoff: .krn/current/handoff.md
verify: ${verifyResult?.status ?? "missing"}
`);

  return 0;
}
