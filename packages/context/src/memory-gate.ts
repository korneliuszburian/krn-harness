export const memoryTaskMatchMinTerms = 2;

const explicitMemoryRequestPattern =
  /\b(memory|memories|remembered|approved memory|prior decision|prior decisions|previous decision|previous decisions)\b/;

const explicitMemoryOptOutPatterns = [
  /\b(without|no)\s+(approved\s+)?memor(y|ies)\b/,
  /\b(ignore|skip|exclude)\s+(approved\s+)?memor(y|ies)\b/,
  /\b(do not use|don't use)\s+(approved\s+)?memor(y|ies)\b/,
  /\b(without|no)\s+(prior|previous)\s+decisions?\b/,
  /\b(ignore|skip|exclude)\s+(prior|previous)\s+decisions?\b/,
  /\b(do not use|don't use)\s+(prior|previous)\s+decisions?\b/,
];

export function hasExplicitMemoryOptOut(task: string): boolean {
  const normalized = task.toLowerCase();
  return explicitMemoryOptOutPatterns.some((pattern) => pattern.test(normalized));
}

export function explicitlyRequestsMemory(task: string): boolean {
  if (hasExplicitMemoryOptOut(task)) {
    return false;
  }

  return explicitMemoryRequestPattern.test(task.toLowerCase());
}

export function isTaskRelevantMemoryMatch(matchedTerms: string[]): boolean {
  return matchedTerms.length >= memoryTaskMatchMinTerms;
}
