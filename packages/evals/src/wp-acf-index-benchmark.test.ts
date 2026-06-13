import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { runWpAcfIndexBenchmark } from "./wp-acf-index-benchmark.js";

describe("WP/ACF index benchmark runner", () => {
  it("skips paid Codex execution unless explicitly approved", async () => {
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "krn-wp-acf-index-skip-"));
    const summary = await runWpAcfIndexBenchmark({
      runRoot,
      now: new Date("2026-06-13T00:00:00.000Z"),
    });

    expect(summary).toMatchObject({
      schema: "krn-wp-acf-index-benchmark-v1",
      runId: "wp-acf-index-2026-06-13T00-00-00-000Z",
      status: "skipped",
      pinnedKrnPath: null,
      taskIds: [
        "wp-acf-hero-copy",
        "wp-acf-field-mapping",
        "wp-css-token-change",
        "wp-js-data-attribute",
        "wp-stale-doc-trap",
        "wp-missing-context-stop",
        "wp-package-owned-source-test",
        "wp-handoff-required",
      ],
      aggregates: [
        {
          mode: "baseline",
          tasks: 0,
          taskPasses: 0,
          taskFailures: 0,
          totalPass: 0,
          totalFail: 0,
          invalidRuns: 0,
        },
        {
          mode: "krn-explicit-skill",
          tasks: 0,
          taskPasses: 0,
          taskFailures: 0,
          totalPass: 0,
          totalFail: 0,
          invalidRuns: 0,
        },
      ],
    });
    expect(summary.skippedReason).toContain("KRN_WP_ACF_INDEX_BENCHMARK_APPROVED=1");
    expect(summary.results).toEqual([]);

    const summaryJson = JSON.parse(await readFile(path.join(runRoot, "summary.json"), "utf8"));
    const summaryMarkdown = await readFile(path.join(runRoot, "summary.md"), "utf8");

    expect(summaryJson).toMatchObject({
      schema: "krn-wp-acf-index-benchmark-v1",
      status: "skipped",
    });
    expect(summaryMarkdown).toContain("Status: skipped");
    expect(summaryMarkdown).toContain("Pinned KRN: none");
  });

  it("can limit modes and task ids for controlled reruns", async () => {
    const runRoot = await mkdtemp(path.join(os.tmpdir(), "krn-wp-acf-index-skip-"));
    const summary = await runWpAcfIndexBenchmark({
      runRoot,
      modes: ["krn-explicit-skill"],
      taskIds: ["wp-acf-field-mapping"],
      now: new Date("2026-06-13T00:00:00.000Z"),
    });

    expect(summary).toMatchObject({
      status: "skipped",
      modes: ["krn-explicit-skill"],
      taskIds: ["wp-acf-field-mapping"],
      aggregates: [
        {
          mode: "krn-explicit-skill",
          tasks: 0,
          invalidRuns: 0,
        },
      ],
    });
  });
});
