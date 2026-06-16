import path from "node:path";
import { pathExists } from "../../core/src/index.js";
import {
  artifactCheck,
  downstreamAgentsCheck,
  downstreamHooksTemplateCheck,
  downstreamRuntimeSkillCheck,
  isHarnessSource,
  sourceTreeCheck,
} from "./doctor-checks.js";
import { graphJsonShapeCheck, graphSummaryCheck } from "./doctor-graph-checks.js";
import { hookGuardrailTraceCheck } from "./doctor-hook-trace-check.js";
import { readJson } from "./doctor-json.js";
import { memoryContextGateCheck, memoryStoresCheck } from "./doctor-memory-checks.js";
import { deriveStatus, nextActionsFor } from "./doctor-render.js";
import {
  configCheck,
  currentRunCheck,
  currentVerifyResultCheck,
  runTraceCheck,
  verifyConfigPolicyCheck,
} from "./doctor-runtime-checks.js";
import type { DoctorCheck, DoctorResult } from "./doctor-types.js";

export { renderDoctorResultMarkdown } from "./doctor-render.js";
export type { DoctorCheck, DoctorResult, DoctorStatus } from "./doctor-types.js";

export async function runDoctor(cwd = process.cwd()): Promise<DoctorResult> {
  const currentDir = path.join(cwd, ".krn", "current");
  const tracePath = path.join(cwd, ".krn", "traces", "trace.jsonl");
  const source = await isHarnessSource(cwd);
  const contextPackage = await readJson<{ stop?: boolean; stopReason?: string }>(
    path.join(currentDir, "context-package.json"),
  );

  const checks: DoctorCheck[] = [
    await configCheck(cwd),
    await verifyConfigPolicyCheck(cwd),
    artifactCheck(
      "current-task-contract",
      await pathExists(path.join(currentDir, "task-contract.json")),
      ".krn/current/task-contract.json",
    ),
    await currentRunCheck(cwd),
    artifactCheck(
      "current-context-package",
      await pathExists(path.join(currentDir, "context-package.json")),
      ".krn/current/context-package.json",
    ),
    {
      name: "context-stop",
      status: contextPackage === undefined || contextPackage.stop ? "warn" : "pass",
      detail:
        contextPackage === undefined
          ? "No current context package is available"
          : contextPackage.stop
            ? (contextPackage.stopReason ?? "Current context package reports STOP")
            : "Current context package does not report STOP",
    },
    await currentVerifyResultCheck(cwd),
    artifactCheck(
      "current-handoff",
      await pathExists(path.join(currentDir, "handoff.md")),
      ".krn/current/handoff.md",
    ),
    await memoryStoresCheck(cwd),
    await memoryContextGateCheck(cwd),
    artifactCheck(
      "graph-json",
      await pathExists(path.join(cwd, ".krn", "graph", "repo-graph.json")),
      ".krn/graph/repo-graph.json",
    ),
    artifactCheck(
      "graph-markdown",
      await pathExists(path.join(cwd, ".krn", "graph", "repo-graph.md")),
      ".krn/graph/repo-graph.md",
    ),
    await graphJsonShapeCheck(cwd),
    await graphSummaryCheck(cwd),
    await downstreamAgentsCheck(cwd, source),
    await downstreamRuntimeSkillCheck(cwd, source),
    await downstreamHooksTemplateCheck(cwd, source),
    await sourceTreeCheck(cwd, {
      name: "adapter-templates",
      paths: [
        "packages/codex-adapter/src/templates/AGENTS.md.tmpl",
        "packages/codex-adapter/src/templates/hooks.json.tmpl",
        "packages/codex-adapter/src/templates/skills/krn-harness/SKILL.md.tmpl",
      ],
    }),
    await sourceTreeCheck(cwd, {
      name: "build-time-skills",
      paths: [
        ".agents/skills/buduj/SKILL.md",
        ".agents/skills/pilnuj/SKILL.md",
        ".agents/skills/wycinek/SKILL.md",
        ".agents/skills/handoff/SKILL.md",
      ],
    }),
    await runTraceCheck(cwd),
    await hookGuardrailTraceCheck(cwd),
    artifactCheck("global-trace", await pathExists(tracePath), ".krn/traces/trace.jsonl"),
  ];

  return {
    status: deriveStatus(checks),
    checks,
    nextActions: nextActionsFor(checks),
  };
}
