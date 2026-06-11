import {
  approveMemoryById,
  deprecateMemoryById,
  listMemoryRecords,
  memoryCounts,
  proposeMemory,
} from "../../../memory/src/index.js";
import { emitCliTrace } from "../run-trace.js";
import type { CliRuntime } from "../runtime.js";

function memoryHelp(): string {
  return `KRN memory commands:
  krn memory list
  krn memory propose "<summary>" [--evidence <path>]
  krn memory approve <memory_id>
  krn memory deprecate <memory_id> [reason]
`;
}

function parseProposal(args: string[]): { summary: string; evidencePath?: string | undefined } {
  const summaryParts: string[] = [];
  let evidencePath: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--evidence") {
      evidencePath = args[index + 1];
      index += 1;
      continue;
    }

    if (arg?.startsWith("--evidence=")) {
      evidencePath = arg.slice("--evidence=".length);
      continue;
    }

    if (arg) {
      summaryParts.push(arg);
    }
  }

  return {
    summary: summaryParts.join(" ").trim(),
    evidencePath,
  };
}

export async function memoryCommand(args: string[], runtime: CliRuntime): Promise<number> {
  const [command, ...rest] = args;

  if (!command || command === "--help" || command === "-h" || command === "help") {
    runtime.stdout(memoryHelp());
    return 0;
  }

  if (command === "list") {
    const [records, counts] = await Promise.all([
      listMemoryRecords(runtime.cwd),
      memoryCounts(runtime.cwd),
    ]);

    await emitCliTrace(runtime, "memory.listed", {
      runScoped: true,
      data: {
        pending: counts.pending,
        approved: counts.approved,
        deprecated: counts.deprecated,
      },
    });

    runtime.stdout(`KRN memory: listed
pending: ${counts.pending}
approved: ${counts.approved}
deprecated: ${counts.deprecated}
${records.map((record) => `- ${record.status} ${record.id}: ${record.summary}`).join("\n") || "- none"}
`);
    return 0;
  }

  if (command === "propose") {
    const proposal = parseProposal(rest);

    if (!proposal.summary) {
      runtime.stderr("KRN memory propose: summary is required\n");
      return 1;
    }

    const result = await proposeMemory(runtime.cwd, {
      summary: proposal.summary,
      evidencePath: proposal.evidencePath,
      now: runtime.now?.(),
    });

    await emitCliTrace(runtime, "memory.proposed", {
      runScoped: true,
      data: {
        id: result.record?.id ?? null,
        status: result.record?.status ?? "pending",
        evidencePath: result.record?.evidencePath ?? null,
        pending: result.counts.pending,
        approved: result.counts.approved,
        deprecated: result.counts.deprecated,
      },
    });

    runtime.stdout(`KRN memory: proposed
id: ${result.record?.id ?? "none"}
status: pending
store: .krn/memory/pending.json
evidence: ${result.record?.evidencePath ?? "none"}
`);
    return 0;
  }

  if (command === "approve") {
    const id = rest[0];

    if (!id) {
      runtime.stderr("KRN memory approve: memory id is required\n");
      return 1;
    }

    const result = await approveMemoryById(runtime.cwd, id, runtime.now?.());

    if (result.status === "not-found") {
      runtime.stderr(`KRN memory approve: memory not found: ${id}\n`);
      return 1;
    }

    await emitCliTrace(runtime, "memory.approved", {
      runScoped: true,
      data: {
        id: result.record?.id ?? id,
        status: result.record?.status ?? "approved",
        pending: result.counts.pending,
        approved: result.counts.approved,
        deprecated: result.counts.deprecated,
      },
    });

    runtime.stdout(`KRN memory: approved
id: ${result.record?.id ?? id}
status: approved
store: .krn/memory/approved.json
`);
    return 0;
  }

  if (command === "deprecate") {
    const [id, ...reasonParts] = rest;

    if (!id) {
      runtime.stderr("KRN memory deprecate: memory id is required\n");
      return 1;
    }

    const reason = reasonParts.join(" ").trim();
    const result = await deprecateMemoryById(runtime.cwd, id, {
      reason: reason || undefined,
      now: runtime.now?.(),
    });

    if (result.status === "not-found") {
      runtime.stderr(`KRN memory deprecate: memory not found: ${id}\n`);
      return 1;
    }

    await emitCliTrace(runtime, "memory.deprecated", {
      runScoped: true,
      data: {
        id: result.record?.id ?? id,
        status: result.record?.status ?? "deprecated",
        reason: result.record?.deprecationReason ?? null,
        pending: result.counts.pending,
        approved: result.counts.approved,
        deprecated: result.counts.deprecated,
      },
    });

    runtime.stdout(`KRN memory: deprecated
id: ${result.record?.id ?? id}
status: deprecated
store: .krn/memory/deprecated.json
reason: ${result.record?.deprecationReason ?? "none"}
`);
    return 0;
  }

  runtime.stderr(`KRN memory: unknown command: ${command}\n`);
  runtime.stdout(memoryHelp());
  return 1;
}
