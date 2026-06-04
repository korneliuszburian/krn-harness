import type { GraphLite } from "../../graph/src/index.js";
import type { TaskContract } from "../../task-contract/src/index.js";
import { rankContext } from "./rank-context.js";
import type {
  ContextBucket,
  ContextBuckets,
  ContextCoverage,
  ContextItem,
  ContextPackage,
} from "./schema.js";
import { shouldStop } from "./stop-policy.js";

function item(
  bucket: ContextBucket,
  path: string,
  reason: string,
  priority: number,
  status: ContextItem["status"] = "available",
): ContextItem {
  return {
    path,
    reason,
    priority,
    bucket,
    status,
  };
}

function baseItems(): ContextItem[] {
  return [
    item("must-read", "AGENTS.md", "Repo-level operating contract", 100),
    item(
      "should-read",
      "docs/architecture/architecture-spec-v0.1.md",
      "P0 architecture canon when present",
      80,
    ),
    item(
      "reference-only",
      "docs/specs/context-package.schema.md",
      "Context package schema reference",
      40,
    ),
  ];
}

function fixtureItemsForTask(task: string): ContextItem[] {
  const normalized = task.toLowerCase();

  if (normalized.includes("frontend section")) {
    return [
      item(
        "must-read",
        "fixtures/repos/frontend-section-context/theme/templates/section.php",
        "Fixture template for the requested frontend section",
        95,
      ),
      item(
        "must-read",
        "fixtures/repos/frontend-section-context/theme/assets/section.css",
        "Fixture CSS for the requested frontend section",
        90,
      ),
      item(
        "must-read",
        "fixtures/repos/frontend-section-context/acf-json/section.json",
        "Fixture ACF field contract for the requested section",
        85,
      ),
      item(
        "reference-only",
        "fixtures/repos/frontend-section-context/README.md",
        "Fixture repo note",
        30,
      ),
    ];
  }

  if (normalized.includes("stale doc")) {
    return [
      item(
        "do-not-use",
        "fixtures/repos/docs-heavy-stale/docs/old-plan.md",
        "Deprecated fixture doc must not enter active context",
        100,
        "deprecated",
      ),
      item(
        "should-read",
        "fixtures/repos/docs-heavy-stale/README.md",
        "Fixture root note for stale-doc task",
        50,
      ),
    ];
  }

  if (normalized.includes("missing context") || normalized.includes("context is missing")) {
    return [
      item(
        "missing-context",
        "fixtures/repos/missing-context-stop/docs/required-context.md",
        "Required fixture context is absent",
        100,
        "missing",
      ),
    ];
  }

  return [];
}

function graphItemsForTask(task: string, graph?: GraphLite): ContextItem[] {
  if (!graph) {
    return [];
  }

  const normalized = task.toLowerCase();
  const items: ContextItem[] = [];

  if (normalized.includes("frontend section")) {
    const frontendPrefix = "fixtures/repos/frontend-section-context/";
    const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));

    for (const edge of graph.edges) {
      if (edge.kind !== "style-related-to" || !edge.evidencePath.startsWith(frontendPrefix)) {
        continue;
      }

      items.push(
        item(
          "must-read",
          edge.evidencePath,
          "Graph-lite CSS class relation for requested section",
          98,
        ),
      );

      const stylesheet = nodeById.get(edge.to);
      if (stylesheet?.evidencePath.startsWith(frontendPrefix)) {
        items.push(
          item(
            "must-read",
            stylesheet.evidencePath,
            "Graph-lite stylesheet relation for requested section",
            97,
          ),
        );
      }
    }

    for (const node of graph.nodes) {
      if (node.kind === "acf-group" && node.evidencePath.startsWith(`${frontendPrefix}acf-json/`)) {
        items.push(
          item(
            "must-read",
            node.evidencePath,
            "Graph-lite ACF field contract for requested section",
            96,
          ),
        );
      }

      if (node.kind === "doc" && node.evidencePath === `${frontendPrefix}README.md`) {
        items.push(item("reference-only", node.evidencePath, "Graph-lite fixture repo note", 30));
      }
    }
  }

  for (const node of graph.nodes) {
    if (node.kind === "doc" && node.status === "deprecated") {
      items.push(
        item(
          "do-not-use",
          node.evidencePath,
          "Graph-lite marked this document deprecated",
          100,
          "deprecated",
        ),
      );
    }
  }

  return items;
}

function dedupeItems(items: ContextItem[]): ContextItem[] {
  const byPathAndBucket = new Map<string, ContextItem>();

  for (const contextItem of items) {
    const key = `${contextItem.bucket}::${contextItem.path}`;
    const existing = byPathAndBucket.get(key);

    if (!existing || contextItem.priority > existing.priority) {
      byPathAndBucket.set(key, contextItem);
    }
  }

  return [...byPathAndBucket.values()];
}

function bucketItems(items: ContextItem[]): ContextBuckets {
  return {
    mustRead: rankContext(items.filter((contextItem) => contextItem.bucket === "must-read")),
    shouldRead: rankContext(items.filter((contextItem) => contextItem.bucket === "should-read")),
    referenceOnly: rankContext(
      items.filter((contextItem) => contextItem.bucket === "reference-only"),
    ),
    doNotUse: rankContext(items.filter((contextItem) => contextItem.bucket === "do-not-use")),
    missingContext: rankContext(
      items.filter((contextItem) => contextItem.bucket === "missing-context"),
    ),
  };
}

function coverageFor(buckets: ContextBuckets): ContextCoverage {
  const required = buckets.mustRead.length + buckets.missingContext.length;
  const present = buckets.mustRead.filter(
    (contextItem) => contextItem.status === "available",
  ).length;
  const missing = buckets.missingContext.length;

  return {
    required,
    present,
    missing,
    confidence: missing > 0 ? "low" : required > 1 ? "high" : "medium",
    overInclusionRisk: buckets.referenceOnly.length > 4 ? "medium" : "low",
  };
}

export function buildContextPackage(contract?: TaskContract, graph?: GraphLite): ContextPackage {
  const task = contract?.task ?? "";
  const items = rankContext(
    dedupeItems([...baseItems(), ...fixtureItemsForTask(task), ...graphItemsForTask(task, graph)]),
  );
  const buckets = bucketItems(items);
  const stop = shouldStop(contract, buckets);
  const pkg: ContextPackage = {
    taskId: contract?.id,
    items,
    buckets,
    coverage: coverageFor(buckets),
    stop: stop.stop,
  };

  if (stop.reason) {
    pkg.stopReason = stop.reason;
  }

  return pkg;
}
