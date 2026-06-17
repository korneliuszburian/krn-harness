import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  getRuntimeLayout,
  pathExists,
  readJsonFile,
  runtimePath,
} from "../../../core/src/index.js";
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

interface GlobalTraceSummary {
  status: "present" | "missing";
  tracePath: string;
}

interface ArtifactStatusSummary {
  status: string;
}

interface InstallSummary {
  status: "present" | "missing";
  created?: number | undefined;
  skipped?: number | undefined;
}

interface EvalStatusSummary extends ArtifactStatusSummary {
  downstreamStatus?: string | undefined;
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

async function graphSummary(cwd: string): Promise<GraphSummary> {
  const layout = getRuntimeLayout(cwd);
  const graph = await readJsonFile<{ nodeCount?: unknown; edgeCount?: unknown }>(
    path.join(cwd, layout.graphDir, "repo-graph.json"),
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
  const layout = getRuntimeLayout(cwd);
  const run = await readJsonFile<{ tracePath?: unknown }>(
    path.join(cwd, layout.currentDir, "run.json"),
  );

  if (!run || typeof run.tracePath !== "string") {
    return { status: "missing" };
  }

  return {
    status: "present",
    tracePath: run.tracePath,
  };
}

async function globalTraceSummary(cwd: string): Promise<GlobalTraceSummary> {
  const tracePath = runtimePath(getRuntimeLayout(cwd).tracesDir, "trace.jsonl");

  return {
    status: (await pathExists(path.join(cwd, tracePath))) ? "present" : "missing",
    tracePath,
  };
}

async function artifactStatus(cwd: string, relativePath: string): Promise<ArtifactStatusSummary> {
  const artifact = await readJsonFile<{ status?: unknown }>(path.join(cwd, relativePath));

  return {
    status: typeof artifact?.status === "string" ? artifact.status : "missing",
  };
}

async function evalStatus(cwd: string): Promise<EvalStatusSummary> {
  const layout = getRuntimeLayout(cwd);
  const artifact = await readJsonFile<{ status?: unknown; downstream?: { status?: unknown } }>(
    path.join(cwd, layout.currentDir, "eval-result.json"),
  );

  return {
    status: typeof artifact?.status === "string" ? artifact.status : "missing",
    downstreamStatus:
      typeof artifact?.downstream?.status === "string" ? artifact.downstream.status : undefined,
  };
}

async function installSummary(cwd: string): Promise<InstallSummary> {
  try {
    const rawTrace = await readFile(
      path.join(cwd, getRuntimeLayout(cwd).tracesDir, "trace.jsonl"),
      "utf8",
    );
    const installEvent = rawTrace
      .trim()
      .split("\n")
      .reverse()
      .map((line) => {
        try {
          return JSON.parse(line) as {
            name?: unknown;
            data?: { created?: unknown; skipped?: unknown };
          };
        } catch {
          return undefined;
        }
      })
      .find((event) => event?.name === "install.ran");

    if (!installEvent) {
      return { status: "missing" };
    }

    return {
      status: "present",
      created:
        typeof installEvent.data?.created === "number" ? installEvent.data.created : undefined,
      skipped:
        typeof installEvent.data?.skipped === "number" ? installEvent.data.skipped : undefined,
    };
  } catch {
    return { status: "missing" };
  }
}

function verifyCount(value: number | undefined): string {
  return value === undefined ? "missing" : String(value);
}

function renderHandoffMarkdown(input: {
  taskId?: string | undefined;
  taskSummary: string;
  contextStop: boolean;
  contextStopReason?: string | undefined;
  verifyStatus: string;
  verifyProfile?: string | undefined;
  verifyMode?: string | undefined;
  verifyTotalCommands?: number | undefined;
  verifyBlockedCommands?: number | undefined;
  verifyExecutedCommands?: number | undefined;
  graph: GraphSummary;
  run: CurrentRunSummary;
  globalTrace: GlobalTraceSummary;
  install: InstallSummary;
  doctorStatus: string;
  evalStatus: string;
  downstreamEvalStatus?: string | undefined;
  changedFiles: string[];
  currentDir: string;
  graphDir: string;
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

  lines.push(
    "",
    "## Verify",
    "",
    `Status: ${input.verifyStatus}`,
    `Profile: ${input.verifyProfile ?? "missing"}`,
    `Mode: ${input.verifyMode ?? "missing"}`,
    `Commands: total ${verifyCount(input.verifyTotalCommands)}, blocked ${verifyCount(
      input.verifyBlockedCommands,
    )}, executed ${verifyCount(input.verifyExecutedCommands)}`,
  );
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
    `Global trace: ${input.globalTrace.status === "present" ? input.globalTrace.tracePath : "missing"}`,
    "",
    "## Install",
    "",
    `Status: ${input.install.status}`,
    `Created: ${verifyCount(input.install.created)}`,
    `Skipped: ${verifyCount(input.install.skipped)}`,
    "",
    "## Doctor",
    "",
    `Status: ${input.doctorStatus}`,
    "",
    "## Eval",
    "",
    `Status: ${input.evalStatus}`,
    `Downstream acceptance: ${input.downstreamEvalStatus ?? "missing"}`,
    "",
    "## Artifact Pointers",
    "",
    `- Task contract: ${runtimePath(input.currentDir, "task-contract.json")}`,
    `- Context package: ${runtimePath(input.currentDir, "context-package.json")}`,
    `- Graph JSON: ${runtimePath(input.graphDir, "repo-graph.json")}`,
    `- Graph Markdown: ${runtimePath(input.graphDir, "repo-graph.md")}`,
    `- Verify result: ${runtimePath(input.currentDir, "verify-result.json")}`,
    `- Doctor result: ${runtimePath(input.currentDir, "doctor-result.json")}`,
    `- Eval result: ${runtimePath(input.currentDir, "eval-result.json")}`,
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
    "- Verify evidence is local; command output tails are compact and not production proof.",
    "",
    "## Next Safe Action",
    "",
    "- Review current artifacts, then run configured validation manually if needed.",
    "",
  );

  return lines.join("\n");
}

export async function handoffCommand(runtime: CliRuntime): Promise<number> {
  const layout = getRuntimeLayout(runtime.cwd);
  const [
    taskContract,
    contextPackage,
    verifyResult,
    graph,
    run,
    globalTrace,
    install,
    doctor,
    evalResult,
    files,
  ] = await Promise.all([
    readCurrentTaskContract(runtime.cwd),
    readCurrentContextPackage(runtime.cwd),
    readCurrentVerifyResult(runtime.cwd),
    graphSummary(runtime.cwd),
    currentRunSummary(runtime.cwd),
    globalTraceSummary(runtime.cwd),
    installSummary(runtime.cwd),
    artifactStatus(runtime.cwd, runtimePath(layout.currentDir, "doctor-result.json")),
    evalStatus(runtime.cwd),
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
    verifyProfile: verifyResult?.profileName,
    verifyMode: verifyResult?.mode,
    verifyTotalCommands: verifyResult?.summary.totalCommands,
    verifyBlockedCommands: verifyResult?.summary.blockedCommands,
    verifyExecutedCommands: verifyResult?.summary.executedCommands,
    graph,
    run,
    globalTrace,
    install,
    doctorStatus: doctor.status,
    evalStatus: evalResult.status,
    downstreamEvalStatus: evalResult.downstreamStatus,
    changedFiles: files,
    currentDir: layout.currentDir,
    graphDir: layout.graphDir,
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
handoff: ${runtimePath(layout.currentDir, "handoff.md")}
verify: ${verifyResult?.status ?? "missing"}
`);

  return 0;
}
