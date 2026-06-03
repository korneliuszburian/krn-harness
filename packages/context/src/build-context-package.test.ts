import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildTaskContract } from "../../task-contract/src/index.js";
import { buildContextPackage } from "./build-context-package.js";
import { renderContextPackageMarkdown } from "./render-md.js";

interface ContextTaskFixture {
  task: string;
  expected: {
    stop: boolean;
    mustRead?: string[];
    referenceOnly?: string[];
    doNotUse?: string[];
    missingContext?: string[];
  };
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readTaskFixture(name: string): ContextTaskFixture {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "fixtures", "tasks", `${name}.json`), "utf8"),
  ) as ContextTaskFixture;
}

describe("context package", () => {
  it("ranks frontend-section fixture context into must-read and reference buckets", () => {
    const fixture = readTaskFixture("frontend-section-context");
    const contract = buildTaskContract(fixture.task);
    const pkg = buildContextPackage(contract);

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.taskId).toBe("task-9eddfd5aa2d1");
    expect(pkg.buckets.mustRead.map((item) => item.path)).toEqual(fixture.expected.mustRead);
    expect(pkg.buckets.referenceOnly.map((item) => item.path)).toEqual(
      expect.arrayContaining(fixture.expected.referenceOnly ?? []),
    );
    expect(pkg.coverage).toEqual({
      required: 4,
      present: 4,
      missing: 0,
      confidence: "high",
      overInclusionRisk: "low",
    });
  });

  it("keeps deprecated stale docs out of must-read context", () => {
    const fixture = readTaskFixture("stale-doc-trap");
    const contract = buildTaskContract(fixture.task);
    const pkg = buildContextPackage(contract);

    const staleDoc = fixture.expected.doNotUse?.[0] ?? "";
    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.buckets.mustRead.map((item) => item.path)).not.toContain(staleDoc);
    expect(pkg.buckets.doNotUse).toEqual([
      {
        path: staleDoc,
        reason: "Deprecated fixture doc must not enter active context",
        priority: 100,
        bucket: "do-not-use",
        status: "deprecated",
      },
    ]);
  });

  it("sets STOP when required context is missing", () => {
    const fixture = readTaskFixture("missing-context-stop");
    const contract = buildTaskContract(fixture.task);
    const pkg = buildContextPackage(contract);
    const missingPath = fixture.expected.missingContext?.[0] ?? "";

    expect(pkg.stop).toBe(fixture.expected.stop);
    expect(pkg.stopReason).toBe(`Required context is missing: ${missingPath}`);
    expect(pkg.buckets.missingContext).toEqual([
      {
        path: missingPath,
        reason: "Required fixture context is absent",
        priority: 100,
        bucket: "missing-context",
        status: "missing",
      },
    ]);
    expect(pkg.coverage.confidence).toBe("low");
  });

  it("renders bucketed markdown for Codex-readable current state", () => {
    const contract = buildTaskContract("Stop when required context is missing");
    const markdown = renderContextPackageMarkdown(buildContextPackage(contract));

    expect(markdown).toContain("## Must Read");
    expect(markdown).toContain("## Missing Context");
    expect(markdown).toContain("STOP: true");
    expect(markdown).toContain("Coverage: 1/2 required present");
    expect(markdown).toContain("fixtures/repos/missing-context-stop/docs/required-context.md");
  });
});
