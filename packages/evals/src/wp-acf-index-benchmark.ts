import { spawnSync } from "node:child_process";
import { access, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { redactVerifyOutput } from "../../verify/src/index.js";
import {
  type DogfoodMode,
  type DogfoodRunRecord,
  type DogfoodTaskSpec,
  gradeDogfoodRun,
  loadDogfoodTaskSpec,
  renderDogfoodReport,
} from "./dogfood.js";

export interface WpAcfBenchmarkOptions {
  sourceRoot?: string | undefined;
  runRoot?: string | undefined;
  approved?: boolean | undefined;
  modes?: DogfoodMode[] | undefined;
  taskIds?: string[] | undefined;
  now?: Date | undefined;
}

export interface WpAcfBenchmarkAggregate {
  mode: DogfoodMode;
  tasks: number;
  taskPasses: number;
  taskFailures: number;
  totalPass: number;
  totalFail: number;
  invalidRuns: number;
}

export interface WpAcfBenchmarkTaskResult {
  taskId: string;
  mode: DogfoodMode;
  status: "pass" | "fail" | "skipped";
  passCount: number;
  failCount: number;
  touchedFiles: string[];
  forbiddenTouchedFiles: string[];
  expectedUntouchedTouched: string[];
  verifyStatus: string | null;
  verifyMode: string | null;
  executedCommands: number;
  handoffPresent: boolean;
  hookTraceEvents: number;
  krnCommandPath: string | null;
  ambientKrnCommandPath: string | null;
  krnIdentityValid: boolean | null;
  globalKrnFallbackUsed: boolean;
  reportPath: string;
}

export interface WpAcfBenchmarkSummary {
  schema: "krn-wp-acf-index-benchmark-v1";
  runId: string;
  status: "pass" | "fail" | "skipped";
  skippedReason: string | null;
  sourceRoot: string;
  sourceHead: string | null;
  sourceAmbientKrnCommandPath: string | null;
  pinnedKrnPath: string | null;
  indexPath: string;
  fixtureRepo: string;
  runRoot: string;
  modes: DogfoodMode[];
  taskIds: string[];
  aggregates: WpAcfBenchmarkAggregate[];
  results: WpAcfBenchmarkTaskResult[];
}

interface CommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
  signal: NodeJS.Signals | null;
}

interface TraceInfo {
  tracePath: string | null;
  eventNames: string[];
  hookTraceEvents: number;
}

interface CodexTiming {
  startedAt: string;
  finishedAt: string;
  exitStatus: number | null;
  signal: NodeJS.Signals | null;
}

const defaultModes: DogfoodMode[] = ["baseline", "krn-explicit-skill"];

function repoRootFromModule(): string {
  return path.resolve(fileURLToPath(new URL("../../../", import.meta.url)));
}

function timestampId(now: Date): string {
  return now.toISOString().replace(/[:.]/g, "-");
}

function run(command: string, args: string[], cwd: string, env = process.env): CommandResult {
  const result = spawnSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    maxBuffer: 100 * 1024 * 1024,
  });

  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    signal: result.signal,
  };
}

const codexEnvAllowlist = new Set([
  "CI",
  "CODEX_HOME",
  "COMSPEC",
  "FORCE_COLOR",
  "HOME",
  "HOMEDRIVE",
  "HOMEPATH",
  "LANG",
  "LC_ALL",
  "LOGNAME",
  "NO_COLOR",
  "OPENAI_API_KEY",
  "OPENAI_BASE_URL",
  "PATH",
  "Path",
  "PATHEXT",
  "PNPM_HOME",
  "SYSTEMROOT",
  "TEMP",
  "TERM",
  "TMP",
  "TMPDIR",
  "USER",
  "USERPROFILE",
  "WINDIR",
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_RUNTIME_DIR",
  "ZDOTDIR",
]);

function codexProcessEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const safeEnv: NodeJS.ProcessEnv = {};

  for (const key of codexEnvAllowlist) {
    const value = env[key];
    if (value !== undefined) {
      safeEnv[key] = value;
    }
  }

  return safeEnv;
}

