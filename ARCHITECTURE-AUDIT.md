# KRN Harness — Deep Architectural & Code Review Report

> Repo: `/home/krn/coding/krn/krn-harness`
> Scope: 13 packages, ~24,424 LOC, pnpm workspace, TypeScript, Vitest
> Date: 2026-06-14

---

## 1. CLI + Runtime Layer (`packages/cli/src/`, `packages/core/src/`)

### 1.1 Command Architecture
**File:** `packages/cli/src/index.ts` (lines 1–117)

Command registration is a flat `if/else` chain in `runCli()`. Each command maps to a function exported from `commands/`. There is no command registry, no middleware, no argument parser — pure dispatch.

- **Severity:** INFO
- **Finding:** No subcommand parsing (e.g., `krn memory approve`). The `memoryCommand`, `hookCommand`, and `doctorCommand` do their own manual arg parsing. No `yargs`, `commander`, or custom parser.
- **Risk:** Low — the flat dispatch is intentional for P0 simplicity. But error handling for unknown args varies across commands.

### 1.2 Runtime Lifecycle — `krn start → graph → context → verify → handoff`
**Files:**
- `packages/cli/src/commands/start.ts` (lines 201–252)
- `packages/cli/src/commands/context.ts` (lines 12–36)
- `packages/cli/src/commands/verify.ts` (lines 55–131)
- `packages/cli/src/commands/handoff.ts` (lines 301–365)

**Flow:**
1. `start` → `buildTaskContract()` → writes `.krn/current/task-contract.{json,md}` → emits `task.started` trace
2. `graph` → `buildGraph()` with 8 detectors → writes `.krn/graph/repo-graph.{json,md}` → emits `graph.built`
3. `context` → reads task contract + graph + approved memory → `buildContextPackage()` → writes `.krn/current/context-package.{json,md}` → emits `context.built`
4. `verify` → loads config + contract + context → resolves profile → runs commands (execute mode) → writes `.krn/current/verify-result.{json,md}` → emits `verify.ran`
5. `handoff` → reads all current artifacts → assembles markdown handoff doc → writes `.krn/current/handoff.md` → emits `handoff.created`

- **Severity:** LOW
- **Finding:** The flow is sequential and imperative — no parallelism except where `Promise.all` is used explicitly. No transactional semantics; partial failures are possible (e.g., `graph` succeeds but `context` fails, leaving orphaned artifacts).
- **Recommendation:** Consider a `krn run` orchestration command that runs the full pipeline atomically.

### 1.3 Error Handling
**Files:**
- `packages/core/src/errors.ts` (lines 1–16): `KRNError` base class + `ValidationError` subclass
- `packages/core/src/result.ts` (lines 1–17): `KRNResult<T>` discriminated union with `ok()`/`err()`
- `packages/cli/src/index.ts` (lines 41–107): `runCli()` returns `number` (exit code). No try/catch — errors propagate unhandled.

- **Severity:** HIGH
- **Finding:** Only 2 custom error types exist. Most CLI commands use bare `throw new Error()` (e.g., `start.ts` line 147, 163, 176, 179) and rely on Node's unhandled exception. The `KRNResult<T>` type is defined but appears to be **unused** — no call site was found that uses `ok()` or `err()`.
- **Evidence:** `packages/core/src/result.ts` defines `ok()`/`err()` but `search_files` found zero usages in the codebase.

### 1.4 Safety Mechanisms

#### Sandbox Modes
- **Severity:** INFO
- **Finding:** No runtime sandbox mode enforcement. The concepts "workspace-write" and "read-only" exist in the documentation/ADRs but are not implemented in code.

#### Shell Environment Policy
**File:** `packages/verify/src/verify.ts` (lines 229–272)
- `verifyEnvAllowlist`: hardcoded allowlist of ~30 env vars (PATH, CI, HOME, etc.)
- `sensitiveEnvKey` regex: blocks env vars matching `API_KEY|AUTH|CREDENTIAL|PASSWORD|SECRET|TOKEN`
- `buildVerifyEnvironment()`: scrubs process.env down to only allowlisted vars
- **Severity:** INFO
- **Finding:** Well-implemented. Good redaction in `redactVerifyOutput()` with specific patterns for OpenAI keys, GitHub tokens, Slack tokens, AWS keys.

