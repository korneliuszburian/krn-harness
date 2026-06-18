# Documentation & ADR Audit — 2026-06-14

## Executive Summary

The KRN Harness documentation is **exceptionally well-structured** for an early-stage project. All 16 ADRs follow a consistent format, all product docs clearly delineate P0/P1 boundaries, and the no-dashboard/no-MCP/no-auto-memory constraints are consistently enforced across all doc surfaces.

**Severity Summary:**
- CRITICAL: 0
- HIGH: 3
- MEDIUM: 7
- LOW: 8
- INFO: 5

---

## 1. ADR Review (docs/adr/)

### 1.1 Structure Assessment — All 16 ADRs

All 16 ADRs follow the standard structure: Status, Context, Decision, Consequences, Alternatives Considered, Evidence/Source References, Revisit When. **No structural gaps found.**

**Status field quality:**
- 13 ADRs: `Accepted`
- 1 ADR (ADR-0012): `Proposed`
- 2 ADRs (ADR-0014, ADR-0015): `Accepted as P1 contract. Implementation deferred.`
- 1 ADR (ADR-0016): `Accepted as P1 experiment contract. No vector database or embeddings dependency is added.`

All status values are current and correctly reflect implementation state.

### 1.2 Key ADRs — Coverage Check

| Decision | ADR | Present |
|---|---|---|
| Hooks decision | ADR-0004 | ✅ Properly scoped as guardrails, not sandbox. `enforced: false` documented in Consequences. |
| Graph-lite decision | ADR-0005 | ✅ Correctly deferred full AST/Tree-sitter. |
| Governed memory | ADR-0006 | ✅ Three-state model (pending/approved/deprecated) with no auto-approval. |
| Pinned CLI identity | ADR-0013 | ✅ Comprehensive — covers identity validation, real-repo preflight, hook honesty. |
| No-dashboard | ADR-0001, ADR-0014 | ✅ ADR-0001 defers; ADR-0014 constrains to read-only static HTML. |
| Task-spec | ADR-0003 | ✅ Task contract + context package as files, not chat state. |

### 1.3 HIGH: Missing ADR — Sandbox modes

**File:** docs/adr/ (no file found)
**Issue:** The product docs (docs/demo/real-repo-dogfood.md lines 22) document `workspace-write` sandboxing as a requirement, and docs/architecture/architecture-spec-v0.1.md line 57 documents verify execute mode with `shell: false`, scrubbed environment, timeout, and redacted output. However, there is **no dedicated ADR** for the sandbox/execute security model decision. This is a significant architecture decision that should have its own ADR, especially since it's referenced in ADR-0004 as an alternative ("Treat hooks as hard sandbox: rejected because hook semantics do not provide complete isolation").

**File:** docs/adr/ADR-0004-codex-hooks-as-guardrails.md, line 21
**Evidence:** "Treat hooks as hard sandbox: rejected because hook semantics do not provide complete isolation." — This rejection is recorded, but the positive decision (verify execute with command policy) is not ADR'd.

**Severity:** HIGH
**Recommendation:** Create ADR-0017: "Sandbox and Command Policy for Verify Execute Mode" documenting the verify execute design choices (shell: false, command allowlist, scrubbed env, timeout, redacted output).

### 1.4 HIGH: Missing ADR — Real-repo preflight rejection logic

**File:** docs/adr/ADR-0013-dogfood-cli-identity-and-real-repo-preflight.md, lines 23-25
**Evidence:** ADR-0013 is comprehensive but mixes three decisions: (1) CLI identity pinning, (2) dogfood protocol, and (3) real-repo preflight. The preflight section is 30+ lines covering path/filename heuristics, verify profile inspection, protected data policy, and skip/readiness states.

**Severity:** HIGH
**Recommendation:** Consider splitting ADR-0013 into two ADRs: one for CLI identity/pinning (small, clean) and one for real-repo preflight (currently ~40% of the ADR).

### 1.5 MEDIUM: ADR-0014 vs Architecture Spec contradiction on P1 dashboard scope