function requireOk(command: string, args: string[], cwd: string, env = process.env): CommandResult {
  const result = run(command, args, cwd, env);

  if (result.status !== 0) {
    throw new Error(
      [`${command} ${args.join(" ")} failed with ${result.status}`, result.stdout, result.stderr]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return result;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson<T>(filePath: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function readText(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function commandValue(cwd: string, env = process.env): string | null {
  const result = run("sh", ["-lc", "command -v krn || true"], cwd, env);
  const value = result.stdout.trim();
  return value.length > 0 ? value : null;
}

function identityValid(identity: string, repoPath: string): boolean {
  return (
    identity.includes("schema: krn-harness-cli-identity-v1") &&
    identity.includes("package: @krn-harness/cli") &&
    identity.includes("required_commands_present: true") &&
    identity.includes("writes_runtime_to_cwd: true") &&
    identity.includes(`runtime_cwd: ${repoPath}`)
  );
}

async function loadIndex(
  sourceRoot: string,
  taskIds?: string[],
): Promise<{
  indexPath: string;
  fixtureRepo: string;
  taskIds: string[];
}> {
  const indexPath = "fixtures/dogfood/tasks/wp-acf-theme-index.json";
  const index = await readJson<{ fixtureRepo: string; tasks: string[] }>(
    path.join(sourceRoot, indexPath),
  );

  if (!index) {
    throw new Error(`Unable to read ${indexPath}`);
  }

  return {
    indexPath,
    fixtureRepo: index.fixtureRepo,
    taskIds: taskIds ?? index.tasks,
  };
}

async function copyTaskSpec(sourceRoot: string, repoPath: string, taskId: string): Promise<string> {
  const relativePath = path.join("fixtures", "dogfood", "tasks", `${taskId}.json`);
  const targetPath = path.join(repoPath, relativePath);
  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(path.join(sourceRoot, relativePath), targetPath);
  return relativePath.split(path.sep).join("/");
}

async function prepareRepo(input: {
  sourceRoot: string;
  fixtureRepo: string;
  runRoot: string;
  mode: DogfoodMode;
  taskId: string;
  pinnedKrnPath: string;
  env: NodeJS.ProcessEnv;
}): Promise<{
  repoPath: string;
  taskSpecPath: string;
  identity: string | null;
  identityValid: boolean | null;
  ambientKrnCommandPath: string | null;
}> {
  const repoPath = path.join(
    input.runRoot,
    "work",
    input.mode,
    input.taskId,
    "wordpress-acf-theme",
  );
  await rm(path.dirname(repoPath), { recursive: true, force: true });
  await mkdir(path.dirname(repoPath), { recursive: true });
  await cp(path.join(input.sourceRoot, input.fixtureRepo), repoPath, { recursive: true });
  await rm(path.join(repoPath, ".krn"), { recursive: true, force: true });
  await writeFile(path.join(repoPath, ".gitignore"), ".krn/\n", "utf8");
  const taskSpecPath = await copyTaskSpec(input.sourceRoot, repoPath, input.taskId);

  requireOk("git", ["init", "-q"], repoPath);
  requireOk("git", ["config", "user.email", "dogfood@example.invalid"], repoPath);
  requireOk("git", ["config", "user.name", "KRN Dogfood"], repoPath);

  let identity: string | null = null;
  let valid: boolean | null = null;
  const ambientKrnCommandPath = commandValue(repoPath, input.env);

  if (input.mode !== "baseline") {
    identity = requireOk(input.pinnedKrnPath, ["doctor", "cli"], repoPath, input.env).stdout.trim();
    valid = identityValid(identity, repoPath);

    if (!valid) {
      throw new Error(`Invalid pinned KRN identity for ${input.mode}/${input.taskId}\n${identity}`);
    }

    requireOk(input.pinnedKrnPath, ["install"], repoPath, input.env);
  }

  requireOk("git", ["add", "."], repoPath);
  requireOk("git", ["commit", "-q", "-m", "fixture baseline"], repoPath);

  return {
    repoPath,
    taskSpecPath,
    identity,
    identityValid: valid,
    ambientKrnCommandPath,
  };
}

async function benchmarkPrompt(input: {
  mode: DogfoodMode;
  sourceRoot: string;
  task: DogfoodTaskSpec;
  taskSpecPath: string;
  pinnedKrnPath: string;
}): Promise<string> {
  const skill =
    input.mode === "baseline"
      ? "fixtures/dogfood/skills/wp-acf-baseline.md"
      : "fixtures/dogfood/skills/wp-acf-explicit-krn-skill.md";
  const base = await readFile(path.join(input.sourceRoot, skill), "utf8");
  const taskJson = (
    await readFile(
      path.join(input.sourceRoot, "fixtures", "dogfood", "tasks", `${input.task.id}.json`),
      "utf8",
    )
  ).trim();
  const common = [
    base.trim(),
    "",
    `Selected task spec path: ${input.taskSpecPath}`,
    "",
    "Task JSON:",
    "```json",
    taskJson,
    "```",
    "",
    "Work only in this repository. Do not commit. Keep forbidden files untouched.",
  ];

  if (input.mode === "baseline") {
    return [
      ...common,
      "",
      "For this baseline run, do not run `krn`, do not read `.krn`, do not use generated KRN instructions, and do not invoke KRN skills.",
      "Make the minimal source/test changes requested by the task JSON. If the task says to stop because required context is missing, do not edit files and explain the block.",
      "Run `node tests/theme.test.js` when verification is appropriate.",
      "",
    ].join("\n");
  }

  return [
    ...common,
    "",
    `Pinned KRN command path: ${input.pinnedKrnPath}`,
    `Before KRN work, run \`${input.pinnedKrnPath} doctor cli\` and \`command -v krn\`; record both in the final response.`,
    `Use this exact start command when possible: ${input.pinnedKrnPath} start --task-spec ${input.taskSpecPath}`,
    `Run \`${input.pinnedKrnPath} status\`, then the start command, then \`${input.pinnedKrnPath} graph\` before \`${input.pinnedKrnPath} context\`.`,
    "If `.krn/current/context-package.json` reports STOP, do not edit files; record the STOP in the final response.",
    `When edits are made, run \`${input.pinnedKrnPath} verify --execute\`. Run \`${input.pinnedKrnPath} handoff\` when the task requires handoff.`,
    "Do not use global `krn`.",
    "",
  ].join("\n");
}

async function runCodex(input: {
  repoPath: string;
  outDir: string;
  prompt: string;
  env: NodeJS.ProcessEnv;
}): Promise<CodexTiming> {
  await mkdir(input.outDir, { recursive: true });
  const finalPath = path.join(input.outDir, "codex-final.md");
  const eventsPath = path.join(input.outDir, "codex-events.jsonl");
  const stderrPath = path.join(input.outDir, "stderr.txt");
  const promptPath = path.join(input.outDir, "prompt.md");
  await writeFile(promptPath, input.prompt, "utf8");

  const args = [
    "exec",
    "--cd",
    input.repoPath,
    "--sandbox",
    "workspace-write",
    "-c",
    'approval_policy="never"',
    "-c",
    'model_reasoning_effort="low"',
    "--json",
    "-o",
    finalPath,
    input.prompt,
  ];
  await writeFile(
    path.join(input.outDir, "codex-command.txt"),
    `codex ${args.slice(0, -1).join(" ")} <prompt>\n`,
  );
  const startedAt = new Date().toISOString();
  const result = run("codex", args, input.repoPath, codexProcessEnv(input.env));
  const finishedAt = new Date().toISOString();
  await writeFile(eventsPath, redactVerifyOutput(result.stdout, input.env), "utf8");
  await writeFile(stderrPath, redactVerifyOutput(result.stderr, input.env), "utf8");
  try {
    const finalMessage = await readFile(finalPath, "utf8");
    await writeFile(finalPath, redactVerifyOutput(finalMessage, input.env), "utf8");
  } catch {
    // Codex may fail before writing the final message file.
  }
  await writeFile(
    path.join(input.outDir, "redaction-notes.md"),
    "Codex stdout/stderr artifacts are redacted before persistence. The benchmark runner does not pass a full inherited shell environment to Codex.\n",
    "utf8",
  );

  return {
    startedAt,
    finishedAt,
    exitStatus: result.status,
    signal: result.signal,
  };
}

function collectCommandStrings(value: unknown, output: string[] = []): string[] {
  if (!value || typeof value !== "object") {
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectCommandStrings(item, output);
    }
    return output;
  }

  for (const [key, child] of Object.entries(value)) {
    if (key === "command" && typeof child === "string") {
      output.push(child);
    } else {
      collectCommandStrings(child, output);
    }
  }

  return output;
}

async function parseCodexCommands(eventsPath: string): Promise<{
  observed: string[];
  commandLines: string[];
}> {
  const raw = await readText(eventsPath);
  const commandLines: string[] = [];

  for (const line of raw.trim().split("\n").filter(Boolean)) {
    try {
      commandLines.push(...collectCommandStrings(JSON.parse(line)));
    } catch {
      // Ignore non-JSON lines.
    }
  }

  const observed = new Set<string>();
  for (const command of commandLines) {
    if (/krn(\s|$)/.test(command) || /\/krn(\s|$)/.test(command)) {
      if (command.includes("doctor cli")) observed.add("krn doctor cli");
      if (command.includes(" status")) observed.add("krn status");
      if (command.includes(" start")) observed.add("krn start");
      if (command.includes(" graph")) observed.add("krn graph");
      if (command.includes(" context")) observed.add("krn context");
      if (command.includes(" verify --execute")) observed.add("krn verify --execute");
      else if (command.includes(" verify")) observed.add("krn verify");
      if (command.includes(" handoff")) observed.add("krn handoff");
    }

    if (command.includes("node tests/theme.test.js")) observed.add("node tests/theme.test.js");
    if (command.includes("npm test")) observed.add("npm test");
  }

  return {
    observed: [...observed],
    commandLines,
  };
}

async function traceInfo(repoPath: string): Promise<TraceInfo> {
  const currentRun = await readJson<{ tracePath?: string }>(
    path.join(repoPath, ".krn", "current", "run.json"),
  );
  const tracePaths = [currentRun?.tracePath, ".krn/traces/trace.jsonl"].filter(
    (tracePath): tracePath is string => Boolean(tracePath),
  );

  for (const tracePath of tracePaths) {
    const raw = await readText(path.join(repoPath, tracePath));

    if (!raw.trim()) {
      continue;
    }

    const events = raw
      .trim()
      .split("\n")
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as { name?: string }];
        } catch {
          return [];
        }
      });

    return {
      tracePath,
      eventNames: events.flatMap((event) => (event.name ? [event.name] : [])),
      hookTraceEvents: events.filter((event) => event.name === "hook.received").length,
    };
  }

  return { tracePath: null, eventNames: [], hookTraceEvents: 0 };
}

