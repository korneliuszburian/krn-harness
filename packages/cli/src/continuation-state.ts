import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { currentArtifactPathsFor, repoPathExists } from "./current-artifacts.js";
import {
  readCurrentContextPackage,
  readCurrentTaskContract,
  readCurrentVerifyResult,
  writeCurrentJson,
  writeCurrentMarkdown,
} from "./current-state.js";

const execFileAsync = promisify(execFile);

export const continuationStateJsonFileName = "continuation-state.json";
export const continuationStateMarkdownFileName = "continuation-state.md";

export type ContinuationStateTrigger = "PreCompact" | "manual";

export interface ContinuationStateArtifact {
  path: string;
  present: boolean;
}

export interface ContinuationState {
  schema: "krn.continuation-state.v1";
  createdAt: string;
  triggerEvent: ContinuationStateTrigger;
  cwd: string;
  task: {
    id: string | null;
    text: string | null;
  };
  context: {
    present: boolean;
    stop: boolean;
    stopReason: string | null;
  };
  verification: {
    present: boolean;
    status: string | null;
  };
  git: {
    available: boolean;
    branch: string | null;
    head: string | null;
    statusShort: string[];
  };
  artifacts: {
    taskContract: ContinuationStateArtifact;
    contextPackage: ContinuationStateArtifact;
    verifyResult: ContinuationStateArtifact;
    handoff: ContinuationStateArtifact;
    runResult: ContinuationStateArtifact;
    operatorReport: ContinuationStateArtifact;
    continuationStateMarkdown: ContinuationStateArtifact;
  };
  proof: {
    productionProof: false;
    hookTrustStatus: "unproven";
    scope: "local-current-state-only";
  };
  nextAction: {
    summary: string;
    requiredReads: string[];
    commands: string[];
    forbidden: string[];
  };
  sourceBasis: string[];
}

async function gitOutput(cwd: string, args: string[]): Promise<string | undefined> {
  try {
    const { stdout } = await execFileAsync("git", args, { cwd });
    return stdout.trim();
  } catch {
    return undefined;
  }
}

async function gitStatusShort(cwd: string): Promise<string[]> {
  const output = await gitOutput(cwd, ["status", "--short"]);
  return output ? output.split("\n").filter(Boolean) : [];
}

function artifact(path: string, present: boolean): ContinuationStateArtifact {
  return { path, present };
}

function requiredReads(paths: ReturnType<typeof currentArtifactPathsFor>): string[] {
  return [
    paths.continuationStateMarkdown,
    paths.handoff,
    paths.taskContract,
    paths.contextPackage,
    "AGENTS.md",
    "docs/product/audit-consolidation-goal-2026-06-18.md",
    "docs/product/audit-consolidation-continuation.md",
  ];
}

function nextActionSummary(input: {
  contextStop: boolean;
  contextPresent: boolean;
  verifyPresent: boolean;
  handoffPresent: boolean;
}): string {
  if (input.contextStop) {
    return "Resolve the active context STOP before editing.";
  }

  if (!input.contextPresent) {
    return "Rebuild context before editing.";
  }

  if (!input.verifyPresent) {
    return "Refresh verification before final handoff.";
  }

  if (!input.handoffPresent) {
    return "Generate a handoff before final closeout.";
  }

  return "Read the continuation handoff and continue from the latest verified task state.";
}

function renderBool(value: boolean): string {
  return value ? "present" : "missing";
}

export function renderContinuationStateMarkdown(state: ContinuationState): string {
  return `# KRN Continuation State

Schema: ${state.schema}
Created: ${state.createdAt}
Trigger: ${state.triggerEvent}

This artifact is a local restart anchor for Codex session compaction/resume.
It is not production proof, hook trust proof, CI proof, target-main approval, or
a replacement for checked-in goal/ledger truth.

## Task

- Task ID: ${state.task.id ?? "unknown"}
- Task text: ${state.task.text ?? "unknown"}
- Context: ${state.context.present ? "present" : "missing"}
- Context STOP: ${String(state.context.stop)}
- Context STOP reason: ${state.context.stopReason ?? "none"}
- Verify: ${state.verification.present ? (state.verification.status ?? "present") : "missing"}

## Required First Reads

${state.nextAction.requiredReads.map((item) => `- ${item}`).join("\n")}

## Next Action

${state.nextAction.summary}

Suggested commands:

${state.nextAction.commands.map((item) => `- ${item}`).join("\n")}

Forbidden until re-anchored:

${state.nextAction.forbidden.map((item) => `- ${item}`).join("\n")}

## Current Artifacts

- Task contract: ${state.artifacts.taskContract.path} (${renderBool(state.artifacts.taskContract.present)})
- Context package: ${state.artifacts.contextPackage.path} (${renderBool(state.artifacts.contextPackage.present)})
- Verify result: ${state.artifacts.verifyResult.path} (${renderBool(state.artifacts.verifyResult.present)})
- Handoff: ${state.artifacts.handoff.path} (${renderBool(state.artifacts.handoff.present)})
- Run result: ${state.artifacts.runResult.path} (${renderBool(state.artifacts.runResult.present)})
- Operator report: ${state.artifacts.operatorReport.path} (${renderBool(state.artifacts.operatorReport.present)})

## Git

- Available: ${String(state.git.available)}
- Branch: ${state.git.branch ?? "unknown"}
- HEAD: ${state.git.head ?? "unknown"}
- Status short:
${state.git.statusShort.length === 0 ? "  - clean or unavailable" : state.git.statusShort.map((line) => `  - ${line}`).join("\n")}

## Proof Boundary

- productionProof: ${String(state.proof.productionProof)}
- hookTrustStatus: ${state.proof.hookTrustStatus}
- scope: ${state.proof.scope}

## Source Basis

${state.sourceBasis.map((item) => `- ${item}`).join("\n")}
`;
}