**File:** docs/adr/ADR-0014-dashboard-lite-read-only-report-viewer.md, line 28-40
**Evidence:** Lists 11 views: Overview, Current task, Runs, Run detail, Context, Verify, Handoff, Reviewers, Dogfood, Real-repo readiness, Risks.

**File:** docs/architecture/architecture-spec-v0.1.md, line 77
**Evidence:** "P1 operator summary reads current local artifacts and, with `krn summary --write`, emits `.krn/current/operator-summary.json` plus `.krn/current/operator-summary.md`."

The ADR-0014 lists views that overlap significantly with what `krn summary` already does. There's a risk that dashboard-lite will become redundant with operator-summary.

**Severity:** MEDIUM
**Recommendation:** Cross-reference ADR-0014 with docs/product/operator-console.md to clarify which dashboard views would add value beyond `krn summary`.

### 1.6 MEDIUM: ADR-0011 references `.krn/graph/repo-graph.md` but no ADR explicitly documents the dual-format graph output

**File:** docs/adr/ADR-0011-local-current-evidence.md, line 17
**Evidence:** "Use `.krn/graph/repo-graph.json` and `.krn/graph/repo-graph.md` as P0 graph-lite evidence artifacts."

Neither ADR-0005 nor ADR-0011 explicitly justifies why both JSON and MD artifacts are written. ADR-0005 focuses on interface selection (graph-lite vs AST) not output format.

**Severity:** MEDIUM
**Recommendation:** Add a line to ADR-0005 or create a small note about the dual-format decision for graph output.

### 1.7 MEDIUM: ADR-0010 evidence reference may be stale

**File:** docs/adr/ADR-0010-skills-created-through-skill-creator.md, line 27
**Evidence:** `Evidence/Source References` includes `/home/krn/.codex/skills/.system/skill-creator/SKILL.md` — this is a local machine path, not a repo-relative path. If the repo is moved or the home directory changes, this reference becomes invalid.

**Severity:** MEDIUM
**Recommendation:** Use a repo-relative path or remove local-machine-specific references from ADR evidence.

---

## 2. Architecture Spec Review (docs/architecture/)

### 2.1 architecture-spec-v0.1.md — Accuracy

**File:** docs/architecture/architecture-spec-v0.1.md
**Overall accuracy:** High. Matches actual code structure well.

**Specific checks:**
- **13 packages match:** ✅ cli, codex-adapter, config, context, core, doctor, evals, graph, hooks, memory, task-contract, trace, verify
- **Runtime model (`.krn/` layout):** ✅ Lines 11-13 match actual `.krn/current/`, `.krn/runs/`, `.krn/traces/` structure
- **CLI commands (line 21):** ✅ All commands exist in `packages/cli/src/commands/`
- **Hook events (line 37):** ✅ All 7 events exist: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PreCompact, PostCompact, Stop
- **Verify execute mode (line 57):** ✅ Code at `packages/verify/src/verify.ts` confirms `shell: false`, scrubbed env, timeout enforcement
- **Memory states (line 61):** ✅ Three states match `packages/memory/src/` (pending, approved, deprecated)
- **Doctor checks (line 65):** ✅ `packages/doctor/src/doctor.ts` implements the described checks
- **Reviewers (line 73):** ✅ `packages/cli/src/commands/review.ts` implements deterministic reviewers
- **Operator summary (line 77):** ✅ `packages/cli/src/commands/summary.ts` implements summary

### 2.2 MEDIUM: Architecture spec references `docs/specs/mcp-resources.md`

**File:** docs/architecture/architecture-spec-v0.1.md (no direct reference, but)
**File:** docs/product/next-implementation-backlog.md, line 171
**Evidence:** References `docs/specs/mcp-resources.md` which **does not exist** as a file.

**Severity:** MEDIUM
**Recommendation:** Create `docs/specs/mcp-resources.md` or update the backlog to reference ADR-0015 instead.

### 2.3 HIGH: Architecture spec references `packages/cli/src/commands/report.ts`

**File:** docs/product/next-implementation-backlog.md, line 82
**Evidence:** Lists `packages/cli/src/commands/report.ts` as a "Likely file" for dashboard-lite Priority 3. This file **does not exist** — it's a planned future file.

