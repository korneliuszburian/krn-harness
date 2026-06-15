# Downstream Basic Demo

This demo shows the local P0 onboarding loop against `fixtures/repos/downstream-basic`.

It is local evidence only. It does not launch Codex, call CI, prove sandbox enforcement, or contact external services.

## Setup

From the KRN Harness source checkout:

```bash
tmpdir="$(mktemp -d)"
cp -R fixtures/repos/downstream-basic "$tmpdir/downstream-basic"
cd "$tmpdir/downstream-basic"
```

Use the locally built `krn` command from this repository, or run the equivalent package script from the source checkout with the downstream directory as the working directory.

## Smoke Loop

```bash
krn install
krn status
krn start "Harden downstream basic fixture context"
krn graph
krn context
krn hook codex SessionStart
printf '{"tool":"Read","filePath":"src/index.ts"}' | krn hook codex PreToolUse
krn verify
krn verify --execute
krn handoff
krn doctor
krn eval
```

## Expected Artifacts

- `krn.config.json`
- `AGENTS.md`
- `.codex/hooks.json`
- `.agents/skills/krn-harness/SKILL.md`
- `.krn/current/task-contract.json`
- `.krn/current/context-package.json`
- `.krn/current/verify-result.json`
- `.krn/current/handoff.md`
- `.krn/current/doctor-result.json`
- `.krn/current/eval-result.json`
- `.krn/graph/repo-graph.json`
- `.krn/traces/trace.jsonl`
- `.krn/runs/<task_id>/trace.jsonl`

## Expected Limits

- `krn verify` is record-only by default.
- `krn verify --execute` runs only the allowlisted `node src/index.test.ts` fixture command with no shell mode.
- Hooks are guardrails and trace points, not a sandbox.
- Eval is harness-only and deterministic; it does not run Codex non-interactively.
- `.krn/` is local runtime state.

## References

- `docs/specs/downstream-acceptance.md`
- `docs/specs/onboarding.md`

## Product-Code Fixture

Use `fixtures/repos/product-code-dogfood` when the target proof needs a code/test repair shape instead of onboarding only.

```bash
source_checkout="$(pwd)"
tmpdir="$(mktemp -d)"
cp -R fixtures/repos/product-code-dogfood "$tmpdir/product-code-dogfood"
cd "$tmpdir/product-code-dogfood"
mkdir -p fixtures/dogfood/tasks
cp "$source_checkout/fixtures/dogfood/tasks/product-code-test-dogfood.json" fixtures/dogfood/tasks/
krn start --task-spec fixtures/dogfood/tasks/product-code-test-dogfood.json
krn graph
krn context
krn verify --execute
```

The first execute verify should fail until `src/index.ts` is repaired. After the code-only repair, `krn verify --execute` should pass by running `node src/index.test.ts`; `docs/stale-pricing.md` should remain `do-not-use`.
