import { formatInvoiceTotal } from "./index.ts";

function expectEqual(actual: string, expected: string): void {
  if (actual !== expected) {
    throw new Error(`expected ${expected}, received ${actual}`);
  }
}

expectEqual(formatInvoiceTotal(1234), "$12.34");
expectEqual(formatInvoiceTotal(5), "$0.05");
expectEqual(formatInvoiceTotal(0), "$0.00");