export async function buildContinuationState(input: {
  cwd: string;
  triggerEvent: ContinuationStateTrigger;
  now?: Date | undefined;
}): Promise<ContinuationState> {
  const paths = currentArtifactPathsFor(input.cwd);
  const [
    taskContract,
    contextPackage,
    verifyResult,
    handoffPresent,
    runResultPresent,
    reportPresent,
  ] = await Promise.all([
    readCurrentTaskContract(input.cwd),
    readCurrentContextPackage(input.cwd),
    readCurrentVerifyResult(input.cwd),
    repoPathExists(input.cwd, paths.handoff),
    repoPathExists(input.cwd, paths.runResultJson),
    repoPathExists(input.cwd, paths.operatorReportJson),
  ]);
  const [head, branch, statusShort] = await Promise.all([
    gitOutput(input.cwd, ["rev-parse", "HEAD"]),
    gitOutput(input.cwd, ["rev-parse", "--abbrev-ref", "HEAD"]),
    gitStatusShort(input.cwd),
  ]);

  const state: ContinuationState = {
    schema: "krn.continuation-state.v1",
    createdAt: (input.now ?? new Date()).toISOString(),
    triggerEvent: input.triggerEvent,
    cwd: input.cwd,
    task: {
      id: taskContract?.id ?? contextPackage?.taskId ?? verifyResult?.taskId ?? null,
      text: taskContract?.task ?? null,
    },
    context: {
      present: Boolean(contextPackage),
      stop: contextPackage?.stop ?? false,
      stopReason: contextPackage?.stopReason ?? null,
    },
    verification: {
      present: Boolean(verifyResult),
      status: verifyResult?.status ?? null,
    },
    git: {
      available: Boolean(head || branch),
      branch: branch ?? null,
      head: head ?? null,
      statusShort,
    },
    artifacts: {
      taskContract: artifact(paths.taskContract, Boolean(taskContract)),
      contextPackage: artifact(paths.contextPackage, Boolean(contextPackage)),
      verifyResult: artifact(paths.verifyResult, Boolean(verifyResult)),
      handoff: artifact(paths.handoff, handoffPresent),
      runResult: artifact(paths.runResultJson, runResultPresent),
      operatorReport: artifact(paths.operatorReportJson, reportPresent),
      continuationStateMarkdown: artifact(paths.continuationStateMarkdown, true),
    },
    proof: {
      productionProof: false,
      hookTrustStatus: "unproven",
      scope: "local-current-state-only",
    },
    nextAction: {
      summary: nextActionSummary({
        contextStop: contextPackage?.stop ?? false,
        contextPresent: Boolean(contextPackage),
        verifyPresent: Boolean(verifyResult),
        handoffPresent,
      }),
      requiredReads: requiredReads(paths),
      commands: ["git status --short --branch", "pnpm lint", "pnpm typecheck", "pnpm test"],
      forbidden: [
        "Do not treat this artifact as production proof.",
        "Do not claim hook trust from this artifact.",
        "Do not rely on chat memory instead of checked-in goal/ledger truth.",
        "Do not create screenshots, appshots, browser captures, dashboards, vectors, MCP, publishing artifacts, or placeholder evidence.",
      ],
    },
    sourceBasis: [
      "https://developers.openai.com/codex/hooks",
      "https://developers.openai.com/codex/guides/agents-md",
      "https://developers.openai.com/codex/noninteractive",
      "docs/specs/hooks-pack.md",
      "docs/product/audit-consolidation-continuation.md",
    ],
  };

  return state;
}

export async function writeContinuationState(input: {
  cwd: string;
  triggerEvent: ContinuationStateTrigger;
  now?: Date | undefined;
}): Promise<ContinuationState> {
  const state = await buildContinuationState(input);
  await writeCurrentJson(input.cwd, continuationStateJsonFileName, state);
  await writeCurrentMarkdown(
    input.cwd,
    continuationStateMarkdownFileName,
    renderContinuationStateMarkdown(state),
  );
  return state;
}
