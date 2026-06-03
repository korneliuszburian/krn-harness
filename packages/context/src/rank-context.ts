import type { ContextItem } from "./schema.js";

export function rankContext(items: ContextItem[]): ContextItem[] {
  return [...items].sort(
    (left, right) => right.priority - left.priority || left.path.localeCompare(right.path),
  );
}
