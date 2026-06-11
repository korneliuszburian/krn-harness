export const memoryTaskMatchMinTerms = 2;

const explicitMemoryRequestPatterns = [
  /\b(memory|memories|remembered|approved memory|prior decision|prior decisions|previous decision|previous decisions)\b/,
  /(?:^|\s)u[zż]yj\s+zatwierdzonej\s+pami[eę]ci(?:$|[\s.,;:!?])/,
  /(?:^|\s)skorzystaj\s+z\s+zatwierdzonej\s+pami[eę]ci(?:$|[\s.,;:!?])/,
];

const explicitMemoryOptOutPatterns = [
  /\b(without|no)\s+(approved\s+)?memor(y|ies)\b/,
  /\b(ignore|skip|exclude)\s+(approved\s+)?memor(y|ies)\b/,
  /\b(do not use|don't use)\s+(approved\s+)?memor(y|ies)\b/,
  /\b(without|no)\s+(prior|previous)\s+decisions?\b/,
  /\b(ignore|skip|exclude)\s+(prior|previous)\s+decisions?\b/,
  /\b(do not use|don't use)\s+(prior|previous)\s+decisions?\b/,
  /(?:^|\s)bez\s+(zatwierdzonej\s+)?pami[eę]ci(?:$|[\s.,;:!?])/,
  /(?:^|\s)nie\s+u[zż]ywaj\s+(zatwierdzonej\s+)?pami[eę]ci(?:$|[\s.,;:!?])/,
  /(?:^|\s)nie\s+korzystaj\s+z\s+(zatwierdzonej\s+)?pami[eę]ci(?:$|[\s.,;:!?])/,
  /(?:^|\s)(pomi[nń]|ignoruj)\s+(zatwierdzon[aą]\s+)?pami[eę][cć](?:$|[\s.,;:!?])/,
  /(?:^|\s)nie\s+u[zż]ywaj\s+(poprzednich|wcze[sś]niejszych)\s+(decyzji|ustale[nń])(?:$|[\s.,;:!?])/,
  /(?:^|\s)bez\s+(poprzednich|wcze[sś]niejszych)\s+(decyzji|ustale[nń])(?:$|[\s.,;:!?])/,
];

export function hasExplicitMemoryOptOut(task: string): boolean {
  const normalized = task.toLowerCase();
  return explicitMemoryOptOutPatterns.some((pattern) => pattern.test(normalized));
}

export function explicitlyRequestsMemory(task: string): boolean {
  if (hasExplicitMemoryOptOut(task)) {
    return false;
  }

  return explicitMemoryRequestPatterns.some((pattern) => pattern.test(task.toLowerCase()));
}

export function isTaskRelevantMemoryMatch(matchedTerms: string[]): boolean {
  return matchedTerms.length >= memoryTaskMatchMinTerms;
}
