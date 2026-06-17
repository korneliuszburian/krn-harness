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

## Observed Commands

Codex executed 11 command events. The KRN workflow commands were:

- `./.krn/bin/krn status`
- `./.krn/bin/krn start "...full intent..."`
- `./.krn/bin/krn graph`
- `./.krn/bin/krn context`
- `sed -n ... .krn/current/task-contract.md`
- `sed -n ... .krn/current/context-package.md`
- `./.krn/bin/krn verify --execute`
- `./.krn/bin/krn handoff`

## Failure Modes

- Raw JSONL event 2 reported a Codex hooks config parse error: generated
  `.codex/hooks.json` includes `_krnManaged`, which Codex did not accept as a
  top-level hooks field. Hook trust remains unproven.
- Operator-visible stderr during `codex exec` also reported that the installed
  runtime skill could not be loaded as a skill because the managed marker
  appears before YAML frontmatter. The model still read the skill file manually
  because the prompt instructed it to, but automatic skill loading was not
  proven by this run.
- The task contract dropped the inline backticked command text from one sentence
  in Markdown rendering, but Codex preserved the intended command in the actual
  docs edit and verify command.

## Product Decision

The runtime-skill workflow improved ordering: Codex gathered KRN status, task,
graph, context, task contract, and context package before editing. It did not
work around KRN for verify/handoff.

The next fix should harden install output for real Codex loading:

- keep YAML frontmatter as the first bytes of installed `SKILL.md`;
- remove or relocate `_krnManaged` from `.codex/hooks.json` so Codex can parse
  the hooks file.

Do not claim production proof or hook trust from this run.