#### Command Policy (Allowlist)
**File:** `packages/verify/src/command-policy.ts` (lines 1–104)
- Blocks: shell syntax (`&&`, `||`, `;`, `|`, `>`, `<`), `rm`, `scp`, `git reset --hard`, `git clean`, `curl`, `wget`
- Allows: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `npm test`, `npm run test`, `node <safe-relative-path>`
- `spawn()` uses `shell: false` — **critical security win**
- **Severity:** INFO
- **Finding:** Clean allowlist. The `pnpm lint`/`pnpm typecheck`/`pnpm test` allowlist is quite specific but may be too restrictive for some projects.

### 1.5 Pinned CLI Identity
**File:** `packages/cli/src/identity.ts` (lines 1–93)

- Schema: `krn-harness-cli-identity-v1`
- Version: hardcoded as `"0.0.0"`
- Identity is built from `process.env.KRN_HARNESS_BIN_WRAPPER` + `process.argv[1]` + `KRN_HARNESS_SOURCE_ROOT`
- `requiredDogfoodCommands`: 6 required commands checked
- **Severity:** LOW
- **Finding:** Version is `"0.0.0"` — not SemVer, not auto-versioned. The identity system is well-designed but the version field is a no-op.

### 1.6 Global Fallback to `krn` CLI
**File:** `packages/cli/src/index.ts` (lines 109–117)

```typescript
const isEntrypoint = argvPath === entrypointPath || argvPath?.endsWith("packages/cli/src/index.ts") === true;
if (isEntrypoint) { /* run */ }
```

- **Severity:** LOW
- **Finding:** The entrypoint check looks for `packages/cli/src/index.ts` specifically, which means it will trigger when run via `tsx` from the source directory. No global `krn` command is registered — users must use the local shim or `tsx` entry. This is correct for a local-only tool.

### 1.7 Code Quality: Duplication
- **Severity:** MEDIUM
- **Finding:** `pathExists()` is duplicated in ~15 files across `cli/commands/` (lines 19–26 in `verify.ts`, `handoff.ts`, `memory.ts`, `status.ts`, `doctor.ts`, etc.). Each file redefines the same 7-line function.
- **Finding:** `readJson<T>()` helper is similarly duplicated across `handoff.ts`, `operator-summary.ts`, `status.ts`, `doctor.ts`.

---

## 2. Graph + Context Package (`packages/graph/src/`, `packages/context/src/`)

### 2.1 Graph Building
**File:** `packages/graph/src/build-graph.ts` (lines 1–52)

8 detectors run in parallel via `Promise.all()`:
1. `filesystemDetector` — raw directory listing
2. `packageConventionsDetector` — source/test/doc/config classification with package root detection
3. `docsLinksDetector` — markdown link extraction + deprecation detection
4. `packageJsonDetector` — npm scripts extraction
5. `composerJsonDetector` — PHP composer scripts
6. `cssClassDetector` — CSS class extraction
7. `acfJsonDetector` — ACF (WordPress) field group detection
8. `wordpressBedrockDetector` — WordPress Bedrock project detection

- **Severity:** MEDIUM
- **Finding:** No AST parsing — all analysis is regex/keyword-based heuristic matching. This is documented as intentional for P0. The `packageConventionsDetector` is the most sophisticated (227 lines), implementing source→test→doc→config ownership graph edges.
- **Finding:** The `defaultDetectors` array is exported and used as a default parameter, enabling easy override but also making the order significant.

### 2.2 Context Selection & STOP Logic
**Files:**
- `packages/context/src/build-context-package.ts` (lines 1–876) — 876 lines, very large
- `packages/context/src/stop-policy.ts` (lines 1–33)
- `packages/context/src/rank-context.ts` (lines 1–7)

STOP is triggered when:
1. `contract.stop === true` (from task contract)
2. `buckets.missingContext.length > 0` (required context paths are absent)

- **Severity:** LOW
- **Finding:** The STOP logic is simple but correct. `rankContext()` sorts by priority descending, then alphabetically.

### 2.3 Context Quality & Noise
**File:** `packages/context/src/build-context-package.ts`