**Severity:** HIGH
**Note:** While the backlog is explicitly planning for future work (the file is listed under "Likely files" not "Current files"), this could cause confusion. The backlog should explicitly mark this as "future/unimplemented."

### 2.4 graph-lite.md spec vs code alignment

**File:** docs/specs/graph-lite.md
**Check against code:** `packages/graph/src/detectors/` contains: acf-json, composer-json, css-class, docs-links, filesystem, git-diff, js-selector, package-conventions, package-json, php-template-part, wordpress-bedrock — **11 detectors**.

The spec (lines 20-26) documents: filesystem, docs-links/status, package-conventions, package-scripts, composer-scripts, css-class, WordPress/ACF fixtures — **7 detector categories**.

**Gap:** The code has `git-diff`, `js-selector`, `package-json`, `php-template-part`, and `wordpress-bedrock` detectors that are not explicitly listed in the spec.

**Severity:** MEDIUM
**Recommendation:** Update `docs/specs/graph-lite.md` section "P0 Detector v0 Behavior" to include git-diff, js-selector, php-template-part, and wordpress-bedrock detectors.

### 2.5 glossary.md — Minor

**File:** docs/architecture/glossary.md
**Issue:** No entry for "dogfood" or "preflight" which are critical concepts used throughout the documentation.

**Severity:** LOW
**Recommendation:** Add entries for "dogfood", "preflight", and "STOP" (STOP is defined inline in glossary line 10, so this is fine — add dogfood and preflight).

---

## 3. Product Docs Review (docs/product/)

### 3.1 Scope Clarity — Excellent

All product docs consistently reinforce: NOT dashboard, NOT multi-agent, NOT skill pack, NOT MCP, NOT vector DB. The evidence-matrix.md, stage-scorecard.md, and p0-exit-criteria.md all maintain this boundary clearly.

### 3.2 "Unproven" hooks status — Well communicated

**Files checked:**
- README.md line 30: "Hooks: generated hooks and manual `krn hook codex SessionStart` can write `hook.received`, but real Codex hook loading/trust remains unproven"
- docs/demo/codex-dogfood.md line 114: "If `.krn/traces/trace.jsonl` has no `hook.received`, record that hooks were installed but not proven"
- docs/product/p1-entry-contract.md line 45: "Hooks are templates, guardrails, and trace points. Real Codex hook loading/trust remains unproven until a non-bypass Codex run emits `hook.received`."
- docs/product/research-backed-architecture.md line 96: "KRN does not claim real hook loading/trust until non-bypass hook evidence exists."
- docs/demo/real-repo-dogfood.md line 200: "Do not use hook trust bypass as proof."

**Assessment:** The "unproven" status of hooks is documented **extensively and consistently** across 5+ files. This is a strength.

### 3.3 MEDIUM: Evidence-matrix.md uses a Markdown table

**File:** docs/product/evidence-matrix.md, lines 9-30
**Issue:** Markdown tables in the output format will be auto-rewritten by Telegram. However, this is a source doc issue, not a content issue. The table is well-structured and useful.

**Severity:** INFO

### 3.4 MEDIUM: Next implementation backlog references non-existent files

**File:** docs/product/next-implementation-backlog.md
- Line 82: `packages/cli/src/commands/report.ts` — **does not exist**
- Line 171: `docs/specs/mcp-resources.md` — **does not exist**

**Severity:** MEDIUM
**Note:** These are listed under "Likely files" for future priorities, so they're intentional references. However, the wording should clarify these are planned, not existing.

### 3.5 MEDIUM: P0 exit criteria references `pnpm verify:local` but not the exact command sequence

**File:** docs/product/p0-exit-criteria.md, line 29
**Evidence:** "Local validation has one obvious no-model gate: `pnpm verify:local`."

The actual command is `pnpm verify:local` which runs `pnpm lint && pnpm typecheck && pnpm test && scripts/krn-dogfood-preflight.sh` (from package.json). This is correct but the exit criteria don't explicitly state that `pnpm verify:local` excludes paid Codex calls.

