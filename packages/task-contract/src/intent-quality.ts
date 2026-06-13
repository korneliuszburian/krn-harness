import type { TaskIntentQuality } from "./schema.js";

const stopwords = new Set([
  "a",
  "an",
  "and",
  "as",
  "be",
  "by",
  "do",
  "for",
  "in",
  "into",
  "is",
  "it",
  "of",
  "on",
  "or",
  "the",
  "this",
  "to",
  "use",
  "with",
  "without",
]);

export interface IntentQualityResult {
  quality: TaskIntentQuality;
  warnings: string[];
  meaningfulTerms: string[];
}

function termsFor(task: string): string[] {
  return task
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .map((term) => term.trim())
    .filter((term) => term.length >= 2 && !stopwords.has(term));
}

function isMostlyKebabCaseId(task: string): boolean {
  const trimmed = task.trim();
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/u.test(trimmed)) {
    return false;
  }

  const parts = trimmed.split("-").filter(Boolean);
  return parts.length >= 3;
}

export function evaluateTaskIntentQuality(task: string): IntentQualityResult {
  const trimmed = task.trim();
  const terms = termsFor(trimmed);
  const warnings: string[] = [];
  const mostlyKebabCaseId = isMostlyKebabCaseId(trimmed);

  if (mostlyKebabCaseId) {
    warnings.push(
      "Task intent looks like a slug or task id; pass the full user intent to krn start.",
    );
  }

  if (trimmed.length > 0 && trimmed.length < 24) {
    warnings.push("Task intent is very short.");
  }

  if (terms.length < 3 && trimmed.length > 0) {
    warnings.push("Task intent has fewer than 3 meaningful terms.");
  }

  if (/^wp-[a-z0-9-]+$/u.test(trimmed) && terms.length < 5) {
    warnings.push("Dogfood-shaped task id lacks prompt, constraints, and proof requirements.");
  }

  if (warnings.length >= 2 || (mostlyKebabCaseId && terms.length < 5)) {
    return { quality: "low", warnings, meaningfulTerms: terms };
  }

  if (warnings.length > 0 || terms.length < 7 || trimmed.length < 80) {
    return { quality: "medium", warnings, meaningfulTerms: terms };
  }

  return { quality: "high", warnings, meaningfulTerms: terms };
}
