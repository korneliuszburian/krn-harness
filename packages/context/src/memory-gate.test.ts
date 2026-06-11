import { describe, expect, it } from "vitest";
import {
  explicitlyRequestsMemory,
  hasExplicitMemoryOptOut,
  isTaskRelevantMemoryMatch,
  memoryTaskMatchMinTerms,
} from "./memory-gate.js";

describe("memory gate", () => {
  it("recognizes supported Polish memory opt-out phrases", () => {
    for (const task of [
      "Harden graph behavior bez pamięci",
      "Harden graph behavior bez pamieci",
      "Harden graph behavior nie używaj pamięci",
      "Harden graph behavior nie uzywaj pamieci",
      "Harden graph behavior nie używaj poprzednich decyzji",
      "Harden graph behavior bez wcześniejszych ustaleń",
      "Harden graph behavior bez wczesniejszych ustalen",
    ]) {
      expect(hasExplicitMemoryOptOut(task), task).toBe(true);
    }
  });

  it("keeps Polish explicit memory requests narrow and opt-out aware", () => {
    expect(explicitlyRequestsMemory("Użyj zatwierdzonej pamięci do tego zadania")).toBe(true);
    expect(explicitlyRequestsMemory("Skorzystaj z zatwierdzonej pamięci")).toBe(true);
    expect(explicitlyRequestsMemory("Opisz pamięć procesu")).toBe(false);
    expect(explicitlyRequestsMemory("Użyj zatwierdzonej pamięci, ale bez pamięci")).toBe(false);
  });

  it("requires two matched terms for task-relevant memory", () => {
    expect(memoryTaskMatchMinTerms).toBe(2);
    expect(isTaskRelevantMemoryMatch(["graph"])).toBe(false);
    expect(isTaskRelevantMemoryMatch(["graph", "selector"])).toBe(true);
  });
});