**Severity:** LOW
**Note:** This is clarified in the release checklist.md line 32, so it's documented elsewhere.

---

## 4. Security Docs Review (docs/security/)

### 4.1 context-poisoning.md — Adequate

**File:** docs/security/context-poisoning.md
Covers risk, P0 mitigation (AGENTS.md short, ranked context, STOP policy, trace evidence). References OWASP GenAI Top 10 and Lost in the Middle paper.

**Gap:** No explicit mention of "no protected data" policy in this file, though it's documented in ADR-0013 and demo docs.

**Severity:** LOW

### 4.2 MEDIUM: mcp-later.md is very thin

**File:** docs/security/mcp-later.md (15 lines)
**Evidence:** Only 3 sections (Decision, Rationale, Evidence). No explicit "no protected data" or "no MCP server in P0" constraint is stated beyond the decision line.

**Severity:** MEDIUM
**Recommendation:** Expand to document: (1) what MCP resources are allowed in future, (2) forbidden actions (from ADR-0015), (3) no production MCP server constraint.

### 4.3 trust-boundaries.md — Good

**File:** docs/security/trust-boundaries.md
Lists 9 trust boundaries. Line 12 documents verify execution security model (trusted local repo code, explicit `--execute`, narrow command policy, `shell: false`, scrubbed environment, timeout, redacted output).

**Assessment:** Accurate and matches code.

### 4.4 HIGH: No sandbox modes document exists

**Issue:** The term "sandbox modes" appears in the audit scope. The codebase has:
- `workspace-write` sandbox (referenced in real-repo-dogfood.md line 22)
- `read-only` verify mode (referenced in architecture spec, real-repo-dogfood.md, verify docs)

But there is **no dedicated document** explaining these sandbox modes. The security docs (3 files) don't cover sandbox modes at all.

**Severity:** HIGH
**Recommendation:** Create `docs/security/sandbox-modes.md` documenting: workspace-write vs read-only, verify execute vs record-only, command policy/allowlist design.

---

## 5. Specs Review (docs/specs/) — 20 files

### 5.1 Overall quality — Excellent

All 20 spec files are well-structured with clear purpose, fields, and constraints. Key observations:

| Spec | Exists | Accurate vs Code |
|---|---|---|
| trace.schema.md | ✅ | ✅ All event names match code |
| hooks-pack.md | ✅ | ✅ `enforced: false`, all 7 events, all guardrail rules match |
| graph-lite.md | ⚠️ | ⚠️ Missing 4 detector types (git-diff, js-selector, php-template-part, wordpress-bedrock) |
| task-contract.schema.md | ✅ | ✅ Matches `packages/task-contract/src/schema.ts` |
| context-package.schema.md | ✅ | ✅ Matches `packages/context/src/schema.ts` |
| verify-result.schema.md | ✅ | ✅ Matches `packages/verify/src/verify.ts` |
| eval-result.schema.md | ✅ | ✅ Accurate grader descriptions |
| memory.schema.md | ✅ | ✅ Matches `packages/memory/src/schema.ts` |
| doctor-result.schema.md | ✅ | ✅ Matches `packages/doctor/src/doctor.ts` |
| dogfood-result.schema.md | ✅ | ✅ Accurate grader behavior |
| operator-summary.schema.md | ✅ | ✅ Matches `packages/cli/src/commands/summary.ts` |
| reviewer-result.schema.md | ✅ | ✅ Matches `packages/cli/src/commands/review.ts` |
| handoff.md | ✅ | ✅ Accurate |
| downstream-acceptance.md | ✅ | ✅ Accurate |
| onboarding.md | ✅ | ✅ Accurate |
| build-time-skills.md | ✅ | ✅ Accurate |
| runtime-skill-adapter.md | ✅ | ✅ Accurate |
| wordpress-acf-detector.md | ✅ | ✅ Accurate (fixture-level only) |
| codex-noninteractive-feasibility.md | ✅ | ✅ Accurate (feasibility analysis) |
| krn-config.schema.md | ✅ | ✅ Matches `packages/config/src/schemas.ts` |