async function collectResult(input: {
  runId: string;
  runRoot: string;
  mode: DogfoodMode;
  task: DogfoodTaskSpec;
  repoPath: string;
  outDir: string;
  timing: CodexTiming;
  codexCommand: string;
  ambientKrnCommandPath: string | null;
  sourceAmbientKrnCommandPath: string | null;
  pinnedKrnPath: string | null;
  krnIdentity: string | null;
  krnIdentityValid: boolean | null;
}): Promise<WpAcfBenchmarkTaskResult> {
  const eventsPath = path.join(input.outDir, "codex-events.jsonl");
  const commands = await parseCodexCommands(eventsPath);
  await writeFile(
    path.join(input.outDir, "command-lines.txt"),
    `${commands.commandLines.join("\n")}\n`,
    "utf8",
  );
  const touchedFiles = requireOk("git", ["diff", "--name-only"], input.repoPath)
    .stdout.trim()
    .split("\n")
    .filter(Boolean);
  const forbiddenTouchedFiles = input.task.forbiddenTouchedFiles.filter((filePath) =>
    touchedFiles.includes(filePath),
  );
  const requiredArtifactsPresent: string[] = [];
  for (const artifact of input.task.requiredArtifacts) {
    if (await exists(path.join(input.repoPath, artifact))) {
      requiredArtifactsPresent.push(artifact);
    }
  }
  const verify = await readJson<{
    status?: string;
    mode?: string;
    summary?: { executedCommands?: number };
  }>(path.join(input.repoPath, ".krn", "current", "verify-result.json"));
  const handoffPresent = await exists(path.join(input.repoPath, ".krn", "current", "handoff.md"));
  const traces = await traceInfo(input.repoPath);
  const globalFallbackUsed =
    input.mode !== "baseline" &&
    input.sourceAmbientKrnCommandPath !== null &&
    input.pinnedKrnPath !== null &&
    input.sourceAmbientKrnCommandPath !== input.pinnedKrnPath &&
    commands.commandLines.some((command) =>
      command.includes(input.sourceAmbientKrnCommandPath ?? ""),
    );
  const runRecord: DogfoodRunRecord = {
    runId: `${input.runId}-${input.mode}-${input.task.id}`,
    mode: input.mode,
    taskId: input.task.id,
    codexAvailable: true,
    codexCommand: input.codexCommand,
    startedAt: input.timing.startedAt,
    finishedAt: input.timing.finishedAt,
    status: input.timing.exitStatus === 0 ? "pass" : "fail",
    touchedFiles,
    forbiddenTouchedFiles,
    requiredArtifactsPresent,
    ambientKrnCommandPath: input.ambientKrnCommandPath,
    krnCommandPath: input.pinnedKrnPath,
    krnIdentity: input.krnIdentity,
    krnIdentityValid: input.krnIdentityValid ?? false,
    globalKrnFallbackUsed: globalFallbackUsed,
    krnCommandsObserved: commands.observed,
    hookTraceEvents: traces.hookTraceEvents,
    hookEvidenceSource: traces.hookTraceEvents > 0 ? "real-codex" : "unknown",
    verifyStatus: verify?.status ?? null,
    handoffPresent,
    notes: [
      `codex_exit=${String(input.timing.exitStatus)}`,
      `codex_signal=${String(input.timing.signal)}`,
      `trace_path=${traces.tracePath ?? "none"}`,
      `trace_events=${traces.eventNames.join(",") || "none"}`,
    ],
  };
  await writeFile(
    path.join(input.outDir, "run-record.json"),
    `${JSON.stringify(runRecord, null, 2)}\n`,
    "utf8",
  );
  const result = await gradeDogfoodRun({
    repoPath: input.repoPath,
    task: input.task,
    run: runRecord,
  });
  await writeFile(
    path.join(input.outDir, "grade.json"),
    `${JSON.stringify(result, null, 2)}\n`,
    "utf8",
  );
  const reportPath = path.join(input.outDir, "report.md");
  await writeFile(
    reportPath,
    renderDogfoodReport({ run: runRecord, task: input.task, result }),
    "utf8",
  );

  return {
    taskId: input.task.id,
    mode: input.mode,
    status: result.status,
    passCount: result.passCount,
    failCount: result.failCount,
    touchedFiles,
    forbiddenTouchedFiles,
    expectedUntouchedTouched: result.evidence.expectedUntouchedTouched,
    verifyStatus: result.evidence.verifyStatus,
    verifyMode: result.evidence.verifyMode,
    executedCommands: result.evidence.executedCommands,
    handoffPresent,
    hookTraceEvents: result.evidence.hookTraceEvents,
    krnCommandPath: result.evidence.krnCommandPath,
    ambientKrnCommandPath: result.evidence.ambientKrnCommandPath,
    krnIdentityValid: result.evidence.krnIdentityValid,
    globalKrnFallbackUsed: result.evidence.globalKrnFallbackUsed,
    reportPath: path.relative(input.runRoot, reportPath),
  };
}

