import { calculateRegionalTax } from "./regional-tax.ts";

function expectEqual(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`expected ${expected}, received ${actual}`);
  }
}

expectEqual(calculateRegionalTax(10000, "standard"), 750);
expectEqual(calculateRegionalTax(10000, "reduced"), 250);
expectEqual(calculateRegionalTax(99, "standard"), 7);
