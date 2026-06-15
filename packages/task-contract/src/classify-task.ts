import type { TaskClassification, TaskMode } from "./schema.js";

export function classifyTask(task: string): TaskClassification {
  const normalized = task.toLowerCase();

  if (normalized.includes("review") || normalized.includes("audit")) {
    return "review";
  }

  if (
    /\b(fix|implement|repair|harden|change|update)\b/.test(normalized) &&
    (normalized.includes("src/") ||
      normalized.includes(".test.") ||
      normalized.includes(" test ") ||
      normalized.includes("source"))
  ) {
    return "implementation";
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

export function modeForClassification(classification: TaskClassification): TaskMode {
  if (classification === "review") {
    return "review";
  }

  if (classification === "research") {
    return "read-only";
  }

  if (classification === "implementation" || classification === "docs") {
    return "edit";
  }

  return "unknown";
}

export function isNonTrivialTask(task: string): boolean {
  const words = task.trim().split(/\s+/).filter(Boolean);
  return words.length >= 3;
}