function aggregate(
  mode: DogfoodMode,
  results: WpAcfBenchmarkTaskResult[],
): WpAcfBenchmarkAggregate {
  const modeResults = results.filter((result) => result.mode === mode);

  return {
    mode,
    tasks: modeResults.length,
    taskPasses: modeResults.filter((result) => result.status === "pass").length,
    taskFailures: modeResults.filter((result) => result.status === "fail").length,
    totalPass: modeResults.reduce((total, result) => total + result.passCount, 0),
    totalFail: modeResults.reduce((total, result) => total + result.failCount, 0),
    invalidRuns: modeResults.filter(
      (result) => result.mode !== "baseline" && result.krnIdentityValid !== true,
    ).length,
  };
}

function renderSummaryMarkdown(summary: WpAcfBenchmarkSummary): string {
  return [
    `# WP/ACF Index Benchmark ${summary.runId}`,
    "",
    `Status: ${summary.status}`,
    `Skipped reason: ${summary.skippedReason ?? "none"}`,
    `Source HEAD: ${summary.sourceHead ?? "unknown"}`,
    `Source ambient krn: ${summary.sourceAmbientKrnCommandPath ?? "none"}`,
    `Pinned KRN: ${summary.pinnedKrnPath ?? "none"}`,
    `Run root: ${summary.runRoot}`,
    "",
    "## Aggregates",
    "",
    "| Mode | Tasks | Task pass | Task fail | Grade pass | Grade fail | Invalid runs |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...summary.aggregates.map(
      (item) =>
        `| ${item.mode} | ${item.tasks} | ${item.taskPasses} | ${item.taskFailures} | ${item.totalPass} | ${item.totalFail} | ${item.invalidRuns} |`,
    ),
    "",
    "## Tasks",
    "",
    "| Task | Mode | Status | Pass | Fail | Identity | Verify | Exec | Forbidden | Hooks |",
    "| --- | --- | --- | ---: | ---: | --- | --- | ---: | --- | ---: |",
    ...summary.results.map(
      (item) =>
        `| ${item.taskId} | ${item.mode} | ${item.status} | ${item.passCount} | ${item.failCount} | ${String(item.krnIdentityValid ?? "not-required")} | ${item.verifyStatus ?? "missing"}/${item.verifyMode ?? "missing"} | ${item.executedCommands} | ${item.forbiddenTouchedFiles.length ? item.forbiddenTouchedFiles.join(", ") : "none"} | ${item.hookTraceEvents} |`,
    ),
    "",
  ].join("\n");
}

