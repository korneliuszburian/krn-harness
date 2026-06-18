# Hooks Pack

## Purpose

The Codex hooks template connects lifecycle events to `./.krn/bin/krn hook codex <event>` through the pinned wrapper installed by `krn install`.

## Events

- `SessionStart`
- `UserPromptSubmit`
- `PreToolUse`
- `PostToolUse`
- `PreCompact`
- `PostCompact`
- `Stop`

## Limitation

Hooks are guardrails and trace points. They are not a complete security boundary or sandbox.

Codex may run multiple matching hooks concurrently, and non-managed command hooks require repo-owner trust before they run. KRN hook output is therefore local guardrail evidence, not OS-level or Codex-level sandbox policy.

P0 hook handling returns a deterministic response and writes `hook.received` with provider, event, support status, guardrail decision, payload source, finding codes, and detail. Unsupported events are ignored without crashing.

## Guardrail Decisions

The P0 response shape includes:

- `decision`: `allow`, `warn`, or `block`.
- `status`: `ok`, `warn`, `blocked`, or `ignored`.
- `enforced`: always `false` in P0, because hooks are guardrails and trace points.
- `ownershipModel`: `task-context-owned-proof-paths-v1`.
- `ownedProofPathHintLimit`: `4`.
- `tracePayloadByteLimit`: `1024`.
- `ownedProofPathHints`: compact exact paths or prefixes that were actually used by `proof-path-exception` findings.
- `operatorMessageVersion`: `hook-operator-message-v1`.
- `userFacingMessage`: deterministic English and Polish operator wording for stdout/API consumers.
- `remediationCodes`: compact machine-readable next-action codes.
- `remediationHints`: deterministic English and Polish remediation hints for stdout/API consumers.
- `findings`: deterministic codes with severity and optional path.

The machine decision is the contract for guardrail behavior. `decision`, `status`, `enforced`, `findings`, and finding severities decide whether the hook allows, warns, or blocks. Operator messages explain that decision for a human and must not change allow/warn/block semantics.

Trace payloads stay compact. `hook.received` records `operatorMessageVersion` and `remediationCodes`, but it must not record `userFacingMessage` or full `remediationHints` text. Long wording belongs in the hook command JSON result, not in trace JSONL.

`krn hook codex <event>` must build trace data through `buildHookTracePayload(result)`. The helper is the writer-side budget boundary for hook traces. It preserves the machine decision fields, finding codes, compact ownership hints, and compact remediation codes while keeping stdout/API output full.

## Hook Truth Status

Hook decisions can be `allow`, `warn`, or `block`, but P1 still records `enforced: false`. That field means KRN does not claim sandbox enforcement, process isolation, or guaranteed Codex policy blocking.

Real Codex hook loading/trust remains unproven until a trusted non-bypass Codex hook path emits `hook.received` with trusted provenance. Manual `krn hook codex <event>` probes and fixture traces are diagnostics only; they are not proof that Codex loaded or trusted project hooks. Operator summaries classify these as `manual-diagnostic-only`; future trusted non-bypass markers may be classified as `partially-proven` for the scoped event/path.

P0 records `block` decisions for:

- edit-intent `PreToolUse` without `.krn/current/task-contract.json`;
- edit-intent `PreToolUse` without `.krn/current/context-package.json`;
- edit-intent `PreToolUse` while current context STOP is active;
- edit payloads targeting `do-not-use` paths;
- edit payloads outside current `must-read` and `should-read` context paths, except task/context-owned proof paths;
- final `Stop` without `.krn/current/task-contract.json` or `.krn/current/context-package.json`;
- final `Stop` without `.krn/current/verify-result.json`;
- final `Stop` without `.krn/current/handoff.md`.

P0 records `warn` decisions for:

- initial prompt, read-only `PreToolUse`, `PostToolUse`, `PreCompact`, or `PostCompact` events before current-state artifacts exist;
- `PreCompact` when task/context exist but `.krn/current/run-result.json` or `.krn/current/operator-report.json` is missing;
- `PostCompact` when context is missing or STOP-active and should be refreshed before further edits;
- invalid JSON stdin payloads;
- task/context-owned test/docs/fixture proof paths outside active context;
- final `Stop` when context STOP was already captured in verify/handoff artifacts.

P0 records `info` findings for:

- `PreCompact` after `.krn/current/continuation-state.json` and
  `.krn/current/continuation-state.md` have been written by the hook command.

`SessionStart` records a `warn` decision when a current continuation state
artifact exists. The warning tells Codex/operator to read
`.krn/current/continuation-state.md` before starting new work. This is a
restart anchor only. It does not prove Codex hook trust, does not own Codex
session state, and does not replace checked-in `AGENTS.md`, goal, ledger, or
handoff truth.

Continuation state contains only current artifact pointers, minimal task/context
status, conservative git status, next-action guidance, source-basis links, and
proof boundaries (`productionProof: false`, `hookTrustStatus: unproven`). It
must not copy raw chat history, protected data, generated screenshots, appshots,
browser captures, dashboards, vectors, MCP outputs, publishing artifacts, or
target repository artifacts.

P0 proof paths are recognized as docs, fixture, README, test, or spec files. Recognition alone is not enough to bypass scope. A proof path produces `proof-path-exception` only when it matches a deterministic ownership hint derived from the current task/context. Unowned proof paths remain `out-of-scope-edit` blocks. Paths marked `do-not-use` still block.

The P0 ownership model is deliberately shallow. It maps current context paths under `packages/<name>/...` to the exact `packages/<name>` proof hint. Task signals such as `config`, `context`, `task contract`, `graph`, `memory`, `verify`, `handoff`, `doctor`, `eval`, `hook`, `trace`, and `adapter` map only to narrow spec or fixture hints. Root config signals map only to exact files such as `biome.json`, `tsconfig.json`, `package.json`, `pnpm-workspace.yaml`, `vitest.config.ts`, or `.github/workflows/verify.yml`. Task words alone do not unlock package proof paths. Broad hints such as `docs`, `fixtures`, `tests`, or `packages` are not valid ownership hints. This is not semantic retrieval, repo intelligence, or a full policy engine.

To keep trace payloads small, `ownedProofPathHints` contains only the compact hints used by proof-path findings, sorted and de-duplicated, capped at 4 entries. Allow/block events without proof-path exceptions should normally emit an empty owned hint list.

Hook trace payloads include `tracePayloadMode`: `full` when the compact writer payload fits under 1024 bytes, or `compacted` when the writer replaces oversized detail/event/hint strings with deterministic compact values before writing. Compacted payloads must keep decision, status, finding codes, and remediation codes intact.

P0 remediation codes are intentionally small and action-oriented. Examples include `run-krn-start`, `run-krn-context`, `scope-path`, `review-owned-proof-path`, `avoid-do-not-use-path`, `resolve-context-stop`, `run-krn-verify`, `run-krn-handoff`, and `read-continuation-state`. The deterministic taxonomy fixture is `fixtures/hooks/remediation-taxonomy.json`.

P0 payload parsing is shallow and deterministic. It recognizes JSON stdin, common tool name fields, path fields, and simple patch file headers. It is not a full Codex policy engine.

## Downstream Template

`krn install` writes the generated hooks template to `.codex/hooks.json` only
when that file does not already exist or is already KRN-managed. Existing
markerless hooks are preserved.

The installed `.codex/hooks.json` must stay parseable by Codex and therefore
must not include KRN-only top-level metadata. KRN ownership for generated hooks
is recorded in `.codex/hooks.json.krn-managed`. Reinstall may update hooks when
that sidecar is present or when an older inline managed marker is found.

Repo owners must review generated hooks before relying on them.

## Evidence

- https://developers.openai.com/codex/hooks