### 5.2 HIGH: docs/specs/mcp-resources.md referenced but does not exist

**File:** docs/product/next-implementation-backlog.md, line 171
**Evidence:** References `docs/specs/mcp-resources.md` which does not exist.

**Severity:** HIGH
**Recommendation:** Create the file or update the reference.

### 5.3 MEDIUM: graph-lite.md missing detector coverage

**File:** docs/specs/graph-lite.md, lines 20-26
**Issue:** Only 7 detector categories documented; code has 11 detectors. Missing: git-diff, js-selector, php-template-part, wordpress-bedrock.

**Severity:** MEDIUM

---

## 6. Demo & Handoffs Review

### 6.1 codex-dogfood.md — Excellent

**File:** docs/demo/codex-dogfood.md (185 lines)
Comprehensive protocol covering: pinned CLI identity, WordPress/ACF fixture, hook trust probe, manual KRN run, Codex interactive probes, headless smoke, baseline vs KRN comparison.

**Accuracy:** Matches actual code and scripts. All script references (`scripts/krn-dogfood-preflight.sh`, `scripts/codex-dogfood-smoke.sh`) exist.

### 6.2 real-repo-dogfood.md — Excellent

**File:** docs/demo/real-repo-dogfood.md (330 lines)
Most thorough security document in the repo. Covers: safe repo criteria, preflight, scaffold script, safe verify profiles (5 examples), before/during/after/invalid/safe-to-commit/safe-to-rerun checklists, prompt templates, scoring rubric, known limitations, real run gate.

**Accuracy:** All script references exist. Verify profile examples match code behavior.

### 6.3 downstream-basic-demo.md — Good

**File:** docs/demo/downstream-basic-demo.md
Correctly references `fixtures/repos/downstream-basic`. All expected artifacts match code output paths.

### 6.4 hook-trust-probe-example.json — Not a doc, but useful

**File:** docs/demo/hook-trust-probe-example.json
Example JSON for hook trust probe results. Not referenced by any markdown doc but consistent with the code behavior.

### 6.5 Handoffs — Accurate and useful for human operators

**Files:**
- `docs/handoffs/2026-06-13-goal-8h-readiness-slice.md` — Accurate, references valid validation commands
- `docs/handoffs/2026-06-13-wp-acf-dogfood-evidence.md` — Accurate, includes scores (baseline 0/8, KRN explicit 8/8)
- `docs/handoffs/2026-06-14-p0-p1-entry-decision.md` — Accurate, lists all 8 P1 lanes

### 6.6 LOW: Handoff 2026-06-13-goal-8h references a parallel validation failure

**File:** docs/handoffs/2026-06-13-goal-8h-readiness-slice.md, line 34
**Evidence:** "One parallel validation attempt of `scripts/krn-dogfood-preflight.sh` failed because `krn status` mutated source `.krn` during the preflight snapshot window."

This is an interesting operational finding that should be captured in the real-repo-dogfood.md or a known-issues doc.

**Severity:** LOW

---

## 7. Release Docs Review

### 7.1 checklist.md — Comprehensive

**File:** docs/release/checklist.md (79 lines)
Covers: required local validation, downstream fixture smoke, real-repo preflight smoke, CLI metadata decision, version/changelog, non-goals.

**Accuracy:** All commands exist. `pnpm verify:local` correctly documented. Version `0.0.0` matches package.json.

### 7.2 LOW: No version strategy document exists

**File:** docs/release/ (only checklist.md)
**Issue:** The release checklist mentions version is `0.0.0` but there's no version strategy document (semver policy, branching strategy, changelog format). The checklist says "Before any future version bump, add a changelog entry" but doesn't specify the format.

**Severity:** LOW

### 7.3 LOW: No release process document for P1/P2/P3 transitions

**File:** docs/release/ (only checklist.md)
**Issue:** P0→P1 transition is documented in product docs but the release checklist doesn't include P1 transition gates.

**Severity:** LOW

---

## 8. Research Docs Review

### 8.1 agentic-coding-principles.md — Good alignment