export async function runWpAcfIndexBenchmark(
  options: WpAcfBenchmarkOptions = {},
): Promise<WpAcfBenchmarkSummary> {
  const sourceRoot = options.sourceRoot ?? repoRootFromModule();
  const now = options.now ?? new Date();
  const runId = `wp-acf-index-${timestampId(now)}`;
  const runRoot = options.runRoot ?? path.join(sourceRoot, ".krn", "dogfood", runId);
  const { indexPath, fixtureRepo, taskIds } = await loadIndex(sourceRoot, options.taskIds);
  const modes = options.modes ?? defaultModes;
  const sourceHead = run("git", ["rev-parse", "HEAD"], sourceRoot).stdout.trim() || null;
  const sourceAmbientKrnCommandPath = commandValue(sourceRoot);
  await mkdir(runRoot, { recursive: true });

  if (options.approved !== true) {
    const summary: WpAcfBenchmarkSummary = {
      schema: "krn-wp-acf-index-benchmark-v1",
      runId,
      status: "skipped",
      skippedReason:
        "Set KRN_WP_ACF_INDEX_BENCHMARK_APPROVED=1 to run paid Codex WP/ACF index benchmark.",
      sourceRoot,
      sourceHead,
      sourceAmbientKrnCommandPath,
      pinnedKrnPath: null,
      indexPath,
      fixtureRepo,
      runRoot,
      modes,
      taskIds,
      aggregates: modes.map((mode) => aggregate(mode, [])),
      results: [],
    };
    await writeFile(
      path.join(runRoot, "summary.json"),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      path.join(runRoot, "summary.md"),
      `${renderSummaryMarkdown(summary)}\n`,
      "utf8",
    );
    return summary;
  }

  const pinnedKrnPath = requireOk(
    path.join(sourceRoot, "scripts", "krn-local-shim.sh"),
    [path.join(runRoot, "bin")],
    sourceRoot,
  ).stdout.trim();
  const pinnedEnv = { ...process.env, PATH: `${path.dirname(pinnedKrnPath)}:${process.env.PATH}` };
  const results: WpAcfBenchmarkTaskResult[] = [];

  for (const taskId of taskIds) {
    const task = await loadDogfoodTaskSpec(
      path.join(sourceRoot, "fixtures", "dogfood", "tasks", `${taskId}.json`),
    );

    for (const mode of modes) {
      const prepared = await prepareRepo({
        sourceRoot,
        fixtureRepo,
        runRoot,
        mode,
        taskId,
        pinnedKrnPath,
        env: mode === "baseline" ? process.env : pinnedEnv,
      });
      const outDir = path.join(runRoot, "results", mode, taskId);
      const prompt = await benchmarkPrompt({
        mode,
        sourceRoot,
        task,
        taskSpecPath: prepared.taskSpecPath,
        pinnedKrnPath,
      });
      const timing = await runCodex({
        repoPath: prepared.repoPath,
        outDir,
        prompt,
        env: mode === "baseline" ? process.env : pinnedEnv,
      });
      results.push(
        await collectResult({
          runId,
          runRoot,
          mode,
          task,
          repoPath: prepared.repoPath,
          outDir,
          timing,
          codexCommand: "codex exec --cd <temp> --sandbox workspace-write --json",
          ambientKrnCommandPath: prepared.ambientKrnCommandPath,
          sourceAmbientKrnCommandPath,
          pinnedKrnPath: mode === "baseline" ? null : pinnedKrnPath,
          krnIdentity: prepared.identity,
          krnIdentityValid: prepared.identityValid,
        }),
      );
    }
  }

  const aggregates = modes.map((mode) => aggregate(mode, results));
  const status = aggregates.some(
    (item) => item.mode !== "baseline" && (item.taskFailures > 0 || item.invalidRuns > 0),
  )
    ? "fail"
    : "pass";
  const summary: WpAcfBenchmarkSummary = {
    schema: "krn-wp-acf-index-benchmark-v1",
    runId,
    status,
    skippedReason: null,
    sourceRoot,
    sourceHead,
    sourceAmbientKrnCommandPath,
    pinnedKrnPath,
    indexPath,
    fixtureRepo,
    runRoot,
    modes,
    taskIds,
    aggregates,
    results,
  };
  await writeFile(
    path.join(runRoot, "summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
  await writeFile(path.join(runRoot, "summary.md"), `${renderSummaryMarkdown(summary)}\n`, "utf8");
  return summary;
}

function parseCliArgs(argv: string[]): WpAcfBenchmarkOptions {
  const options: WpAcfBenchmarkOptions = {};

  for (const arg of argv) {
    if (arg === "--approved") {
      options.approved = true;
    } else if (arg.startsWith("--run-root=")) {
      options.runRoot = arg.slice("--run-root=".length);
    } else if (arg.startsWith("--modes=")) {
      options.modes = arg.slice("--modes=".length).split(",") as DogfoodMode[];
    } else if (arg.startsWith("--tasks=")) {
      options.taskIds = arg.slice("--tasks=".length).split(",");
    }
  }

  if (process.env.KRN_WP_ACF_INDEX_BENCHMARK_APPROVED === "1") {
    options.approved = true;
  }

  return options;
}

async function main(): Promise<void> {
  const summary = await runWpAcfIndexBenchmark(parseCliArgs(process.argv.slice(2)));
  console.log(`KRN WP/ACF index benchmark: ${summary.status}`);
  console.log(`runRoot: ${summary.runRoot}`);
  console.log(`summaryJson: ${path.join(summary.runRoot, "summary.json")}`);
  console.log(`summaryMarkdown: ${path.join(summary.runRoot, "summary.md")}`);

  if (summary.status === "skipped") {
    console.log(`reason: ${summary.skippedReason}`);
    return;
  }

  for (const aggregateItem of summary.aggregates) {
    console.log(
      `${aggregateItem.mode}: tasks ${aggregateItem.taskPasses}/${aggregateItem.tasks}, grades ${aggregateItem.totalPass}/${aggregateItem.totalPass + aggregateItem.totalFail}, invalid ${aggregateItem.invalidRuns}`,
    );
  }

  if (summary.status === "fail") {
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