- **Severity:** HIGH
- **Finding:** The file is **876 lines** — the largest in the codebase. It does too much: task term extraction, graph relation matching, memory gating, package ID classification, bucket assignment, over-inclusion metrics, compactness budgets. This should be split.
- **Finding:** `taskTermsFor()` (line 146) uses a hardcoded 40-word stopword list that includes "context", "docs", "task", "update", "implement", "basic". This may be too aggressive — many legitimate technical terms are filtered.
- **Finding:** `packageIdForContextPath()` (line 174) has a hardcoded mapping of `src/`, `docs/`, `test/`, `tests/`, `__tests__/` → `package:.` which is fragile for projects with different top-level structures.

### 2.4 File Selection
**File:** `packages/context/src/build-context-package.ts` (lines 115–144)

Base items always included:
- `AGENTS.md` → must-read (priority 100)
- `docs/architecture/architecture-spec-v0.1.md` → should-read (priority 80)
- `docs/specs/context-package.schema.md` → reference-only (priority 40)

- **Severity:** HIGH
- **Finding:** The architecture-spec-v0.1 path is a hardcoded reference that may not exist in downstream repos. The context package will include a "missing" status item for this, adding noise. Similarly, the context-package.schema.md is a KRN-internal reference that may be irrelevant outside the harness repo.
- **Finding:** No loading of `CLAUDE.md` or `SKILL.md` — only `AGENTS.md`. The codex adapter generates `.codex/hooks.json` and `.agents/skills/krn-harness/SKILL.md` during `install`, but these are not loaded as context sources.

---

## 3. Hooks + Memory + Trace (`packages/hooks/src/`, `packages/memory/src/`, `packages/trace/src/`)

### 3.1 Hook System
**File:** `packages/hooks/src/codex-hook-entry.ts` (lines 1–1023)

- **Severity:** HIGH
- **Finding:** 1023-line file — the second-largest in the codebase. The hook guardrail system implements:
  - 7 supported events: `SessionStart`, `UserPromptSubmit`, `PreToolUse`, `PostToolUse`, `PreCompact`, `PostCompact`, `Stop`
  - ~10 finding codes: `invalid-hook-payload`, `missing-task-contract`, `missing-context-package`, `context-stop-active`, `do-not-use-edit`, `out-of-scope-edit`, `proof-path-exception`, `final-verify-missing`, `final-verify-blocked`, `final-handoff-missing`
  - Deterministic operator guidance (bilingual: English/Polish)
  - Ownership model: `task-context-owned-proof-paths-v1`
  - Trace payload budgeting: `maxHookTracePayloadBytes` with compaction fallback

- **Severity:** CRITICAL
- **Finding:** `enforced: false` is hardcoded in the hook result (line 1012). The hooks are **purely advisory guardrails** — they never prevent Codex from acting. This is documented but represents a gap if the intent is to block edits. The system can warn/block-in-trace but has no enforcement mechanism.

- **Severity:** MEDIUM
- **Finding:** The `handleCodexHook()` function defaults to a completely empty state when no input is provided (line 947-953), meaning `enforced: false` + all artifacts "missing" — the worst-case state. This is safe but means the hook command can be called in isolation without errors.

### 3.2 Memory — Governed Memory
**Files:**
- `packages/memory/src/schema.ts` (lines 1–23)
- `packages/memory/src/memory-store.ts` (lines 1–176)
- `packages/memory/src/pending.ts` (lines 1–37)

Memory state machine: `pending → approved` | `deprecated`

- **Severity:** LOW
- **Finding:** Clean, simple design. Records are stored as JSON files: `.krn/memory/pending.json`, `approved.json`, `deprecated.json`. Each has `schemaVersion: 1` and `status` field for self-validation.

- **Severity:** INFO
- **Finding:** Memory source is hardcoded as `"manual"` (schema.ts line 16). No automatic memory generation from task execution. This is appropriate for P0 — memories must be human-proposed and approved.

- **Severity:** INFO
- **Finding:** No TTL, no expiration, no compaction automation. The `compact.ts` file exists but was not read in detail.

### 3.3 Trace — JSONL Structure
**File:** `packages/trace/src/schema.ts` (lines 1–35)

