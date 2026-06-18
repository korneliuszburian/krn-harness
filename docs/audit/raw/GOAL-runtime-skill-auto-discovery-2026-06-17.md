> RAW / HISTORICAL INPUT.
>
> This is not the active KRN Harness goal and not active product truth.
> Current active goal pointer: `GOAL.md`.
> Current audit-consolidation goal:
> `docs/product/audit-consolidation-goal-2026-06-18.md`.

Prove or falsify downstream runtime skill auto-discovery with real `codex exec`, including stderr capture. Start from KRN source HEAD `2062235f282634a031e04a16006ecc3eef012ee1` or newer.

This goal tests whether the installed downstream runtime skill is discovered/used by Codex without explicitly telling Codex to read `.agents/skills/krn-harness/SKILL.md`. It also captures sanitized stderr because Codex exec may report skill/hooks loading friction outside JSONL stdout.

Current truth:
- Smoke 001 proved real Codex could follow the KRN workflow when explicitly prompted, but exposed metadata parse failures.
- Smoke 002 fixed those parse failures and proved the workflow still works when explicitly prompted.
- Smoke 002 does not prove automatic skill discovery or implicit invocation.
- Hook trust remains unproven.
- Production proof remains false.
- Runtime skill scripts/API/subagents/dashboard/MCP remain intentionally unbuilt.

Mission:
1. Extend Codex exec evidence capture to include optional stderr.
2. Run a real downstream `codex exec --json` smoke without explicitly telling Codex to read `SKILL.md` or `references/workflow.md`.
3. Determine whether Codex auto-discovers or implicitly uses the installed runtime skill.
4. Commit only sanitized evidence.
5. If auto-discovery does not happen, record the exact blocker and decide whether downstream `AGENTS.md` must explicitly route Codex to the runtime skill.
6. Do not claim hook trust or production proof.

Hard rules:
- Do not commit raw JSONL.
- Do not commit raw stderr.
- Do not commit `.local/`.
- Do not commit raw diffs, secrets, auth files, `.env`, env dumps, protected data, customer data, or target repo files.
- Do not mutate real customer/protected repos.
- Do not use `danger-full-access`.
- Do not implement hook trust.
- Do not claim hook trust.
- Do not claim production proof.
- Do not add API/subagents/dashboard/MCP.
- Do not add runtime skill scripts.
- Do not add new top-level KRN commands.
- Do not broaden installer behavior unless the smoke proves a direct blocker.
- Do not touch protected scratch:
  - `.gitignore`
  - `GOAL.md`
  - `GOAL-8H.md`
  - `ARCHITECTURE-AUDIT.md`
  - `docs/audit/`
  - `.agents/skills/grill-with-docs/`

Stage 0 — Baseline

Run in `krn-harness`:

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:local
pnpm --silent krn eval
pnpm --silent krn release-check --write
git diff --check
````

Confirm:

* `HEAD == origin/main`
* HEAD is `2062235f282634a031e04a16006ecc3eef012ee1` or newer
* remote CI for current HEAD is green
* only known protected scratch is dirty/untracked
* no `.krn` runtime artifacts are staged

Stage 1 — Add stderr support to evidence pack

Update evidence spec and summarizer to support optional sanitized stderr.

Add optional committed file:

```txt id="ic7laf"
stderr.redacted.txt
```

Raw/local-only file:

```txt id="lu9k57"
.local/codex-exec-runs/<run-id>/stderr.raw.log
```

Update:

```txt id="gf4zmy"
docs/specs/codex-exec-evidence-pack.md
docs/runbooks/codex-exec-downstream-test.md
scripts/summarize-codex-exec-run.ts
packages/evals/src/codex-exec-evidence.ts
```

New summarizer input:

```txt id="m5s8x5"
--stderr <path> optional
```

Rules:

* stderr is sanitized before commit;
* redact home dirs, temp dirs, tokens, auth paths, env values;
* fail closed on `.env`, auth file contents, obvious secrets;
* preserve safe diagnostic lines mentioning:

  * skill loading;
  * frontmatter;
  * hooks config;
  * parse errors;
  * warning/error summaries;
  * Codex exec status;
* omit large progress/noise output.

Metrics additions:

```json id="jyj4xw"
"diagnostics": {
  "stderr_captured": true,
  "skill_load_errors": 0,
  "hooks_parse_errors": 0,
  "frontmatter_errors": 0,
  "codex_exec_errors": 0
}
```

If schema update is too broad, keep diagnostics in `verdict.md` and `stderr.redacted.txt` only. Do not over-engineer.

Stage 2 — Tests for stderr capture

Add focused tests:

* raw stderr with previous `_krnManaged` hooks parse error becomes sanitized diagnostic;
* raw stderr with marker-before-frontmatter message becomes sanitized diagnostic;
* raw stderr with home/temp path is redacted;
* raw stderr with secret-like value fails closed;
* no stderr input still works for old packs;
* fixture pack/eval still passes.

Stage 3 — Prepare disposable downstream target

Use disposable `/tmp` copy of `fixtures/repos/downstream-basic`.

Install KRN from current source HEAD.

Verify target install:

```bash id="41zsbd"
test -f AGENTS.md
test -f .agents/skills/krn-harness/SKILL.md
test -f .agents/skills/krn-harness/agents/openai.yaml
test -f .agents/skills/krn-harness/references/workflow.md
node -e 'const fs=require("fs"); const s=fs.readFileSync(".agents/skills/krn-harness/SKILL.md","utf8"); if(!s.startsWith("---\n")) process.exit(1)'
node -e 'const j=require("./.codex/hooks.json"); if("_krnManaged" in j) process.exit(1); if(!j.hooks) process.exit(1)'
test -f .codex/hooks.json.krn-managed
```

