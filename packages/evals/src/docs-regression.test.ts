import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

async function readDoc(relativePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("P0 docs anti-regression", () => {
  it("keeps downstream acceptance and eval scope explicit", async () => {
    const evalSpec = await readDoc("docs/specs/eval-result.schema.md");
    const downstreamSpec = await readDoc("docs/specs/downstream-acceptance.md");

    expect(evalSpec).toContain("Downstream Acceptance");
    expect(evalSpec).toContain("without installing into the source checkout");
    expect(evalSpec).toContain("invoking Codex");
    expect(downstreamSpec).toContain("does not launch Codex");
    expect(downstreamSpec).toContain(
      "does not claim CI, sandbox, hosted, or production enforcement",
    );
  });

  it("keeps hook trace and sandbox boundaries explicit", async () => {
    const hooksSpec = await readDoc("docs/specs/hooks-pack.md");
    const traceSpec = await readDoc("docs/specs/trace.schema.md");

    expect(hooksSpec).toContain("not a complete security boundary or sandbox");
    expect(hooksSpec).toContain("must not change allow/warn/block semantics");
    expect(traceSpec).toContain("must not include long operator text");
    expect(traceSpec).toContain("buildHookTracePayload(result)");
  });

  it("keeps Codex non-interactive feasibility separate from implemented evals", async () => {
    const feasibility = await readDoc("docs/specs/codex-noninteractive-feasibility.md");

    expect(feasibility).toContain("does not implement a Codex runner");
    expect(feasibility).toContain("must not claim a working non-interactive eval runner");
    expect(feasibility).toContain("launch Codex non-interactively");
  });

  it("keeps verify profile docs explicit about policy and non-execution", async () => {
    const verifySpec = await readDoc("docs/specs/verify-result.schema.md");
    const configSpec = await readDoc("docs/specs/krn-config.schema.md");

    expect(verifySpec).toContain("record-only");
    expect(verifySpec).toContain("Execute mode runs only allowlisted command/args");
    expect(verifySpec).toContain("Shell syntax, redirects, pipes");
    expect(verifySpec).toContain("never store environment variables");
    expect(configSpec).toContain("verify.profiles");
    expect(configSpec).toContain("verify.defaultProfile");
  });

  it("does not describe current P0 docs as skeleton-only output", async () => {
    const readme = await readDoc("README.md");
    const architecture = await readDoc("docs/architecture/architecture-spec-v0.1.md");

    expect(readme).not.toMatch(/skeletal|skeleton/i);
    expect(architecture).not.toMatch(/skeletal|skeleton/i);
  });
});
