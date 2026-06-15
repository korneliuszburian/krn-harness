# Downstream Acceptance

KRN Harness P0 is accepted in a downstream repository when onboarding produces a small, deterministic local workflow without overwriting project-owned instructions.

## Required Install Artifacts

`krn install` must create missing files and directories only:

- `krn.config.json`
- `AGENTS.md`
- `.codex/hooks.json`
- `.agents/skills/krn-harness/SKILL.md`
- `.krn/current/`
- `.krn/graph/`
- `.krn/traces/`
- `.krn/runs/`
- `.krn/memory/`

Existing files are skipped, not overwritten. The install trace records compact action summaries as `{ path, kind, status }`.

## Downstream Smoke Loop

A downstream acceptance smoke can run this deterministic local loop:

```txt
krn install
krn status
krn start "Run downstream acceptance smoke with install, graph, context, hook, verify, handoff, doctor, and eval evidence."
krn graph
krn context
krn hook codex SessionStart
krn hook codex PreToolUse
krn verify
krn verify --execute
krn handoff
krn doctor
krn eval
```

The loop is local-only evidence. It does not claim CI, sandbox, hosted, or production enforcement.

`fixtures/repos/downstream-basic/krn.config.json` includes a safe record-only `node src/index.test.ts` verify profile for dogfood checks. `krn verify` policy-checks and records that command. `krn verify --execute` runs it through the P0 no-shell execution path.

`fixtures/repos/product-code-dogfood/krn.config.json` uses the same safe Node execution pattern for a product-code repair fixture. The fixture starts with a failing implementation in `src/index.ts`; local proof requires the paired `src/index.test.ts` oracle to pass after a code-only repair while `docs/stale-pricing.md` remains `do-not-use`.

## Template Expectations

Generated `AGENTS.md` and runtime skill content must stay thin. They route Codex through KRN CLI commands and must not embed full architecture, raw research, or a policy engine.

Generated `AGENTS.md` must pass the adapter quality gate before `krn install`
creates downstream files. The gate requires:

- `## Roles`
- `## Non-negotiables`
- `## KRN Workflow`
- KRN workflow commands such as `krn status`, `krn start`, `krn graph`,
  `krn context`, `krn verify`, and `krn handoff`
- a runtime skill reference to `.agents/skills/krn-harness/SKILL.md`

If the generated template fails this gate, `krn install` exits non-zero before
writing install artifacts.

Generated hooks must cover the seven P0 Codex lifecycle events and call `./.krn/bin/krn hook codex <event>` through the pinned wrapper installed by `krn install`.

## Doctor Source vs Downstream

In the source checkout, missing downstream runtime artifacts are warnings because build-time skills and adapter templates are the active source truth.

In a downstream repository, missing generated artifacts are actionable warnings that should point to `krn install`. Malformed generated hooks or runtime skills are failures.

## Eval Scope

P0 evals are harness-only deterministic checks. The downstream acceptance grade checks fixture shape and generated template contracts. It does not launch Codex, call external services, or run a real downstream CI pipeline.
