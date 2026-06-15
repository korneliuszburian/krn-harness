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
        .replace(' --task "<task>" [--dry-run] [--json] [--execute-verify] [--bundle]', " --task")
        .replace(" --task-spec <json> [--execute-verify] [--bundle]", " --task-spec")
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
    expect(evalSpec).toContain("product-code-tax-dogfood");
    expect(evalSpec).toContain("src/regional-tax.ts");
    expect(evalSpec).toContain("without installing into the source checkout");
    expect(evalSpec).toContain("invoking Codex");
    expect(downstreamSpec).toContain("does not launch Codex");
    expect(downstreamSpec).toContain("./.krn/bin/krn hook codex <event>");
    expect(downstreamSpec).toContain(
      "does not claim CI, sandbox, hosted, or production enforcement",
    );
    for (const command of ["krn install", "krn status", "krn run", "krn doctor", "krn eval"]) {
      expect(demo).toContain(command);
    }
    expect(demo).toContain("only when diagnosing individual plumbing artifacts");
    expect(demo).toContain("does not launch Codex");
    expect(demo).toContain("Hooks are guardrails and trace points, not a sandbox");
  });

  it("keeps hook trace and sandbox boundaries explicit", async () => {
    const hooksSpec = await readDoc("docs/specs/hooks-pack.md");
    const traceSpec = await readDoc("docs/specs/trace.schema.md");
    const hookAdr = await readDoc("docs/adr/ADR-0004-codex-hooks-as-guardrails.md");
    const operatorSummarySchema = await readDoc("docs/specs/operator-summary.schema.md");

    expect(hooksSpec).toContain("not a complete security boundary or sandbox");
    expect(hooksSpec).toContain("must not change allow/warn/block semantics");
    expect(hooksSpec).toContain("Hook decisions can be `allow`, `warn`, or `block`");
    expect(hooksSpec).toContain("P1 still records `enforced: false`");
    expect(hooksSpec).toContain("Manual `krn hook codex <event>` probes");
    expect(hooksSpec).not.toMatch(/hooks are enforced/i);
    expect(hookAdr).toContain("not as a sandbox or full policy engine");
    expect(operatorSummarySchema).toContain(
      "Manual `krn hook codex <event>` traces are `manual-diagnostic-only`",
    );
    expect(operatorSummarySchema).toContain(
      "Trusted non-manual hook-load markers are `partially-proven`",
    );
    expect(traceSpec).toContain("must not include long operator text");
    expect(traceSpec).toContain("buildHookTracePayload(result)");
    expect(hooksSpec).toContain("./.krn/bin/krn hook codex <event>");
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
    const realRepo = await readDoc("docs/demo/real-repo-dogfood.md");
    const wpExplicitSkill = await readDoc("fixtures/dogfood/skills/wp-acf-explicit-krn-skill.md");
    const hookExample = await readDoc("docs/demo/hook-trust-probe-example.json");
    const schema = await readDoc("docs/specs/dogfood-result.schema.md");
    const dogfoodAdr = await readDoc(
      "docs/adr/ADR-0013-dogfood-cli-identity-and-real-repo-preflight.md",
    );
    const principles = await readDoc("docs/research/agentic-coding-principles.md");

    expect(demo).toContain("manual-first");
    expect(demo).toContain("krn --help");
    expect(demo).toContain("Do not trust a global `krn`");
    expect(demo).toContain("global `krn` collision");
    expect(demo).toContain("scripts/krn-local-shim.sh");
    expect(demo).toContain("krn doctor cli");
    expect(demo).toContain("krn-harness-cli-identity-v1");
    expect(demo).toContain("scripts/krn-dogfood-preflight.sh");
    expect(demo).toContain("Hook Trust/Loading Probe");
    expect(demo).toContain("Do not use `--dangerously-bypass-hook-trust`");
    expect(demo).toContain("project `.codex/` layer is trusted");
    expect(demo).toContain("Use `/hooks` in interactive Codex");
    expect(demo).toContain("RUN_KRN_CODEX_DOGFOOD=1");
    expect(demo).toContain("WordPress/ACF Fixture Protocol");
    expect(demo).toContain("without WordPress, PHP, Composer, or network access");
    expect(demo).toContain("wp-acf-theme-index.json");
    expect(demo).toContain("wp-acf-explicit-krn-skill.md");
    expect(demo).toContain("pnpm dogfood:wp-acf");
    expect(demo).toContain("KRN_WP_ACF_INDEX_BENCHMARK_APPROVED=1");
    expect(demo).toContain("writes a skipped report and does not invoke Codex");
    expect(demo).toContain("redacted before persistence");
    expect(demo).toContain("does not pass a full inherited shell environment");
    expect(demo).toContain("not a production Codex runner");
    expect(schema).toContain("baseline");
    expect(schema).toContain("krn-explicit-skill");
    expect(schema).toContain("requiredDoNotUsePaths");
    expect(schema).toContain("minExecutedCommands");
    expect(schema).toContain("krnCommandPath");
    expect(schema).toContain("ambientKrnCommandPath");
    expect(schema).toContain("krnIdentityValid");
    expect(schema).toContain("globalKrnFallbackUsed");
    expect(schema).toContain("Run Validity");
    expect(schema).toContain("Evidence Artifacts");
    expect(schema).toContain("Context Quality");
    expect(schema).toContain("hook.received");
    expect(schema).toContain("manual probes as diagnostic-only");
    expect(schema).toContain("trusted real non-bypass Codex hook path");
    expect(schema).toContain("Self-report is not sufficient evidence");
    expect(schema).toContain("must not make `pnpm test` or CI depend on Codex CLI");
    expect(realRepo).toContain("scripts/krn-real-repo-preflight.sh <repo-path>");
    expect(realRepo).toContain("scripts/krn-real-repo-dogfood.sh");
    expect(realRepo).toContain("Do not use this with protected data");
    expect(realRepo).toContain("filename/path heuristics only");
    expect(realRepo).toContain("KRN_REAL_REPO_DOGFOOD_APPROVED=1");
    expect(realRepo).toContain("skipped report");
    expect(realRepo).toContain("blocked report");
    expect(realRepo).toContain("readiness report");
    expect(realRepo).toContain("Baseline no-KRN");
    expect(realRepo).toContain("KRN explicit with no safe verify");
    expect(realRepo).toContain("Never run `composer install`, `npm install`");
    expect(realRepo).toContain("Do not use global `krn`");
    expect(realRepo).toContain("Mark a run invalid");
    expect(wpExplicitSkill).toContain("pinned repo-local KRN command");
    expect(wpExplicitSkill).toContain("Do not fall back to global `krn`");
    expect(wpExplicitSkill).toContain("Run `<pinned-krn> graph` before `<pinned-krn> context`");
    expect(dogfoodAdr).toContain("Global `krn` is invalid for dogfood");
    expect(dogfoodAdr).toContain("First real user-repo dogfood requires preflight");
    expect(dogfoodAdr).toContain("Hooks remain unproven");
    expect(principles).toContain("Measure explicit skill usage");
    expect(principles).toContain("Treat self-report as weak evidence");
    expect(principles).toContain("No production Codex runner");
    expect(hookExample).toContain('"manualHookTraceEvents": 1');
    expect(hookExample).toContain('"dangerousBypassUsed": false');
    expect(hookExample).toContain("does not prove Codex loaded or trusted");
  });

  it("keeps WordPress ACF fixture detection scoped to P0 conventions", async () => {
    const graphSpec = await readDoc("docs/specs/graph-lite.md");
    const wpSpec = await readDoc("docs/specs/wordpress-acf-detector.md");

    expect(graphSpec).toContain("`acf/`, `acf-json/`, `src/theme/`, `theme/`");
    expect(graphSpec).toContain("Package-owned tests may also become `should-read`");
    expect(graphSpec).toContain("doc matches from neighboring fixture packages are ignored");
    expect(wpSpec).toContain("synthetic WordPress/ACF-style fixtures");
    expect(wpSpec).toContain("not production WordPress/ACF detection");
    expect(wpSpec).toContain("No PHP parsing");
    expect(wpSpec).toContain("No PHP parsing, WordPress runtime inspection");
  });

  it("keeps operator console and WP ACF handoff data-only and honest", async () => {
    const operator = await readDoc("docs/product/operator-console.md");
    const p0Exit = await readDoc("docs/product/p0-exit-criteria.md");
    const p1Entry = await readDoc("docs/product/p1-entry-contract.md");
    const scorecard = await readDoc("docs/product/stage-scorecard.md");
    const decision = await readDoc("docs/product/p0-p1-decision.md");
    const reviewers = await readDoc("docs/product/reviewers.md");
    const runResultSchema = await readDoc("docs/specs/run-result.schema.md");
    const operatorSummarySchema = await readDoc("docs/specs/operator-summary.schema.md");
    const operatorReportSchema = await readDoc("docs/specs/operator-report.schema.md");
    const releaseCheckSchema = await readDoc("docs/specs/release-check.schema.md");
    const installSchema = await readDoc("docs/specs/install-result.schema.md");
    const uninstallSchema = await readDoc("docs/specs/uninstall-result.schema.md");
    const configDoctorSchema = await readDoc("docs/specs/config-doctor.schema.md");
    const reviewerResultSchema = await readDoc("docs/specs/reviewer-result.schema.md");
    const evidenceMatrix = await readDoc("docs/product/evidence-matrix.md");
    const doctrine = await readDoc("docs/product/research-backed-architecture.md");
    const backlog = await readDoc("docs/product/next-implementation-backlog.md");
    const subagents = await readDoc("docs/product/subagent-contracts.md");
    const condensation = await readDoc("docs/product/knowledge-condensation.md");
    const refactorBacklog = await readDoc("docs/product/refactor-backlog.md");
    const dashboardAdr = await readDoc(
      "docs/adr/ADR-0014-dashboard-lite-read-only-report-viewer.md",
    );
    const mcpAdr = await readDoc("docs/adr/ADR-0015-mcp-read-only-contract-spike.md");
    const retrievalAdr = await readDoc("docs/adr/ADR-0016-retrieval-vector-experiment-harness.md");
    const p1Handoff = await readDoc("docs/handoffs/2026-06-14-p0-p1-entry-decision.md");
    const handoff = await readDoc("docs/handoffs/2026-06-13-wp-acf-dogfood-evidence.md");
    const readme = await readDoc("README.md");

    expect(operator).toContain("P1 executable summary artifact");
    expect(operator).toContain("local static report artifact");
    expect(operator).toContain("No frontend framework, server, database");
    expect(operator).toContain("`krn summary`");
    expect(operator).toContain("`krn report --write`");
    expect(operator).toContain("`krn report --bundle`");
    expect(operator).toContain(".krn/current/operator-summary.json");
    expect(operator).toContain(".krn/current/operator-report.html");
    expect(operator).toContain(".krn/current/report-bundle/manifest.json");
    expect(operator).toContain("Missing artifacts are allowed");
    expect(operator).toContain("Do not duplicate full trace content");
    expect(operatorSummarySchema).toContain("krn-operator-summary-v1");
    expect(operatorSummarySchema).toContain(
      "Skipped, readiness, missing, unproven, manual-diagnostic-only, and partially-proven are never production proof states",
    );
    expect(operatorSummarySchema).toContain("Record-only verify is not execution proof");
    expect(operatorSummarySchema).toContain("stale-blocking");
    expect(operatorSummarySchema).toContain("No hook.received event exists");
    expect(operatorSummarySchema).toContain("trusted non-manual hook-load marker");
    expect(operatorReportSchema).toContain("krn-operator-report-v1");
    expect(operatorReportSchema).toContain("krn-report-bundle-manifest-v1");
    expect(operatorReportSchema).toContain("Historical source `.krn` dogfood blockers");
    expect(operatorReportSchema).toContain("external CSS");
    expect(operatorReportSchema).toContain("productionProof.value` must remain `false");
    expect(runResultSchema).toContain("krn-run-result-v1");
    expect(runResultSchema).toContain("krn run --task <text>");
    expect(runResultSchema).toContain(".krn/current/run-bundle/manifest.json");
    expect(runResultSchema).toContain("productionProof");
    expect(runResultSchema).toContain("Historical `.krn` caveats");
    expect(releaseCheckSchema).toContain("krn-release-check-v1");
    expect(releaseCheckSchema).toContain("krn release-check [--json] [--write] [--bundle]");
    expect(releaseCheckSchema).toContain("krn-release-bundle-manifest-v1");
    expect(releaseCheckSchema).toContain("advanced compatibility surface");
    expect(releaseCheckSchema).toContain("recorded-not-executed-by-release-check");
    expect(releaseCheckSchema).toContain("does not run lint, typecheck, tests, verify, Codex");
    expect(installSchema).toContain("krn-install-result-v1");
    expect(uninstallSchema).toContain("krn-uninstall-result-v1");
    expect(uninstallSchema).toContain("KRN-HARNESS-MANAGED:v1");
    expect(configDoctorSchema).toContain("krn-config-doctor-v1");
    expect(configDoctorSchema).toContain("readonly-python");
    expect(reviewerResultSchema).toContain("krn-reviewer-result-v1");
    expect(reviewerResultSchema).toContain("krn-review-summary-v1");
    expect(reviewerResultSchema).toContain("`krn review --llm` is intentionally unsupported");
    expect(p0Exit).toContain("P0 is not production readiness");
    expect(p0Exit).toContain("Global `krn` fallback invalidates KRN dogfood");
    expect(p1Entry).toContain(
      "P1 starts product surfaces without turning experiments into production systems",
    );
    expect(p1Entry).toContain("No production MCP server");
    expect(p1Entry).toContain("No mandatory vector DB");
    expect(scorecard).toContain("Stages attempted: 23");
    expect(scorecard).toContain("v0.1 local proof threshold: crossed");
    expect(scorecard).toContain("Hard boundary violations: none found");
    expect(decision).toContain("P0 is complete for the local deterministic harness loop");
    expect(decision).toContain("P1 is entered under contract-first constraints");
    expect(decision).toContain("v0.1 local proof threshold");
    expect(decision).toContain("This is not production readiness");
    expect(reviewers).toContain("They are not autonomous agents");
    expect(reviewers).toContain(".krn/current/review-summary.json");
    expect(reviewers).toContain("normal tests must not call paid models");
    expect(evidenceMatrix).toContain("Deterministic reviewers");
    expect(evidenceMatrix).toContain("Condensed run workflow");
    expect(evidenceMatrix).toContain(
      "krn run -> run-result -> run-bundle -> report/release-check as supporting evidence",
    );
    expect(evidenceMatrix).toContain("product-code-tax-dogfood");
    expect(evidenceMatrix).toContain("Operator summary");
    expect(evidenceMatrix).toContain("Operator report");
    expect(evidenceMatrix).toContain("Artifact lifecycle");
    expect(evidenceMatrix).toContain(".krn/current/run-bundle/manifest.json");
    expect(evidenceMatrix).toContain("target PR #78");
    expect(evidenceMatrix).toContain("PR #78 is unmerged review evidence");
    expect(evidenceMatrix).toContain("Dashboard-lite | ADR-only");
    expect(evidenceMatrix).toContain("MCP | ADR-only");
    expect(evidenceMatrix).toContain("Retrieval/vector | ADR-only");
    expect(doctrine).toContain("Agent-Computer Interface Over Agent Hype");
    expect(doctrine).toContain("Retrieval Eval Before Vector DB");
    expect(doctrine).toContain("Security By Architecture, Not Prompt");
    expect(doctrine).toContain("https://arxiv.org/abs/2405.15793");
    expect(doctrine).toContain("https://genai.owasp.org/llm-top-10/");
    expect(backlog).toContain("Priority 1: Review Target Config PR");
    expect(backlog).toContain("PR #78 exists in `krn-llm-wiki`");
    expect(backlog).toContain("No direct push to target `main`");
    expect(backlog).toContain("Priority 5: Later Hook Trust Investigation");
    expect(backlog).toContain("Not Before v0.2");
    expect(backlog).not.toContain("Priority 6:");
    expect(subagents).toContain("not as an autonomous execution framework");
    expect(subagents).toContain(
      "must not edit files, spawn agents, approve memory, or call models by default",
    );
    expect(condensation).toContain("does not auto-update active truth");
    expect(condensation).toContain("must not auto-approve memory");
    expect(refactorBacklog).toContain("packages/doctor/src/doctor.ts");
    expect(refactorBacklog).toContain("packages/context/src/build-context-package.ts");
    expect(refactorBacklog).toContain("packages/hooks/src/codex-hook-entry.ts");
    expect(refactorBacklog).toContain("stop the refactor if");
    expect(refactorBacklog).toContain("not permission for a broad rewrite");
    expect(dashboardAdr).toContain("generated local static HTML report viewer");
    expect(dashboardAdr).toContain("No hosted dashboard");
    expect(mcpAdr).toContain("No MCP server is implemented");
    expect(mcpAdr).toContain("Forbidden MCP actions");
    expect(retrievalAdr).toContain("No vector database or embeddings dependency is added");
    expect(retrievalAdr).toContain("synthetic experiment harness only");
    expect(p1Handoff).toContain("P0 decision: complete for the local deterministic harness loop");
    expect(p1Handoff).toContain(
      "P1 decision: entered under gated, local, artifact-first contracts",
    );
    expect(p1Handoff).toContain("Stages attempted: 23");

    expect(handoff).toContain("not a production benchmark pass");
    expect(handoff).toContain("Completed for the full WP/ACF task index.");
    expect(handoff).toContain("baseline: tasks 0/8, grades 38/117, invalid 0");
    expect(handoff).toContain("krn-explicit-skill: tasks 8/8, grades 125/125, invalid 0");
    expect(handoff).toContain("no global KRN fallback");
    expect(handoff).toContain("does not prove real Codex hook loading/trust");
    expect(handoff).toContain("not production WordPress proof");

    expect(readme).toContain("Tiny downstream fixture dogfood");
    expect(readme).toContain("pnpm --silent krn run --task");
    expect(readme).toContain(".krn/current/run-result.json");
    expect(readme).toContain("Product-code fixture dogfood");
    expect(readme).toContain("WordPress/ACF fixture");
    expect(readme).toContain("Global `krn` fallback invalidates the run");
    expect(readme).toContain("config-adoption `krn-llm-wiki` evidence exists");
    expect(readme).toContain(
      "product-code/checker mutation passed `krn run --task-spec ... --execute-verify --bundle`",
    );
    expect(readme).toContain("real Codex hook loading/trust remains unproven");
    expect(readme).toContain("docs/product/p0-exit-criteria.md");
    expect(readme).toContain("docs/product/p1-entry-contract.md");
    expect(readme).toContain("docs/product/stage-scorecard.md");
    expect(readme).toContain("ADR-0014, ADR-0015, and ADR-0016");
    expect(readme).toContain("No production dashboard");
  });

  it("keeps verify profile docs explicit about policy and non-execution", async () => {
    const verifySpec = await readDoc("docs/specs/verify-result.schema.md");
    const configSpec = await readDoc("docs/specs/krn-config.schema.md");
    const verifyAdr = await readDoc("docs/adr/ADR-0017-verify-execute-policy.md");
    const adrIndex = await readDoc("docs/adr/README.md");
    const decision = await readDoc("docs/product/p0-p1-decision.md");

    expect(verifySpec).toContain("record-only");
    expect(verifySpec).toContain("Execute mode runs only allowlisted command/args");
    expect(verifySpec).toContain("Shell syntax, redirects, pipes");
    expect(verifySpec).toContain("never store environment variables");
    expect(configSpec).toContain("verify.profiles");
    expect(configSpec).toContain("verify.defaultProfile");
    expect(verifyAdr).toContain("Keep verify record-only by default");
    expect(verifyAdr).toContain("pnpm test --coverage");
    expect(verifyAdr).toContain("Do not allow arbitrary package script arguments");
    expect(verifyAdr).toContain("shell: false");
    expect(verifyAdr).toContain("scrubbed allowlisted environment");
    expect(verifyAdr).toContain("redacted compact stdout/stderr tails");
    expect(verifyAdr).toContain("Treat verify output as local validation evidence only");
    expect(adrIndex).toContain("ADR-0017: Verify Execute Policy");
    expect(decision).toContain("verify execute policy: ADR-0017");
  });

  it("keeps trace query storage derived, local, and gated", async () => {
    const traceQuerySpec = await readDoc("docs/specs/trace-query-store.md");
    const traceQueryAdr = await readDoc("docs/adr/ADR-0019-queryable-trace-read-model.md");
    const goalRoadmap = await readDoc("docs/product/goal-8h-roadmap.md");

    expect(traceQuerySpec).toContain("does not replace trace JSONL");
    expect(traceQuerySpec).toContain("JSONL wins");
    expect(traceQuerySpec).toContain(".krn/trace-index/");
    expect(traceQuerySpec).toContain("must not mutate task contracts");
    expect(traceQuerySpec).toContain("Before adding `better-sqlite3`");
    expect(traceQuerySpec).toContain("No production observability claim");
    expect(traceQueryAdr).toContain("Keep JSONL as the canonical write-ahead trace artifact");
    expect(traceQueryAdr).toContain("Do not implement `krn traces query` in the ADR slice");
    expect(traceQueryAdr).toContain("native dependency");
    expect(goalRoadmap).toContain("TASK-002 queryable trace store");
    expect(goalRoadmap).toContain("ADR/spec accepted; implementation deferred");
    expect(goalRoadmap).toContain("No SQLite dependency, database file, or `krn traces query`");
  });

  it("keeps run interrupt/resume local, deferred, and behind CLI approval", async () => {
    const interruptSpec = await readDoc("docs/specs/run-interrupt-resume.md");
    const interruptAdr = await readDoc("docs/adr/ADR-0020-run-interrupt-resume-contract.md");
    const goalRoadmap = await readDoc("docs/product/goal-8h-roadmap.md");
    const codexFeasibility = await readDoc("docs/specs/codex-noninteractive-feasibility.md");

    expect(interruptSpec).toContain("krn-run-interrupt-v1");
    expect(interruptSpec).toContain(".krn/current/interrupt.json");
    expect(interruptSpec).toContain("No top-level `krn resume` command is currently approved");
    expect(interruptSpec).toContain("must not use hook `warn` or `block`");
    expect(interruptSpec).toContain("must not bypass");
    expect(interruptSpec).toContain("No Codex session resume wrapper");
    expect(interruptSpec).toContain("No hook-trust claim");
    expect(interruptAdr).toContain("Keep `krn run` as the primary workflow");
    expect(interruptAdr).toContain("Do not add a top-level `krn resume`");
    expect(interruptAdr).toContain("ADR-0012 does not accept a Codex execution wrapper");
    expect(goalRoadmap).toContain("TASK-003 interrupt/resume");
    expect(goalRoadmap).toContain("ADR/spec accepted; implementation deferred");
    expect(goalRoadmap).toContain("No top-level `krn resume`, `krn run --resume`");
    expect(codexFeasibility).toContain("`codex exec --help` listed `resume`");
    expect(helpText).not.toContain("krn resume");
    expect(helpText).not.toContain("--resume");
  });

  it("does not describe current P0 docs as skeleton-only output", async () => {
    const readme = await readDoc("README.md");
    const architecture = await readDoc("docs/architecture/architecture-spec-v0.1.md");

    expect(readme).not.toMatch(/skeletal|skeleton/i);
    expect(architecture).not.toMatch(/skeletal|skeleton/i);
  });

  it("keeps release prep local and unpublished", async () => {
    const checklist = await readDoc("docs/release/checklist.md");
    const releaseNote = await readDoc("docs/releases/v0.1-local-tool-candidate.md");

    expect(checklist).toContain("pnpm verify:local");
    expect(checklist).toContain("pnpm --silent krn run --task");
    expect(checklist).toContain('pnpm --silent krn run --task "CI local smoke" --dry-run --json');
    expect(checklist).toContain("scripts/krn-real-repo-preflight.sh <repo-path>");
    expect(checklist).toContain("scripts/krn-real-repo-dogfood.sh");
    expect(checklist).toContain("older `start`, `graph`,");
    expect(checklist).toContain("pnpm --silent krn report --bundle");
    expect(checklist).toContain("pnpm --silent krn release-check --write");
    expect(checklist).not.toContain("pnpm --silent krn release-check --bundle");
    expect(checklist).toContain("product-code-tax-dogfood");
    expect(checklist).toContain("node src/regional-tax.test.ts");
    expect(checklist).toContain("write a readiness report");
    expect(checklist).toContain("must not depend on paid Codex calls");
    expect(checklist).toContain("local `bin` metadata for dogfood linking only");
    expect(checklist).toContain("not a publish-ready package boundary");
    expect(checklist).toContain("Do not publish from P0");
    expect(checklist).toContain("Minimal CI Gate");
    expect(checklist).toContain("local no-model validation");
    expect(checklist).toContain("Codex CLI CI dependency");
    expect(releaseNote).toContain("v0.1 Local Tool Candidate");
    expect(releaseNote).toContain("Primary operator workflow: `krn run`");
    expect(releaseNote).toContain("productionProof` remained `false`");
    expect(releaseNote).toContain("Repeat `krn run` on a second non-protected real repository");
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
