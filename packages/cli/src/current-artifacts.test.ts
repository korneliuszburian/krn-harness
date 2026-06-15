import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { copyCurrentArtifactFile, copyRuntimeArtifactFile } from "./current-artifacts.js";

async function tempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "krn-current-artifacts-"));
}

describe("current artifact helpers", () => {
  it("copies allowlisted current artifacts into a bundle", async () => {
    const cwd = await tempRepo();
    const bundleDir = path.join(cwd, ".krn", "current", "run-bundle");
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(path.join(cwd, ".krn", "current", "run-result.json"), "{}\n", "utf8");

    const result = await copyCurrentArtifactFile({
      cwd,
      bundleDir,
      source: ".krn/current/run-result.json",
      destination: "run-result.json",
      required: true,
    });

    expect(result).toEqual({
      path: "run-result.json",
      source: ".krn/current/run-result.json",
      present: true,
      required: true,
    });
    await expect(readFile(path.join(bundleDir, "run-result.json"), "utf8")).resolves.toBe("{}\n");
  });

  it("refuses non-current and protected-looking sources for current bundles", async () => {
    const cwd = await tempRepo();
    const bundleDir = path.join(cwd, ".krn", "current", "run-bundle");

    await expect(
      copyCurrentArtifactFile({
        cwd,
        bundleDir,
        source: ".krn/traces/trace.jsonl",
        destination: "trace.jsonl",
        required: false,
      }),
    ).resolves.toMatchObject({
      present: false,
      skippedReason: "unsafe_source_path",
    });
    await expect(
      copyCurrentArtifactFile({
        cwd,
        bundleDir,
        source: ".krn/current/.env",
        destination: ".env",
        required: false,
      }),
    ).resolves.toMatchObject({
      present: false,
      skippedReason: "unsafe_source_path",
    });
  });

  it("allows runtime report bundles to copy non-current .krn evidence", async () => {
    const cwd = await tempRepo();
    const bundleDir = path.join(cwd, ".krn", "current", "report-bundle");
    await mkdir(path.join(cwd, ".krn", "dogfood"), { recursive: true });
    await writeFile(path.join(cwd, ".krn", "dogfood", "summary.json"), "{}\n", "utf8");

    const result = await copyRuntimeArtifactFile({
      cwd,
      bundleDir,
      source: ".krn/dogfood/summary.json",
      destination: "evidence/summary.json",
      required: false,
    });

    expect(result.present).toBe(true);
    expect(result.source).toBe(".krn/dogfood/summary.json");
  });
});
