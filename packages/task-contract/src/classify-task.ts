import type { TaskClassification } from "./schema.js";

export function classifyTask(task: string): TaskClassification {
  const normalized = task.toLowerCase();

  if (normalized.includes("review") || normalized.includes("audit")) {
    return "review";
  }

  if (normalized.includes("docs") || normalized.includes("adr") || normalized.includes("readme")) {
    return "docs";
  }

  if (normalized.includes("research") || normalized.includes("source")) {
    return "research";
  }

  if (normalized.trim().length > 0) {
    return "implementation";
  }

  return "unknown";
}
