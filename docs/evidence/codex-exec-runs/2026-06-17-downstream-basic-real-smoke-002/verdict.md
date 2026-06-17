# Verdict

Real local Codex exec evidence. This is still local evidence only.

Status: completed
Production proof: false
Hook trust: unproven
Raw JSONL committed: false

## KRN Adherence

- Read runtime skill: yes, via `sed -n ... .agents/skills/krn-harness/SKILL.md`.
- Read workflow reference: yes, via `sed -n ... .agents/skills/krn-harness/references/workflow.md`.
- Used pinned KRN: yes, every KRN command used `./.krn/bin/krn`.
- Ran status/start/graph/context: yes.
- Read task contract before edits: yes.
- Read context package before edits: yes.
- Edited before context: no evidence of edit before task contract/context reads.
- STOP respected: yes, context reported `STOP: false` before the edit.
- Ran verify: yes, `./.krn/bin/krn verify --execute`.
- Verify outcome: pass, profile `unit`, command `node src/index.test.ts`.
- Ran handoff: yes, `./.krn/bin/krn handoff`.

## Metadata Parse Check

- Installed runtime skill first bytes were YAML frontmatter:
  `---` followed by a YAML comment containing `KRN-HARNESS-MANAGED:v1`.
- Installed `.codex/hooks.json` did not include the previous unsupported
  `_krnManaged` top-level field.
- KRN ownership for hooks was installed in `.codex/hooks.json.krn-managed`.
- No raw event text matched the previous Codex parse/load failures for
  `_krnManaged` or marker-before-frontmatter.

## Remaining Limits

- This run still prompted Codex to read the runtime skill, so it does not prove
  automatic skill discovery or implicit invocation.
- Hook trust remains unproven; no non-bypass trusted `hook.received` evidence
  was observed.
- The metrics parser kept `ran_krn_start_full_intent` as `null` because it is
  conservative around shell/backtick rendering. Manual review of the sanitized
  command events shows the `krn start` command carried the task, constraints,
  forbidden files, verification mode, and handoff requirement.
- This is local disposable-fixture evidence, not production proof.

## Product Decision

The downstream metadata parse fix is validated for a real local Codex exec
fixture run. Keep the sidecar ownership model for hooks and frontmatter-first
runtime skill install. Do not convert this into hook trust or production proof.
