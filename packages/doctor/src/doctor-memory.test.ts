import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { approveMemoryById, deprecateMemoryById, proposeMemory } from "../../memory/src/index.js";
import { runDoctor } from "./doctor.js";

async function tempRepo(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), "krn-doctor-"));
}

describe("doctor result governed memory", () => {
  it("reports valid governed memory stores", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Memory stays pending until approval.",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    await approveMemoryById(cwd, created.record?.id ?? "", new Date("2026-06-03T00:01:00.000Z"));
    await deprecateMemoryById(cwd, created.record?.id ?? "", {
      reason: "Superseded by current spec.",
      now: new Date("2026-06-03T00:02:00.000Z"),
    });

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "memory-stores",
      status: "pass",
      detail: "Memory stores: pending 0, approved 0, deprecated 1",
    });
  });

  it("reports malformed governed memory stores as failures", async () => {
    const cwd = await tempRepo();
    await mkdir(path.join(cwd, ".krn", "memory"), { recursive: true });
    await writeFile(path.join(cwd, ".krn", "memory", "pending.json"), "not json\n", "utf8");

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-stores",
      status: "fail",
      detail: ".krn/memory/pending.json is malformed",
    });
  });

  it("passes approved memory context only when reference-only with provenance", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/approved.json#${approved.record?.id}`,
              reason: "Approved governed memory reference: Graph selector should remain generic.",
              priority: 33,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              matchedTerms: ["graph", "selector"],
              memoryId: approved.record?.id,
              memorySummary: "Graph selector should remain generic.",
              approvedAt: "2026-06-03T00:01:00.000Z",
              evidencePath: "docs/specs/graph-lite.md",
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [
              {
                path: `.krn/memory/approved.json#${approved.record?.id}`,
                reason: "Approved governed memory reference: Graph selector should remain generic.",
                priority: 33,
                bucket: "reference-only",
                status: "available",
                source: "memory",
                selector: "approved-memory-task-match",
                matchedTerms: ["graph", "selector"],
                memoryId: approved.record?.id,
                memorySummary: "Graph selector should remain generic.",
                approvedAt: "2026-06-03T00:01:00.000Z",
                evidencePath: "docs/specs/graph-lite.md",
              },
            ],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "pass",
      detail: "1 approved memory reference(s) are reference-only with provenance",
    });
  });

  it("fails broad single-term memory task matches in current context", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/approved.json#${approved.record?.id}`,
              reason: "Approved governed memory reference: Graph selector should remain generic.",
              priority: 33,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              matchedTerms: ["graph"],
              memoryId: approved.record?.id,
              memorySummary: "Graph selector should remain generic.",
              approvedAt: "2026-06-03T00:01:00.000Z",
              evidencePath: "docs/specs/graph-lite.md",
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "fail",
      detail: `Memory ${approved.record?.id} task match is too broad`,
    });
  });

  it("fails surfaced memory when the current task explicitly opts out", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      '{"task":"Harden graph selector behavior without approved memory"}\n',
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/approved.json#${approved.record?.id}`,
              reason: "Approved governed memory reference: Graph selector should remain generic.",
              priority: 33,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              matchedTerms: ["graph", "selector"],
              memoryId: approved.record?.id,
              memorySummary: "Graph selector should remain generic.",
              approvedAt: "2026-06-03T00:01:00.000Z",
              evidencePath: "docs/specs/graph-lite.md",
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "fail",
      detail: `Current task explicitly opts out of memory but ${approved.record?.id} is surfaced`,
    });
  });

  it("fails surfaced memory when the current task uses Polish memory opt-out", async () => {
    const cwd = await tempRepo();
    const created = await proposeMemory(cwd, {
      summary: "Graph selector should remain generic.",
      evidencePath: "docs/specs/graph-lite.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    const approved = await approveMemoryById(
      cwd,
      created.record?.id ?? "",
      new Date("2026-06-03T00:01:00.000Z"),
    );
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "task-contract.json"),
      '{"task":"Harden graph selector behavior bez pamięci"}\n',
      "utf8",
    );
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/approved.json#${approved.record?.id}`,
              reason: "Approved governed memory reference: Graph selector should remain generic.",
              priority: 33,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              matchedTerms: ["graph", "selector"],
              memoryId: approved.record?.id,
              memorySummary: "Graph selector should remain generic.",
              approvedAt: "2026-06-03T00:01:00.000Z",
              evidencePath: "docs/specs/graph-lite.md",
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "fail",
      detail: `Current task explicitly opts out of memory but ${approved.record?.id} is surfaced`,
    });
  });

  it("fails pending memory leakage in current context", async () => {
    const cwd = await tempRepo();
    const pending = await proposeMemory(cwd, {
      summary: "Pending memory should not be active.",
      evidencePath: "docs/specs/memory.schema.md",
      now: new Date("2026-06-03T00:00:00.000Z"),
    });
    await mkdir(path.join(cwd, ".krn", "current"), { recursive: true });
    await writeFile(
      path.join(cwd, ".krn", "current", "context-package.json"),
      `${JSON.stringify(
        {
          items: [
            {
              path: `.krn/memory/pending.json#${pending.record?.id}`,
              reason: "Pending memory leaked",
              priority: 99,
              bucket: "reference-only",
              status: "available",
              source: "memory",
              selector: "approved-memory-task-match",
              memoryId: pending.record?.id,
            },
          ],
          buckets: {
            mustRead: [],
            shouldRead: [],
            referenceOnly: [],
            doNotUse: [],
            missingContext: [],
          },
          coverage: { required: 0, present: 0, missing: 0 },
          stop: false,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const result = await runDoctor(cwd);

    expect(result.status).toBe("fail");
    expect(result.checks).toContainEqual({
      name: "memory-context-gate",
      status: "fail",
      detail: `Pending memory ${pending.record?.id} leaked into context`,
    });
  });
});