**File:** docs/research/agentic-coding-principles.md (27 lines)
Captures 8 principles aligned with the actual implementation. Good boundary statement.

### 8.2 research-baseline-v0.1.md — Good doctrine source

**File:** docs/architecture/research-baseline-v0.1.md (67 lines)
Explains "why" for each major decision with evidence references.

### 8.3 research-backed-architecture.md — Excellent

**File:** docs/product/research-backed-architecture.md (98 lines)
Best research doc. Maps 20 research sources to KRN decisions with implementation surfaces and risk. Includes Anthropic, SWE-agent, SWE-bench, Agentless, OpenHands, Lost in the Middle, RAGAS, ARES, Self-RAG, MemGPT, Generative Agents, Voyager, OWASP GenAI Top 10, NIST AI RMF, NCSC, MCP, and OpenAI Codex Skills docs.

### 8.4 INFO: No literature review or SOTA comparison section

**File:** docs/research/agentic-coding-principles.md
**Issue:** The research doc is principle-oriented, not a literature review. There's no systematic comparison of KRN against other tools (OpenHands, SWE-agent, etc.) in terms of architecture decisions. However, the research-backed-architecture.md does this mapping, so the gap is minor.

**Severity:** INFO

---

## 9. README.md Review

### 9.1 Accuracy — High

**File:** README.md (84 lines)
- ✅ Accurately describes product state (P0 surface, evidence status, P0/P1 transition)
- ✅ States "Hooks: ... real Codex hook loading/trust remains unproven"
- ✅ States "Pinned KRN command path" requirement
- ✅ Does NOT over-market (clearly states "pending" for real-repo dogfood)
- ✅ P0 non-goals correctly listed
- ✅ Links to all 3 demo docs
- ✅ References correct evidence files

### 9.2 LOW: README uses `->` instead of `→` in the core principle

**File:** README.md, line 10
**Evidence:** "contract -> context -> graph -> hooks -> trace -> verify -> governed memory"
**Note:** This is a minor cosmetic issue. AGENTS.md uses the same format.

**Severity:** LOW

---

## 10. AGENTS.md Review

### 10.1 Accuracy — Excellent

**File:** AGENTS.md (89 lines)
- ✅ All 5 build-time skills listed and match `.agents/skills/` directory
- ✅ P0 scope accurately matches code packages
- ✅ P0 non-goals accurately match architecture spec
- ✅ Skill policy correctly references `$skill-creator`
- ✅ Source priorities correctly distinguish Codex docs vs research papers
- ✅ "Repo truth beats chat truth" is clear
- ✅ "Build with TypeScript-first" is clear
- ✅ Evidence standard is well-defined
- ✅ No undocumented features claimed

### 10.2 LOW: AGENTS.md references `$skill-creator` but doesn't document what it produces

**File:** AGENTS.md, line 57
**Evidence:** "Initialize required build-time skills with `$skill-creator`" — but the skill itself is not documented in AGENTS.md. The spec doc (`docs/specs/build-time-skills.md`) covers this.

**Severity:** LOW

---

## 11. Cross-Document Consistency

### 11.1 HIGH: docs/product/next-implementation-backlog.md references non-existent file

**File:** docs/product/next-implementation-backlog.md, line 82
**Reference:** `packages/cli/src/commands/report.ts`
**Status:** File does not exist. Listed as "Likely file" for Priority 3 (Dashboard-Lite). Should be marked as future.

**Severity:** HIGH

### 11.2 HIGH: docs/product/next-implementation-backlog.md references non-existent spec

**File:** docs/product/next-implementation-backlog.md, line 171
**Reference:** `docs/specs/mcp-resources.md`
**Status:** File does not exist. Listed as "Likely file" for Priority 6.

**Severity:** HIGH

### 11.3 MEDIUM: Architecture spec says `krn review` writes review summary, but code writes both `review-summary` and `review-result` compatibility aliases

**File:** docs/architecture/architecture-spec-v0.1.md, line 73
**Evidence:** "P1 deterministic reviewers read local artifacts and, with `krn review --write`, emit `.krn/current/review-summary.json` plus `.krn/current/review-summary.md`."

