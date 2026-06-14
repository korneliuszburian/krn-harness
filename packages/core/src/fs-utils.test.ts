import { mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pathExists, readJsonFile } from "./fs-utils.js";

describe("fs utils", () => {
  it("checks path existence without throwing", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "krn-fs-utils-"));
    const filePath = path.join(dir, "value.json");
    await writeFile(filePath, "{}", "utf8");

    await expect(pathExists(filePath)).resolves.toBe(true);
    await expect(pathExists(path.join(dir, "missing.json"))).resolves.toBe(false);
  });

  it("reads JSON files and returns undefined for missing or invalid input", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "krn-fs-utils-"));
    const validPath = path.join(dir, "valid.json");
    const invalidPath = path.join(dir, "invalid.json");
    await writeFile(validPath, JSON.stringify({ ok: true }), "utf8");
    await writeFile(invalidPath, "{", "utf8");

    await expect(readJsonFile<{ ok: boolean }>(validPath)).resolves.toEqual({ ok: true });
    await expect(readJsonFile(path.join(dir, "missing.json"))).resolves.toBeUndefined();
    await expect(readJsonFile(invalidPath)).resolves.toBeUndefined();
  });
});
