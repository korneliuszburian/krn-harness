# Verdict

Real local Codex exec evidence. This is still local evidence only.

Status: completed
Production proof: false
Hook trust: unproven
Raw JSONL committed: false

## Auto-Discovery Verdict

Status: `AUTO_DISCOVERY_PROVEN`

Codex read `.agents/skills/krn-harness/SKILL.md` and
`.agents/skills/krn-harness/references/workflow.md` without the prompt telling
it to read either path. The prompt only said the repo was already installed with
KRN Harness and to follow repository instructions.

This proves runtime skill discovery/use for this real local downstream Codex
exec smoke. It does not prove hook trust, production readiness, or that every
future Codex surface will discover the skill without repo instructions.

## Stderr Diagnostics

- Stderr captured: yes, via `.local/.../stderr.raw.log`.
- Committed stderr: `stderr.redacted.txt`.
- Skill-load/frontmatter errors in stderr: no.
- Hooks parse errors in stderr: no.
- Codex exec errors in stderr: no.
- Raw stderr committed: no.

## Required Questions

- Did Codex report skill-load/frontmatter errors in stderr? No.
- Did Codex report hooks parse errors in stderr? No.
- Did Codex read runtime `SKILL.md` without explicit prompt instruction? Yes.
- Did Codex read workflow reference without explicit prompt instruction? Yes.
- Did Codex use `./.krn/bin/krn`? Yes.
- Did Codex run status/start/graph/context? Yes.
- Did Codex read task contract/context before edit? Yes.
- Did Codex run verify/handoff? Yes.
- Did Codex edit only allowed files? Yes; target diffstat shows only
  `docs/overview.md`.
- Was automatic skill discovery proven, disproven, or still unclear? Proven for
  this local downstream smoke.

## KRN Adherence

- Read runtime skill: yes.
- Read workflow reference: yes.
- Used pinned KRN: yes.
- Ran status/start/graph/context: yes.
- Read task contract/context package before edit: yes.
- STOP respected: yes, context reported `STOP: false`.
- Ran verify: yes, `./.krn/bin/krn verify --execute`.
- Verify outcome: pass, profile `unit`, command `node src/index.test.ts`.
- Ran handoff: yes, `./.krn/bin/krn handoff`.

## Observed Commands

Codex executed 24 command events. Key workflow commands included:

- `sed -n ... .agents/skills/krn-harness/SKILL.md`
- `sed -n ... .agents/skills/krn-harness/references/workflow.md`
- `./.krn/bin/krn status`
- `./.krn/bin/krn start "...full intent..."`
- `./.krn/bin/krn context`
- `./.krn/bin/krn graph`
- `sed -n ... .krn/current/task-contract.md`
- `sed -n ... .krn/current/context-package.md`
- `./.krn/bin/krn verify --execute`
- `./.krn/bin/krn handoff`

One optional context read failed because `docs/architecture/architecture-spec-v0.1.md`
does not exist in the disposable downstream fixture. The run continued correctly
and verification passed.

## Changed Target Files

- `docs/overview.md`

## Remaining Limits

- Hook trust remains unproven; no real non-bypass Codex `hook.received` evidence
  was produced.
- Production proof remains false.
- This is one disposable fixture run, not a broad guarantee across all Codex
  surfaces or target repositories.

## Product Decision

Keep downstream `AGENTS.md` routing to the installed runtime skill. This smoke
supports the current product surface: repo instructions plus `.agents/skills`
let Codex discover and use the KRN runtime workflow without prompt-level
`SKILL.md` instructions.
