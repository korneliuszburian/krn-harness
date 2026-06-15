import { buildContextPackage } from "../../context/src/index.js";
import {
  approveMemory,
  compactMemory,
  createPendingMemory,
  deprecateMemory,
} from "../../memory/src/index.js";
import { buildTaskContract } from "../../task-contract/src/index.js";
import type { EvalGrade } from "./graders/types.js";

export function gradeMemoryGovernance(): EvalGrade {
  const pending = createPendingMemory({
    summary: "Graph selector pending memory must not be active.",
    evidencePath: "docs/specs/memory.schema.md",
    now: new Date("2026-06-03T00:00:00.000Z"),
  });
  const approved = approveMemory(
    createPendingMemory({
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    new Date("2026-06-03T00:01:00.000Z"),
  );
  const explicitApproved = approveMemory(
    createPendingMemory({
      summary: "Prefer short handoff summaries.",
      evidencePath: "docs/specs/handoff.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    new Date("2026-06-03T00:01:00.000Z"),
  );
  const deprecated = deprecateMemory(
    createPendingMemory({
      summary: "Graph selector deprecated memory must not be active.",
      evidencePath: "docs/specs/memory.schema.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    }),
    {
      reason: "Superseded by current canon.",
      now: new Date("2026-06-03T00:02:00.000Z"),
    },
  );
  const active = compactMemory([pending, approved, explicitApproved, deprecated]);
  const relevantContext = buildContextPackage(
    buildTaskContract("Harden graph selector behavior"),
    undefined,
    {
      approvedMemory: [pending, approved, deprecated],
    },
  );
  const explicitContext = buildContextPackage(
    buildTaskContract("Use approved memory for this task"),
    undefined,
    {
      approvedMemory: [explicitApproved],
    },
  );
  const unrelatedContext = buildContextPackage(
    buildTaskContract("Update billing docs"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const broadTermContext = buildContextPackage(
    buildTaskContract("Harden graph behavior"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const optOutContext = buildContextPackage(
    buildTaskContract("Harden graph selector behavior without approved memory"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const polishOptOutContext = buildContextPackage(
    buildTaskContract("Harden graph selector behavior bez pamięci"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const polishPriorDecisionOptOutContext = buildContextPackage(
    buildTaskContract("Harden graph selector behavior nie używaj poprzednich decyzji"),
    undefined,
    {
      approvedMemory: [approved],
    },
  );
  const polishExplicitContext = buildContextPackage(
    buildTaskContract("Użyj zatwierdzonej pamięci do tego zadania"),
    undefined,
    {
      approvedMemory: [explicitApproved],
    },
  );
  const relevantMemoryItems = relevantContext.items.filter((item) => item.source === "memory");
  const explicitMemoryItems = explicitContext.items.filter((item) => item.source === "memory");
  const polishExplicitMemoryItems = polishExplicitContext.items.filter(
    (item) => item.source === "memory",
  );
  const failures = [];

  if (pending.status !== "pending") {
    failures.push("pending record did not stay pending");
  }

  if (active.some((record) => record.id === pending.id)) {
    failures.push("pending record leaked into active memory");
  }

  if (!active.some((record) => record.id === approved.id && record.status === "approved")) {
    failures.push("approved record was not active");
  }

  if (active.some((record) => record.id === deprecated.id)) {
    failures.push("deprecated record leaked into active memory");
  }

  if (unrelatedContext.items.some((item) => item.source === "memory")) {
    failures.push("unrelated approved memory leaked into context");
  }

  if (broadTermContext.items.some((item) => item.source === "memory")) {
    failures.push("broad single-term memory match leaked into context");
  }

  if (optOutContext.items.some((item) => item.source === "memory")) {
    failures.push("explicit memory opt-out leaked memory into context");
  }

  if (polishOptOutContext.items.some((item) => item.source === "memory")) {
    failures.push("Polish memory opt-out leaked memory into context");
  }

  if (polishPriorDecisionOptOutContext.items.some((item) => item.source === "memory")) {
    failures.push("Polish prior-decision opt-out leaked memory into context");
  }

  if (
    relevantMemoryItems.length !== 1 ||
    relevantMemoryItems[0]?.bucket !== "reference-only" ||
    relevantMemoryItems[0]?.selector !== "approved-memory-task-match" ||
    relevantMemoryItems[0]?.memoryId !== approved.id ||
    relevantMemoryItems[0]?.approvedAt !== approved.approvedAt ||
    relevantMemoryItems[0]?.evidencePath !== approved.evidencePath
  ) {
    failures.push("task-relevant approved memory was not gated as reference-only with provenance");
  }

  if (relevantContext.items.some((item) => item.memoryId === pending.id)) {
    failures.push("pending memory leaked into context package");
  }

  if (relevantContext.items.some((item) => item.memoryId === deprecated.id)) {
    failures.push("deprecated memory leaked into context package");
  }

  if (
    explicitMemoryItems.length !== 1 ||
    explicitMemoryItems[0]?.bucket !== "reference-only" ||
    explicitMemoryItems[0]?.selector !== "approved-memory-explicit" ||
    explicitMemoryItems[0]?.memoryId !== explicitApproved.id
  ) {
    failures.push("explicit approved memory request did not surface reference-only memory");
  }

  if (
    polishExplicitMemoryItems.length !== 1 ||
    polishExplicitMemoryItems[0]?.bucket !== "reference-only" ||
    polishExplicitMemoryItems[0]?.selector !== "approved-memory-explicit" ||
    polishExplicitMemoryItems[0]?.memoryId !== explicitApproved.id
  ) {
    failures.push("Polish explicit approved memory request did not surface reference-only memory");
  }

  return {
    name: "memory-governance",
    status: failures.length === 0 ? "pass" : "fail",
    detail:
      failures.length === 0
        ? "Approved memory is gated to reference-only context with provenance; pending, deprecated, unrelated, broad-term, English opt-out, Polish opt-out, and Polish explicit-request behavior are covered"
        : failures.join("; "),
  };
}