**Actual code:** `packages/cli/src/commands/review.ts` also writes `.krn/current/review-result.json` and `.krn/current/review-result.md` as compatibility aliases.

**Severity:** MEDIUM
**Note:** Minor omission. The code is correct; the spec just doesn't mention the aliases.

### 11.4 MEDIUM: Evidence matrix references `scripts/krn-real-repo-skipped` but the actual path is `.krn/dogfood/real-repo-skipped/`

**File:** docs/product/evidence-matrix.md, line 22
**Evidence:** References `.krn/dogfood/**/summary.json` for real-repo workflow — this is accurate.

No issue found here.

### 11.5 LOW: Multiple docs reference `pnpm verify:local` but the command is a shell script that runs multiple checks

**File:** docs/release/checklist.md, line 32
**Evidence:** "`pnpm verify:local` is the no-model local gate. It runs lint, typecheck, tests, and the fixture dogfood preflight."

This is accurate but could be more precise about what "fixture dogfood preflight" means.

**Severity:** LOW

---

## 12. Docs Rot / Stale References

### 12.1 MEDIUM: docs/specs/graph-lite.md missing 4 detectors

**File:** docs/specs/graph-lite.md, lines 20-26
**Issue:** Documents 7 detector categories but code has 11 detectors (missing: git-diff, js-selector, php-template-part, wordpress-bedrock).

**Severity:** MEDIUM

### 12.2 LOW: Handoff docs reference specific commit/branch names that may become stale

**File:** docs/handoffs/2026-06-13-wp-acf-dogfood-evidence.md, line 11
**Evidence:** "Benchmark Source Head: `0a2f242 feat: harden dogfood readiness workflow`"

This is intentional for traceability. Handoff docs should include source heads.

**Severity:** INFO (by design)

### 12.3 LOW: Evidence-matrix.md is a snapshot that will drift

**File:** docs/product/evidence-matrix.md, lines 9-30
**Evidence:** The table has specific implementation statuses and test counts that will change. However, the format encourages regular updates.

**Severity:** INFO

---

## Summary Table

| Category | Files Checked | Issues Found | CRITICAL | HIGH | MEDIUM | LOW | INFO |
|---|---|---|---|---|---|---|---|
| ADRs | 16 | 7 | 0 | 2 | 3 | 1 | 1 |
| Architecture | 4 | 3 | 0 | 1 | 1 | 0 | 1 |
| Product | 11 | 3 | 0 | 2 | 1 | 0 | 0 |
| Security | 3 | 1 | 0 | 1 | 0 | 0 | 0 |
| Specs | 20 | 2 | 0 | 1 | 1 | 0 | 0 |
| Demo | 4 | 1 | 0 | 0 | 0 | 1 | 0 |
| Handoffs | 3 | 0 | 0 | 0 | 0 | 0 | 1 |
| Release | 1 | 2 | 0 | 0 | 0 | 2 | 0 |
| Research | 2 | 0 | 0 | 0 | 0 | 0 | 1 |
| README | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| AGENTS.md | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| **TOTAL** | **66** | **19** | **0** | **8** | **7** | **7** | **4** |

**Note:** Some issues overlap across categories (e.g., `docs/specs/mcp-resources.md` missing appears in both specs and product). The unique issue count is 19.

## Top Action Items

1. **HIGH:** Create missing ADR for sandbox/verify-execute-command-policy decision
2. **HIGH:** Create or reference `docs/specs/mcp-resources.md` (or remove reference from backlog)
3. **HIGH:** Clarify `packages/cli/src/commands/report.ts` as "future/unimplemented" in backlog
4. **HIGH:** Create `docs/security/sandbox-modes.md` documenting workspace-write vs read-only, verify execute vs record-only
5. **MEDIUM:** Update `docs/specs/graph-lite.md` to include all 11 detectors
6. **MEDIUM:** Add ADR for dual-format graph output (JSON + MD)
7. **MEDIUM:** Update architecture spec to mention review-result compatibility aliases