Do not commit target repo files.

Stage 4 — Run real Codex exec without explicit skill-read instruction

Run id:

```txt id="itd2qe"
2026-06-17-downstream-basic-auto-skill-smoke-001
```

Prompt must **not** say:

* “read `.agents/skills/krn-harness/SKILL.md`”
* “read `.agents/skills/krn-harness/references/workflow.md`”
* “use the KRN Harness workflow from SKILL.md”

Allowed prompt:

```txt id="u6n145"
This repository is already installed with KRN Harness. Follow the repository instructions and complete the task using the repo's configured workflow and evidence process.

Task:
Update docs/overview.md by adding one concise sentence stating this fixture verifies with `node src/index.test.ts`.

Constraints:
- Do not edit source code, tests, config, hooks, runtime skill files, `.krn/bin/krn`, or protected data.
- Run the configured verification path if the repository instructions require it.
- Produce the expected handoff/evidence if the repository instructions require it.
```

Run:

```bash id="zq55sf"
mkdir -p .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001

codex exec \
  --cd "<tmp-target>" \
  --sandbox workspace-write \
  --json \
  -o .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/final.md \
  "$(cat .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/prompt.txt)" \
  > .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/events.raw.jsonl \
  2> .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/stderr.raw.log
```

If Codex fails:

* summarize the failed real run if raw JSONL/stderr exists;
* do not fake success;
* record blocker honestly.

Stage 5 — Summarize sanitized pack

In `krn-harness`:

```bash id="k9yccj"
pnpm tsx scripts/summarize-codex-exec-run.ts \
  --raw-jsonl .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/events.raw.jsonl \
  --stderr .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/stderr.raw.log \
  --final-message .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/final.md \
  --out docs/evidence/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001 \
  --run-id 2026-06-17-downstream-basic-auto-skill-smoke-001 \
  --kind real_codex_exec \
  --target-repo downstream-basic-disposable-fixture \
  --target-commit <target-sha-or-unknown> \
  --krn-source-commit $(git rev-parse HEAD) \
  --prompt .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/prompt.txt \
  --command .local/codex-exec-runs/2026-06-17-downstream-basic-auto-skill-smoke-001/command.txt \
  --sandbox workspace-write
```

Stage 6 — Verdict requirements

In the new evidence pack, `verdict.md` must answer:

```txt id="fj02am"
Did Codex report skill-load/frontmatter errors in stderr?
Did Codex report hooks parse errors in stderr?
Did Codex read runtime SKILL.md without explicit prompt instruction?
Did Codex read workflow reference without explicit prompt instruction?
Did Codex use ./.krn/bin/krn?
Did Codex run status/start/graph/context?
Did Codex read task contract/context before edit?
Did Codex run verify/handoff?
Did Codex edit only allowed files?
Was automatic skill discovery proven, disproven, or still unclear?
```

Use verdict statuses:

```txt id="kpmpa8"
AUTO_DISCOVERY_PROVEN
AUTO_DISCOVERY_NOT_PROVEN
AUTO_DISCOVERY_BLOCKED
```

Important:

* If Codex follows AGENTS.md but does not read SKILL.md, status is `AUTO_DISCOVERY_NOT_PROVEN`.
* If stderr shows skill loading failed, status is `AUTO_DISCOVERY_BLOCKED`.
* If Codex reads SKILL.md/reference without explicit instruction, status may be `AUTO_DISCOVERY_PROVEN`, but only if evidence supports it.

Stage 7 — Validation

Run:

```bash id="yfu55a"
git status --short --branch
pnpm lint
pnpm typecheck
pnpm test
pnpm verify:local
pnpm --silent krn eval
pnpm --silent krn release-check --write
git diff --check
git diff --cached --check
```

Stage only intended files:

* stderr capture/spec/runbook/script/eval changes;
* sanitized evidence pack;
* minimal proof matrix/docs updates if needed.

Do not stage:

* `.local`
* raw JSONL
* raw stderr
* raw diffs
* target repo files
* `.krn` runtime artifacts
* protected scratch

Commit:

```bash id="73g0cv"
git commit -m "test(evidence): probe runtime skill auto discovery"
git push
```

Check remote CI.

Final handoff:

1. Summary.
2. Source HEAD.
3. Evidence pack path.
4. Codex exec run id.
5. Whether stderr was captured.
6. Skill-load diagnostics.
7. Hooks parse diagnostics.
8. Auto-discovery verdict.
9. KRN adherence summary.
10. Commands observed.
11. Files changed in target.
12. Verify/handoff outcome.
13. Source validation.
14. Remote CI.
15. What was intentionally not built.
16. What remains unproven.
17. Recommended next goal.
18. Dirty/untracked files left.

Completion definition:
Complete only if:

* stderr capture support exists or an exact blocker is recorded;
* one real `codex exec --json` auto-discovery smoke is run, or exact blocker is recorded;
* sanitized evidence pack is committed;
* raw JSONL/stderr are not committed;
* no secrets/protected data are committed;
* auto-discovery is classified honestly;
* source is pushed and CI checked.

Reject if:

* prompt explicitly tells Codex to read SKILL.md/reference;
* stderr is ignored when available;
* raw JSONL/stderr is committed;
* fixture/manual output is labeled as real;
* hook trust/production proof is claimed;
* the goal expands into hook trust, dashboard, API, subagents, MCP, or runtime skill scripts.

```
```