16 event types defined:
```
cli.status, task.started, graph.built, context.built, verify.ran,
handoff.created, install.ran, doctor.ran, eval.ran, summary.ran,
review.ran, memory.proposed, memory.approved, memory.deprecated,
memory.listed, hook.received
```

- **Severity:** INFO
- **Finding:** Well-structured. `TraceEvent` has `id`, `timestamp`, `name`, optional `taskId`, optional `data: Record<string, JsonValue>`. `traceEventId()` uses `randomUUID()` for uniqueness. `taskIdFor()` uses SHA-256 hash (first 12 chars) for deterministic task IDs.

- **Severity:** LOW
- **Finding:** `hook.received` is in the trace schema but the operator-summary code explicitly flags `hook.received` count as "unproven" (line 383) — confirming the hooks have no real Codex integration yet.

### 3.4 Hooks Truly Unproven?
**File:** `packages/cli/src/operator-summary.ts` (lines 377–392)

```typescript
function hooksSignal(rawTrace: string | undefined): OperatorSummary["hooks"] {
  const hookReceivedCount = parseTraceEvents(rawTrace).filter(
    (event) => event.name === "hook.received",
  ).length;
  return {
    status: hookReceivedCount > 0 ? "pass" : "unproven",
    ...
  };
}
```

- **Severity:** INFO (confirmed)
- **Finding:** **Confirmed: hooks are unproven.** The system tracks `hook.received` events in traces but explicitly reports them as "unproven" when the count is 0. No real Codex integration exists — the `krn hook codex <event>` command is a CLI testing harness for the guardrail logic.

---

## 4. Verify + Task-Contract (`packages/verify/src/`, `packages/task-contract/src/`)

### 4.1 Verify Modes
**File:** `packages/verify/src/verify.ts` (lines 11–13)

- `record-only`: Only builds the result skeleton with command metadata. Does NOT spawn subprocesses.
- `execute`: Actually runs commands via `spawn()` with `shell: false`, timeout, and output redaction.

**Critical safety logic** (`verifyCommand.ts` line 73):
```typescript
const commandResults =
  profile.mode === "execute" && !resolvedProfile.issue && !contextPackage?.stop
    ? await runVerifyCommands(profile, ...)
    : undefined;
```

- **Severity:** MEDIUM
- **Finding:** In `record-only` mode, `commandResults` is `undefined`, which means `buildVerifyResult()` falls back to `commandResultsFor(profile)` (line 432), which marks all commands as `"recorded"` status without any execution data. This is correct but means record-only mode is purely documentation.

- **Severity:** MEDIUM
- **Finding:** When `contextPackage?.stop === true`, verify commands are **not executed even in execute mode** — the stop flag acts as a global gate. This is the correct safety behavior.

### 4.2 Command Policy — Allowlist Enforcement
**File:** `packages/verify/src/command-policy.ts` (lines 39–93)

The allowlist is restrictive:
- Only `pnpm lint|typecheck|test`, `npm test|npm run test`, and `node <single-safe-arg>` are allowed
- Everything else is blocked
- **Severity:** LOW
- **Finding:** This is very restrictive. Many CI/CD pipelines use `pnpm build`, `pnpm typecheck --noEmit`, `pnpm test --coverage`, etc. which would all be blocked. Users need to define custom profiles for non-standard commands.

### 4.3 Task Contract — JSON Schema
**File:** `packages/task-contract/src/schema.ts` (lines 1–33)

The contract is an interface, not a JSON schema. Validation is done by `validateContract()` in `validate-contract.ts`.

- **Severity:** LOW
- **Finding:** No external JSON schema (e.g., AJV) — validation is manual checks in `validateContract()`. This is fine for P0 but limits interoperability with external tooling.

- **Severity:** HIGH
- **Finding:** `buildTaskContract()` (line 16) always classifies anything with "implementation" keywords as "edit" mode. The classification logic is purely keyword-based (line 3-22): `"review"/"audit" → review`, `"docs"/"adr"/"readme" → docs`, `"research"/"source" → research`, else `"implementation"`. Very basic but functional for P0.

### 4.4 Handoff
**File:** `packages/cli/src/commands/handoff.ts` (lines 301–365)

