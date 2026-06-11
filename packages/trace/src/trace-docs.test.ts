import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { traceEventNames } from "./schema.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

describe("trace docs", () => {
  it("mentions every implemented trace event name", async () => {
    const docs = await readFile(path.join(repoRoot, "docs", "specs", "trace.schema.md"), "utf8");

    for (const eventName of traceEventNames) {
      expect(docs).toContain(eventName);
    }
  });
});
