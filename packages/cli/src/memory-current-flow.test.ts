import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { readJson, readTraceEvents, runInCwd, runInTemp } from "./cli-test-utils.js";

describe("krn CLI memory governance", () => {
  it("runs the manual governed memory workflow without auto-approval", async () => {
    const proposed = await runInTemp([
      "memory",
      "propose",
      "Prefer",
      "manual",
      "memory",
      "--evidence",
      "docs/specs/memory.schema.md",
    ]);

    expect(proposed.code).toBe(0);
    expect(proposed.stdout).toContain("KRN memory: proposed");
    expect(proposed.stdout).toContain("status: pending");
    expect(proposed.stdout).toContain("store: .krn/memory/pending.json");

    const pendingStore = await readJson<{
      status: string;
      records: Array<{ id: string; status: string; summary: string; evidencePath?: string }>;
    }>(proposed.cwd, ".krn/memory/pending.json");
    const memoryId = pendingStore.records[0]?.id ?? "";

    expect(pendingStore).toMatchObject({
      status: "pending",
      records: [
        {
          id: memoryId,
          status: "pending",
          summary: "Prefer manual memory",
          evidencePath: "docs/specs/memory.schema.md",
        },
      ],
    });
    await expect(
      readFile(path.join(proposed.cwd, ".krn/memory/approved.json"), "utf8"),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });

    const approved = await runInCwd(proposed.cwd, ["memory", "approve", memoryId]);

    expect(approved.code).toBe(0);
    expect(approved.stdout).toContain("KRN memory: approved");
    expect(approved.stdout).toContain("store: .krn/memory/approved.json");
    await expect(readJson(proposed.cwd, ".krn/memory/pending.json")).resolves.toMatchObject({
      records: [],
    });
    await expect(readJson(proposed.cwd, ".krn/memory/approved.json")).resolves.toMatchObject({
      records: [
        {
          id: memoryId,
          status: "approved",
          approvedAt: "2026-06-03T00:00:00.000Z",
        },
      ],
    });

    const deprecated = await runInCwd(proposed.cwd, [
      "memory",
      "deprecate",
      memoryId,
      "superseded",
      "by",
      "canon",
    ]);

    expect(deprecated.code).toBe(0);
    expect(deprecated.stdout).toContain("KRN memory: deprecated");
    expect(deprecated.stdout).toContain("reason: superseded by canon");
    await expect(readJson(proposed.cwd, ".krn/memory/approved.json")).resolves.toMatchObject({
      records: [],
    });
    await expect(readJson(proposed.cwd, ".krn/memory/deprecated.json")).resolves.toMatchObject({
      records: [
        {
          id: memoryId,
          status: "deprecated",
          deprecationReason: "superseded by canon",
        },
      ],
    });

    const listed = await runInCwd(proposed.cwd, ["memory", "list"]);

    expect(listed.code).toBe(0);
    expect(listed.stdout).toContain("pending: 0");
    expect(listed.stdout).toContain("approved: 0");
    expect(listed.stdout).toContain("deprecated: 1");
    expect(listed.stdout).toContain(`- deprecated ${memoryId}: Prefer manual memory`);

    await expect(readTraceEvents(proposed.cwd)).resolves.toMatchObject([
      {
        name: "memory.proposed",
        data: {
          id: memoryId,
          status: "pending",
          evidencePath: "docs/specs/memory.schema.md",
          pending: 1,
          approved: 0,
          deprecated: 0,
        },
      },
      {
        name: "memory.approved",
        data: {
          id: memoryId,
          status: "approved",
          pending: 0,
          approved: 1,
          deprecated: 0,
        },
      },
      {
        name: "memory.deprecated",
        data: {
          id: memoryId,
          status: "deprecated",
          reason: "superseded by canon",
          pending: 0,
          approved: 0,
          deprecated: 1,
        },
      },
      {
        name: "memory.listed",
        data: {
          pending: 0,
          approved: 0,
          deprecated: 1,
        },
      },
    ]);
  });

  it("reports missing memory records without crashing", async () => {
    const approved = await runInTemp(["memory", "approve", "memory-missing"]);
    const deprecated = await runInCwd(approved.cwd, ["memory", "deprecate", "memory-missing"]);

    expect(approved.code).toBe(1);
    expect(approved.stderr).toContain("KRN memory approve: memory not found: memory-missing");
    expect(deprecated.code).toBe(1);
    expect(deprecated.stderr).toContain("KRN memory deprecate: memory not found: memory-missing");
  });

  it("surfaces approved memory in context only after manual approval", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Graph",
      "selector",
      "should",
      "stay",
      "generic",
      "--evidence",
      "docs/specs/graph-lite.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{
      records: Array<{ id: string }>;
    }>(cwd, ".krn/memory/pending.json");
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["start", "Harden", "graph", "selector"])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const contextBeforeApproval = await readJson<{
      buckets: { referenceOnly: Array<{ source?: string; memoryId?: string }> };
    }>(cwd, ".krn/current/context-package.json");
    expect(
      contextBeforeApproval.buckets.referenceOnly.some((item) => item.source === "memory"),
    ).toBe(false);

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const contextAfterApproval = await readJson<{
      buckets: {
        mustRead: Array<{ memoryId?: string }>;
        shouldRead: Array<{ memoryId?: string }>;
        referenceOnly: Array<{
          path: string;
          source?: string;
          selector?: string;
          memoryId?: string;
          approvedAt?: string;
          evidencePath?: string;
          matchedTerms?: string[];
        }>;
      };
    }>(cwd, ".krn/current/context-package.json");
    const markdown = await readFile(path.join(cwd, ".krn/current/context-package.md"), "utf8");

    expect(contextAfterApproval.buckets.mustRead.some((item) => item.memoryId === memoryId)).toBe(
      false,
    );
    expect(contextAfterApproval.buckets.shouldRead.some((item) => item.memoryId === memoryId)).toBe(
      false,
    );
    expect(contextAfterApproval.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        path: `.krn/memory/approved.json#${memoryId}`,
        source: "memory",
        selector: "approved-memory-task-match",
        memoryId,
        approvedAt: "2026-06-03T00:00:00.000Z",
        evidencePath: "docs/specs/graph-lite.md",
        matchedTerms: ["graph", "selector"],
      }),
    );
    expect(markdown).toContain(`.krn/memory/approved.json#${memoryId}`);
    expect(markdown).toContain("source: memory, selector: approved-memory-task-match");
  });

  it("honors memory opt-out when building current context from approved memory", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Graph",
      "selector",
      "should",
      "stay",
      "generic",
      "--evidence",
      "docs/specs/graph-lite.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{ records: Array<{ id: string }> }>(
      cwd,
      ".krn/memory/pending.json",
    );
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(
      runInCwd(cwd, [
        "start",
        "Harden",
        "graph",
        "selector",
        "behavior",
        "without",
        "approved",
        "memory",
      ]),
    ).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const context = await readJson<{
      items: Array<{ source?: string; memoryId?: string }>;
      buckets: { referenceOnly: Array<{ source?: string; memoryId?: string }> };
    }>(cwd, ".krn/current/context-package.json");

    expect(context.items.some((item) => item.source === "memory")).toBe(false);
    expect(context.buckets.referenceOnly.some((item) => item.memoryId === memoryId)).toBe(false);
  });

  it("honors Polish memory opt-out when building current context from approved memory", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Graph",
      "selector",
      "should",
      "stay",
      "generic",
      "--evidence",
      "docs/specs/graph-lite.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{ records: Array<{ id: string }> }>(
      cwd,
      ".krn/memory/pending.json",
    );
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(
      runInCwd(cwd, ["start", "Harden", "graph", "selector", "behavior", "bez", "pamięci"]),
    ).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const context = await readJson<{
      items: Array<{ source?: string; memoryId?: string }>;
      buckets: { referenceOnly: Array<{ source?: string; memoryId?: string }> };
    }>(cwd, ".krn/current/context-package.json");

    expect(context.items.some((item) => item.source === "memory")).toBe(false);
    expect(context.buckets.referenceOnly.some((item) => item.memoryId === memoryId)).toBe(false);
  });

  it("surfaces approved memory for explicit Polish memory request through the CLI", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "krn-harness-"));
    const proposed = await runInCwd(cwd, [
      "memory",
      "propose",
      "Prefer",
      "short",
      "handoff",
      "summaries",
      "--evidence",
      "docs/specs/handoff.md",
    ]);
    expect(proposed).toMatchObject({ code: 0 });

    const pending = await readJson<{ records: Array<{ id: string }> }>(
      cwd,
      ".krn/memory/pending.json",
    );
    const memoryId = pending.records[0]?.id ?? "";

    await expect(runInCwd(cwd, ["memory", "approve", memoryId])).resolves.toMatchObject({
      code: 0,
    });
    await expect(
      runInCwd(cwd, ["start", "Użyj", "zatwierdzonej", "pamięci", "do", "tego", "zadania"]),
    ).resolves.toMatchObject({ code: 0 });
    await expect(runInCwd(cwd, ["context"])).resolves.toMatchObject({ code: 0 });

    const context = await readJson<{
      buckets: {
        referenceOnly: Array<{
          source?: string;
          selector?: string;
          memoryId?: string;
          evidencePath?: string;
        }>;
      };
    }>(cwd, ".krn/current/context-package.json");

    expect(context.buckets.referenceOnly).toContainEqual(
      expect.objectContaining({
        source: "memory",
        selector: "approved-memory-explicit",
        memoryId,
        evidencePath: "docs/specs/handoff.md",
      }),
    );
  });
});