Handoff reads all current artifacts and assembles a markdown document with:
- Task summary + STOP status
- Verify results
- Graph stats
- Trace paths
- Install status
- Doctor status
- Eval status
- Changed files (via `git status --short`)
- Known gaps + Residual risks sections

- **Severity:** LOW
- **Finding:** The handoff is a "read-the-room" document — it doesn't analyze correctness, just assembles what's available. The "Known Gaps" and "Residual Risks" sections are hardcoded text (lines 284-295), not dynamically generated.

---

## 5. Cross-Cutting Concerns

### 5.1 TypeScript Types
- **Severity:** LOW
- **Finding:** Types are well-defined and consistent across packages. Each package has its own schema files with clear interfaces. No `any` types were found in the source files reviewed.

### 5.2 Export Patterns
- All packages use barrel files (`index.ts` → `export * from "..."`)
- No clear separation between public and internal exports — everything is re-exported
- **Severity:** LOW
- **Finding:** The `guardrail-fixtures.ts` is exported from the hooks package's barrel file. This is test infrastructure leaking into the public API.

### 5.3 Testing
- 18 test files identified across packages
- `packages/cli/src/index.test.ts` is the largest (2918 lines) — extensive integration tests
- `packages/hooks/src/codex-hook-entry.test.ts` (597 lines) — fixture-based testing
- Tests use `vitest` with fixture repos in `fixtures/repos/`
- **Severity:** MEDIUM
- **Finding:** Heavy reliance on fixture repos and file system operations in tests. The 2918-line CLI test file includes real `spawnSync` calls to shell scripts. This makes tests comprehensive but slow and fragile.

### 5.4 Circular Dependencies
- **Severity:** HIGH
- **Finding:** Potential circular dependency risk:
  - `cli` depends on `context` → `graph` → `memory`
  - `context` depends on `memory` → `task-contract`
  - `context` depends on `graph`
  - `verify` depends on `context` → `task-contract`
  - `cli` depends on `verify` → `context` → `task-contract`
  - `cli` depends on `hooks` → (standalone)
  - `doctor` depends on `memory` → `task-contract`
  - No `doctor` → `graph` → `context` → `memory` circular path was found, but the dependency graph is dense and could easily develop cycles.

### 5.5 Dependencies
**Severity:** INFO
- Each package depends on `node:fs/promises`, `node:path`, `node:crypto` — standard library only
- Inter-package dependencies follow the domain layering: `cli → core/graph/context/verify/memory/hooks/task-contract/trace/config`
- No external npm dependencies beyond `tsx` (for the bin wrapper)

### 5.6 Config Schema
- `krn.config.json` is the only config file
- Schema validation is manual (not AJV/Zod)
- **Severity:** LOW
- **Finding:** The config schema is consistent across `config/src/schemas.ts` and `verify/src/verify.ts` where `VerifyConfigProfileInput` and `VerifyConfigInput` duplicate the same fields. `VerifyConfigInput` in verify.ts is a separate interface from `VerifyConfigInput` in config schemas, which is a duplication concern.

### 5.7 Documentation
- **Severity:** MEDIUM
- **Finding:** **No JSDoc comments** found in any source file. The code relies entirely on inline comments and fixture-based tests for documentation. Each package lacks a README. ADRs exist in `docs/adr/` but inline code documentation is absent.

---

## 6. Summary of Findings by Severity

### CRITICAL (1)
| # | File:Line | Finding |
|---|-----------|---------|
| 1 | `hooks/src/codex-hook-entry.ts:1012` | `enforced: false` is hardcoded — hooks are purely advisory, never enforce block decisions on the agent |

### HIGH (4)
| # | File:Line | Finding |
|---|-----------|---------|
| 1 | `core/src/result.ts` | `KRNResult<T>`, `ok()`, `err()` are defined but **never used** — dead code |
| 2 | `context/src/build-context-package.ts` | 876-line god file doing graph matching, memory gating, bucket assignment, over-inclusion metrics, compactness budgets |
| 3 | `context/src/build-context-package.ts:117-144` | Hardcoded context items (`architecture-spec-v0.1.md`, `context-package.schema.md`) that create noise in downstream repos |
| 4 | `task-contract/src/classify-task.ts:3-22` | Task classification is purely keyword-based with no ML or structured parsing |

