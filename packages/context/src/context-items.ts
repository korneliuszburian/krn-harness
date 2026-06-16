import type { TaskContract } from "../../task-contract/src/index.js";
import type { ContextSelectionHints } from "./context-path-classification.js";
import { isPathWithin, normalizeContextPath } from "./context-path-classification.js";
import type { ContextBucket, ContextItem } from "./schema.js";

export function contextItem(
  bucket: ContextBucket,
  path: string,
  reason: string,
  priority: number,
  status: ContextItem["status"] = "available",
  explainability: Pick<
    ContextItem,
    | "source"
    | "selector"
    | "matchedTerms"
    | "relationKind"
    | "sourceNode"
    | "targetNode"
    | "operatorMessage"
    | "memoryId"
    | "memorySummary"
    | "approvedAt"
    | "evidencePath"
  > = {},
): ContextItem {
  return {
    path,
    reason,
    priority,
    bucket,
    status,
    ...explainability,
  };
}

export function baseItems(): ContextItem[] {
  return [
    contextItem("must-read", "AGENTS.md", "Repo-level operating contract", 100, "available", {
      source: "base",
      selector: "repo-agents",
    }),
    contextItem(
      "should-read",
      "docs/architecture/architecture-spec-v0.1.md",
      "P0 architecture canon when present",
      80,
      "available",
      {
        source: "base",
        selector: "architecture-canon",
      },
    ),
    contextItem(
      "reference-only",
      "docs/specs/context-package.schema.md",
      "Context package schema reference",
      40,
      "available",
      {
        source: "base",
        selector: "context-schema",
      },
    ),
  ];
}

export function taskPolicyItems(task: string): ContextItem[] {
  const normalized = task.toLowerCase();

  if (normalized.includes("missing context") || normalized.includes("context is missing")) {
    return [
      contextItem(
        "missing-context",
        "docs/required-context.md",
        "Required context is absent",
        100,
        "missing",
        {
          source: "task-policy",
          selector: "missing-context-policy",
        },
      ),
    ];
  }

  return [];
}

export function taskContractMetadataItems(contract?: TaskContract): ContextItem[] {
  const items: ContextItem[] =
    contract?.metadata?.expectedTouchedFiles?.map((path) =>
      contextItem(
        "must-read",
        normalizeContextPath(path),
        "Task contract expects this file may be touched",
        99,
        "available",
        {
          source: "task-contract",
          selector: "expected-touched-file",
        },
      ),
    ) ?? [];

  items.push(
    ...(contract?.metadata?.requiredDoNotUsePaths?.map((path) =>
      contextItem(
        "do-not-use",
        path,
        "Task contract marks this path do-not-use",
        101,
        "deprecated",
        {
          source: "task-contract",
          selector: "required-do-not-use-path",
          operatorMessage: "Do not use this path as active context; it is forbidden by the task.",
        },
      ),
    ) ?? []),
  );

  return items;
}

export function explicitTaskPathItems(hints: ContextSelectionHints): ContextItem[] {
  return [...hints.explicitTaskPaths]
    .filter((path) => !hints.expectedTouchedPaths.has(path))
    .filter(
      (path) =>
        !hints.doNotUsePaths.some((doNotUsePath) =>
          isPathWithin(normalizeContextPath(path), doNotUsePath),
        ),
    )
    .map((path) =>
      contextItem(
        "should-read",
        path,
        "Task text explicitly references this repo path",
        78,
        "available",
        {
          source: "task-policy",
          selector: "explicit-task-path",
        },
      ),
    );
}
