import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { helpText } from "../../cli/src/index.js";

async function readDoc(relativePath: string): Promise<string> {
  return readFile(path.join(process.cwd(), relativePath), "utf8");
}

describe("P0 docs anti-regression", () => {
  it("keeps README command examples aligned with CLI help", async () => {
    const readme = await readDoc("README.md");
    const helpCommands = helpText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("krn "));

    for (const command of helpCommands) {
      const commandPrefix = command
        .replace(' "<task>"', "")
        .replace(" [--profile <name>] [--execute]", "")
        .replace(" <command>", "")
        .replace(" <event>", "");
      expect(readme).toContain(`pnpm --silent ${commandPrefix}`);
    }

    expect(readme).toContain("pnpm --silent krn verify --execute");
  });

  it("keeps downstream acceptance and eval scope explicit", async () => {
    const evalSpec = await readDoc("docs/specs/eval-result.schema.md");
    const downstreamSpec = await readDoc("docs/specs/downstream-acceptance.md");
    const demo = await readDoc("docs/demo/downstream-basic-demo.md");

    expect(evalSpec).toContain("Downstream Acceptance");
    expect(evalSpec).toContain("without installing into the source checkout");
    expect(evalSpec).toContain("invoking Codex");
    expect(downstreamSpec).toContain("does not launch Codex");
    expect(downstreamSpec).toContain(
      "does not claim CI, sandbox, hosted, or production enforcement",
    );
    for (const command of [
      "krn install",
      "krn status",
      "krn start",
      "krn graph",
      "krn context",
      "krn verify",
      "krn verify --execute",
      "krn handoff",
      "krn doctor",
      "krn eval",
    ]) {
      expect(demo).toContain(command);
    }
    expect(demo).toContain("does not launch Codex");
    expect(demo).toContain("Hooks are guardrails and trace points, not a sandbox");
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
    const adr = await readDoc("docs/adr/ADR-0012-future-codex-exec-wrapper.md");

    expect(feasibility).toContain("does not implement a Codex runner");
    expect(feasibility).toContain("must not claim a working non-interactive eval runner");
    expect(feasibility).toContain("launch Codex non-interactively");
    expect(adr).toContain("Proposed.");
    expect(adr).toContain("Do not implement a Codex exec wrapper in P0");
    expect(adr).toContain("local dry-run/no-mutation");
    expect(adr).toContain("no CI dependency on Codex CLI availability");
  });

  it("keeps dogfood lab local, optional, and artifact-first", async () => {
    const demo = await readDoc("docs/demo/codex-dogfood.md");
    const schema = await readDoc("docs/specs/dogfood-result.schema.md");
    const principles = await readDoc("docs/research/agentic-coding-principles.md");

    expect(demo).toContain("manual-first");
    expect(demo).toContain("krn --help");
    expect(demo).toContain("RUN_KRN_CODEX_DOGFOOD=1");
    expect(demo).toContain("not a production Codex runner");
    expect(schema).toContain("baseline");
    expect(schema).toContain("krn-explicit-skill");
    expect(schema).toContain("hook.received");
    expect(schema).toContain("Self-report is not sufficient evidence");
    expect(schema).toContain("must not make `pnpm test` or CI depend on Codex CLI");
    expect(principles).toContain("Measure explicit skill usage");
    expect(principles).toContain("Treat self-report as weak evidence");
    expect(principles).toContain("No production Codex runner");
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

  it("keeps release prep local and unpublished", async () => {
    const checklist = await readDoc("docs/release/checklist.md");

    expect(checklist).toContain("local `bin` metadata for dogfood linking only");
    expect(checklist).toContain("not a publish-ready package boundary");
    expect(checklist).toContain("Do not publish from P0");
    expect(checklist).toContain("Do not add GitHub Actions");
    expect(checklist).toContain("Codex CLI CI dependency");
  });

  it("keeps P0 non-goals and memory approval boundaries explicit", async () => {
    const readme = await readDoc("README.md");
    const architecture = await readDoc("docs/architecture/architecture-spec-v0.1.md");
    const memorySpec = await readDoc("docs/specs/memory.schema.md");

    for (const phrase of [
      "dashboard",
      "MCP server",
      "multi-agent orchestrator",
      "vector DB",
      "semantic embeddings",
      "Tree-sitter",
      "GitHub Action",
      "plugin distribution",
      "auto-approved memory",
    ]) {
      expect(readme).toContain(phrase);
      expect(architecture).toContain(phrase);
    }

    expect(memorySpec).toContain("P0 never auto-approves memory");
    expect(memorySpec).toContain("Pending and deprecated records are not active memory");
  });
});
