import { access, mkdir, mkdtemp, readFile, stat, utimes, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { compactMemory } from "./compact.js";
import {
  approveMemoryById,
  deprecateMemoryById,
  listMemoryRecords,
  memoryCounts,
  memoryDir,
  memoryStorePath,
  proposeMemory,
} from "./memory-store.js";
import { memoryIdFor } from "./pending.js";
import { snapshotMemory } from "./snapshot.js";

async function tempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "krn-memory-"));
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function mtimeSeconds(filePath: string): Promise<number> {
  return stat(filePath).then((fileStat) => Math.floor(fileStat.mtimeMs / 1000));
}

describe("governed memory store", () => {
  it("creates pending memory without auto-approval", async () => {
    const cwd = await tempRepo();
    const now = new Date("2026-06-03T00:00:00.000Z");
    const result = await proposeMemory(cwd, {
      summary: "Prefer graph before context.",
      evidencePath: "docs/specs/graph-lite.md",
      now,
    });

    expect(result.status).toBe("created");
    expect(result.record).toEqual({
      schemaVersion: 1,
      id: memoryIdFor("Prefer graph before context.", "docs/specs/graph-lite.md"),
      summary: "Prefer graph before context.",
      status: "pending",
      evidencePath: "docs/specs/graph-lite.md",
      createdAt: "2026-06-03T00:00:00.000Z",
      updatedAt: "2026-06-03T00:00:00.000Z",
      source: "manual",
    });
    expect(result.counts).toEqual({ pending: 1, approved: 0, deprecated: 0 });
    expect(JSON.parse(await readFile(memoryStorePath(cwd, "pending"), "utf8"))).toMatchObject({
      schemaVersion: 1,
      status: "pending",
      records: [result.record],
    });
    expect(compactMemory(await listMemoryRecords(cwd))).toEqual([]);
  });

  it("promotes memory only through explicit approval", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Manual approval is required.",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );

    expect(approved.status).toBe("approved");
    expect(approved.record).toMatchObject({
      id: created.record?.id,
      status: "approved",
      approvedAt: "2026-06-03T00:01:00.000Z",
      updatedAt: "2026-06-03T00:01:00.000Z",
    });
    expect(approved.counts).toEqual({ pending: 0, approved: 1, deprecated: 0 });
    expect(compactMemory(await listMemoryRecords(cwd))).toEqual([approved.record]);
  });

  it("moves records to deprecated local store", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Old project assumption.",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    await approveMemoryById(cwd, created.record?.id ?? "", new Date("2026-06-03T00:01:00.000Z"));

    const deprecated = await deprecateMemoryById(cwd, created.record?.id ?? "", {
      reason: "Replaced by current spec.",
      now: new Date("2026-06-03T00:02:00.000Z"),
    });

    expect(deprecated.status).toBe("deprecated");
    expect(deprecated.record).toMatchObject({
      id: created.record?.id,
      status: "deprecated",
      deprecatedAt: "2026-06-03T00:02:00.000Z",
      deprecationReason: "Replaced by current spec.",
    });
    expect(deprecated.counts).toEqual({ pending: 0, approved: 0, deprecated: 1 });
    expect(snapshotMemory(await listMemoryRecords(cwd))).toBe(
      `deprecated: ${created.record?.id} Old project assumption.`,
    );
  });

  it("returns typed not-found results for missing records", async () => {
    const cwd = await tempRepo();

    await expect(approveMemoryById(cwd, "memory-missing")).resolves.toEqual({
      status: "not-found",
      counts: { pending: 0, approved: 0, deprecated: 0 },
    });
    await expect(deprecateMemoryById(cwd, "memory-missing")).resolves.toEqual({
      status: "not-found",
      counts: { pending: 0, approved: 0, deprecated: 0 },
    });
    await expect(memoryCounts(cwd)).resolves.toEqual({ pending: 0, approved: 0, deprecated: 0 });
  });

  it("writes only memory stores whose records changed", async () => {
    const cwd = await tempRepo();
    const oldDate = new Date("2020-01-01T00:00:00.000Z");
    const approvedPath = memoryStorePath(cwd, "approved");
    const deprecatedPath = memoryStorePath(cwd, "deprecated");
    const unchangedDeprecatedMtime = Math.floor(oldDate.getTime() / 1000);

    await mkdir(memoryDir(cwd), { recursive: true });
    await writeFile(
      approvedPath,
      `${JSON.stringify({ schemaVersion: 1, status: "approved", records: [] }, null, 2)}\n`,
      "utf8",
    );
    await writeFile(
      deprecatedPath,
      `${JSON.stringify({ schemaVersion: 1, status: "deprecated", records: [] }, null, 2)}\n`,
      "utf8",
    );
    await utimes(approvedPath, oldDate, oldDate);
    await utimes(deprecatedPath, oldDate, oldDate);

    const created = await proposeMemory(cwd, {
      summary: "Only changed memory stores are written.",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });

    await expect(fileExists(memoryStorePath(cwd, "pending"))).resolves.toBe(true);
    await expect(mtimeSeconds(approvedPath)).resolves.toBe(unchangedDeprecatedMtime);
    await expect(mtimeSeconds(deprecatedPath)).resolves.toBe(unchangedDeprecatedMtime);

    await approveMemoryById(cwd, created.record?.id ?? "", new Date("2026-06-03T00:01:00.000Z"));

    await expect(mtimeSeconds(approvedPath)).resolves.not.toBe(unchangedDeprecatedMtime);
    await expect(mtimeSeconds(deprecatedPath)).resolves.toBe(unchangedDeprecatedMtime);
  });
});
