import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
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

interface GraphSummary {
  status: "present" | "missing";
  nodeCount?: number | undefined;
  edgeCount?: number | undefined;
}

interface CurrentRunSummary {
  status: "present" | "missing";
  tracePath?: string | undefined;
}

interface ArtifactStatusSummary {
  status: string;
}

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

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function graphSummary(cwd: string): Promise<GraphSummary> {
  const graph = await readJson<{ nodeCount?: unknown; edgeCount?: unknown }>(
    path.join(cwd, ".krn", "graph", "repo-graph.json"),
  );

  if (!graph || typeof graph.nodeCount !== "number" || typeof graph.edgeCount !== "number") {
    return { status: "missing" };
  }

  return {
    status: "present",
    nodeCount: graph.nodeCount,
    edgeCount: graph.edgeCount,
  };
}

async function currentRunSummary(cwd: string): Promise<CurrentRunSummary> {
  const run = await readJson<{ tracePath?: unknown }>(
    path.join(cwd, ".krn", "current", "run.json"),
  );

  if (!run || typeof run.tracePath !== "string") {
    return { status: "missing" };
  }

  return {
    status: "present",
    tracePath: run.tracePath,
  };
}

async function artifactStatus(cwd: string, relativePath: string): Promise<ArtifactStatusSummary> {
  const artifact = await readJson<{ status?: unknown }>(path.join(cwd, relativePath));

  return {
    status: typeof artifact?.status === "string" ? artifact.status : "missing",
  };
}

function renderHandoffMarkdown(input: {
  taskId?: string | undefined;
  taskSummary: string;
  contextStop: boolean;
  contextStopReason?: string | undefined;
  verifyStatus: string;
  graph: GraphSummary;
  run: CurrentRunSummary;
  doctorStatus: string;
  evalStatus: string;
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

  lines.push("", "## Verify", "", `Status: ${input.verifyStatus}`);
  lines.push(
    "",
    "## Graph",
    "",
    `Status: ${input.graph.status}`,
    `Nodes: ${input.graph.nodeCount ?? "missing"}`,
    `Edges: ${input.graph.edgeCount ?? "missing"}`,
    "",
    "## Trace",
    "",
    `Current run trace: ${input.run.tracePath ?? "missing"}`,
    "",
    "## Doctor",
    "",
    `Status: ${input.doctorStatus}`,
    "",
    "## Eval",
    "",
    `Status: ${input.evalStatus}`,
    "",
    "## Artifact Pointers",
    "",
    "- Task contract: .krn/current/task-contract.json",
    "- Context package: .krn/current/context-package.json",
    "- Graph JSON: .krn/graph/repo-graph.json",
    "- Graph Markdown: .krn/graph/repo-graph.md",
    "- Verify result: .krn/current/verify-result.json",
    "- Doctor result: .krn/current/doctor-result.json",
    "- Eval result: .krn/current/eval-result.json",
    `- Current run trace: ${input.run.tracePath ?? "missing"}`,
    "",
    "## Changed Files",
    "",
  );
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
  const [taskContract, contextPackage, verifyResult, graph, run, doctor, evalResult, files] =
    await Promise.all([
      readCurrentTaskContract(runtime.cwd),
      readCurrentContextPackage(runtime.cwd),
      readCurrentVerifyResult(runtime.cwd),
      graphSummary(runtime.cwd),
      currentRunSummary(runtime.cwd),
      artifactStatus(runtime.cwd, ".krn/current/doctor-result.json"),
      artifactStatus(runtime.cwd, ".krn/current/eval-result.json"),
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
    graph,
    run,
    doctorStatus: doctor.status,
    evalStatus: evalResult.status,
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
