#!/usr/bin/env tsx
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import {
  type CodexExecEvidenceKind,
  type CodexExecSandboxMode,
  codexExecEvidenceKinds,
  codexExecSandboxModes,
  writeCodexExecEvidencePack,
} from "../packages/evals/src/codex-exec-evidence.js";

interface ParsedArgs {
  rawJsonl: string;
  finalMessage: string;
  outDir: string;
  runId: string;
  kind: CodexExecEvidenceKind;
  targetRepo: string;
  targetCommit: string;
  krnSourceCommit: string;
  prompt?: string | undefined;
  command?: string | undefined;
  stderr?: string | undefined;
  sandbox?: CodexExecSandboxMode | undefined;
}

function usage(): string {
  return [
    "Usage:",
    "pnpm tsx scripts/summarize-codex-exec-run.ts \\",
    "  --raw-jsonl <path> \\",
    "  --final-message <path> \\",
    "  --out <dir> \\",
    "  --run-id <id> \\",
    "  --kind real_codex_exec|fixture_codex_exec|manual_import \\",
    "  --target-repo <name> \\",
    "  --target-commit <sha|unknown> \\",
    "  --krn-source-commit <sha> \\",
    "  [--prompt <path>] [--command <path>] [--stderr <path>] [--sandbox read-only|workspace-write|danger-full-access|unknown]",
  ].join("\n");
}

function requireValue(args: string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${flag}`);
  }
  return value;
}

function parseArgs(args: string[]): ParsedArgs {
  const values = new Map<string, string>();

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (!flag?.startsWith("--")) {
      throw new Error(`Unexpected argument: ${flag ?? ""}`);
    }
    values.set(flag, requireValue(args, index, flag));
    index += 1;
  }

  const kind = values.get("--kind");
  if (!kind || !codexExecEvidenceKinds.includes(kind as CodexExecEvidenceKind)) {
    throw new Error("Invalid --kind");
  }

  const sandbox = values.get("--sandbox");
  if (sandbox && !codexExecSandboxModes.includes(sandbox as CodexExecSandboxMode)) {
    throw new Error("Invalid --sandbox");
  }

  const required = [
    "--raw-jsonl",
    "--final-message",
    "--out",
    "--run-id",
    "--target-repo",
    "--target-commit",
    "--krn-source-commit",
  ];

  for (const flag of required) {
    if (!values.get(flag)) throw new Error(`Missing required ${flag}`);
  }

  return {
    rawJsonl: values.get("--raw-jsonl") as string,
    finalMessage: values.get("--final-message") as string,
    outDir: values.get("--out") as string,
    runId: values.get("--run-id") as string,
    kind: kind as CodexExecEvidenceKind,
    targetRepo: values.get("--target-repo") as string,
    targetCommit: values.get("--target-commit") as string,
    krnSourceCommit: values.get("--krn-source-commit") as string,
    prompt: values.get("--prompt"),
    command: values.get("--command"),
    stderr: values.get("--stderr"),
    sandbox: sandbox as CodexExecSandboxMode | undefined,
  };
}

async function readOptional(pathValue: string | undefined): Promise<string | undefined> {
  return pathValue ? readFile(pathValue, "utf8") : undefined;
}

export async function main(argv: string[]): Promise<void> {
  const args = parseArgs(argv);
  const [rawJsonl, finalMessage, promptText, commandText, stderrText] = await Promise.all([
    readFile(args.rawJsonl, "utf8"),
    readFile(args.finalMessage, "utf8"),
    readOptional(args.prompt),
    readOptional(args.command),
    readOptional(args.stderr),
  ]);

  const pack = await writeCodexExecEvidencePack({
    outDir: args.outDir,
    rawJsonl,
    finalMessage,
    runId: args.runId,
    kind: args.kind,
    targetRepo: args.targetRepo,
    targetCommit: args.targetCommit,
    krnSourceCommit: args.krnSourceCommit,
    promptText,
    commandText,
    stderrText,
    sandbox: args.sandbox,
  });

  process.stdout.write(
    JSON.stringify(
      {
        schema: pack.metrics.schema,
        run_id: pack.metrics.run_id,
        kind: pack.metrics.kind,
        status: pack.metrics.status,
        out: args.outDir,
      },
      null,
      2,
    ),
  );
  process.stdout.write("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main(process.argv.slice(2)).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n\n${usage()}\n`);
    process.exitCode = 1;
  });
}