### MEDIUM (6)
| # | File:Line | Finding |
|---|-----------|---------|
| 1 | `cli/src/index.ts:41-107` | Flat `if/else` command dispatch — no parser, no middleware, no validation pipeline |
| 2 | `cli/src/commands/{verify,handoff,status,doctor,memory}.ts` | `pathExists()` and `readJson<T>()` are duplicated across ~15 files |
| 3 | `verify/src/verify.ts:229-252` | `verifyEnvAllowlist` is hardcoded; adding/removing env vars requires code changes |
| 4 | `verify/src/command-policy.ts:66-78` | Allowlist is too restrictive — blocks `pnpm build`, `pnpm test --coverage`, etc. |
| 5 | `cli/src/index.ts:109-117` | Entrypoint detection uses hardcoded path suffix — fragile |
| 6 | `hooks/src/index.ts:9` | Test fixtures exported in public barrel file |

### LOW (7)
| # | File:Line | Finding |
|---|-----------|---------|
| 1 | `cli/src/identity.ts:7` | Version hardcoded as `"0.0.0"` |
| 2 | `cli/src/commands/{start,graph,context,verify}.ts` | No transactional pipeline — partial failures leave orphaned artifacts |
| 3 | `cli/src/commands/handoff.ts:284-295` | Handoff "Known Gaps" and "Residual Risks" sections are hardcoded text |
| 4 | `cli/src/index.ts:112` | Entrypoint check matches `packages/cli/src/index.ts` — source path leak |
| 5 | `graph/src/build-graph.ts:11-20` | Detector order matters but isn't documented |
| 6 | `task-contract/src/schema.ts` | No JSON Schema (AJV/Zod) — only manual validation |
| 7 | `hooks/src/codex-hook-entry.ts:947-953` | Empty default state means hooks can be called in isolation safely |

### INFO (8)
| # | File:Line | Finding |
|---|-----------|---------|
| 1 | `cli/src/index.ts` | No CLI parser (yargs/commander) — flat dispatch |
| 2 | `verify/src/verify.ts:229-272` | Shell env scrubbing and output redaction is well-implemented |
| 3 | `memory/src/schema.ts:16` | Memory source hardcoded as `"manual"` — no auto-generation |
| 4 | `trace/src/schema.ts:4-21` | 16 trace events, well-structured JSONL |
| 5 | `cli/src/operator-summary.ts:383` | `hook.received` count explicitly flagged as "unproven" |
| 6 | All packages | No JSDoc comments in any source file |
| 7 | All packages | No README.md in individual packages |
| 8 | All packages | No external npm dependencies beyond `tsx` |

---

## 7. Architectural Strengths

1. **Layered domain separation** — Each package has a clear responsibility: graph builds the structure, context packages select relevant files, hooks provide guardrails, verify executes validation, memory stores decisions, trace records everything.

2. **Security-first verify command** — `shell: false`, env scrubbing, command allowlist, output redaction, and timeout. The verify system is genuinely safe for untrusted execution.

3. **Deterministic trace system** — JSONL format, task-scoped runs, run pointers, and metadata tracking. The trace is append-only and machine-readable.

4. **Governing memory lifecycle** — Clear state machine (pending → approved/deprecated), file-based persistence, schema validation on read.

5. **Pinned CLI identity** — The identity system with source root, runtime CWD, and bin wrapper path provides auditability of which CLI binary is executing.

6. **Hook guardrail design** — The 10-finding code taxonomy with deterministic operator messages (bilingual) and remediation code mapping is a well-thought-out design for agent safety.

## 8. Architectural Risks

1. **Hooks are advisory only** — The most critical safety mechanism (hooks) has `enforced: false` hardcoded. This is the biggest architectural gap.
2. **No pipeline transactionality** — The 5-step flow (start→graph→context→verify→handoff) has no rollback or atomicity.
3. **Large monolithic files** — `codex-hook-entry.ts` (1023 lines) and `build-context-package.ts` (876 lines) exceed reasonable complexity thresholds.
4. **Hardcoded paths** — Architecture spec, context schema, and stopword lists are hardcoded and don't adapt to downstream repos.
5. **No JSON Schema validation** — Config and contract validation is manual, limiting tooling interoperability.
