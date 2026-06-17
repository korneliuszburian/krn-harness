# Core Skills Audit

## Skills Audit Table

| Skill | Path | Purpose | Invocation | SKILL.md | references/ | scripts/ | openai.yaml | Risk | Scope | Findings |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| buduj | `.agents/skills/buduj` | Build workflow | `$buduj` | present | none | none | present | low | P0 | Clean enough; no negative trigger in description. |
| kanon | `.agents/skills/kanon` | Research to canon | `$kanon` | present | none | none | present | low | P0 | Clean enough; no negative trigger in description. |
| pilnuj | `.agents/skills/pilnuj` | Scope guardian | `$pilnuj` | present | none | none | present | low | P0 | Clean enough; no negative trigger in description. |
| wycinek | `.agents/skills/wycinek` | Small slice | `$wycinek` | present | none | none | present | low | P0 | Clean enough; no negative trigger in description. |
| handoff | `.agents/skills/handoff` | Review handoff | `$handoff` | present | none | none | present | low | P0 | Clean enough; no negative trigger in description. |
| grill-with-docs | `.agents/skills/grill-with-docs` | Plan grilling | `$grill-with-docs` | present | none | none | present | high | external inspiration | Not KRN-clean; asks for missing reference files and non-KRN `CONTEXT.md`/ADR formats. Protected in this goal. |
| review | `.agents/skills/review` | Evidence audit | `$review` | present | none | none | present | low | P0 | Added by this goal through `$skill-creator`; checks task alignment, evidence, protected paths, proof claims, scope, target merge, and staged runtime artifacts. |

## Per-skill notes

`grill-with-docs` is useful as inspiration but not a clean KRN P0 skill. It refers to `CONTEXT-FORMAT.md` and `ADR-FORMAT.md` that do not exist in the skill folder, and its domain glossary workflow does not match KRN Harness docs.

`review` closes the most important missing workflow gap: before this goal, the repo had handoff guidance but no dedicated evidence-audit skill.

## Gaps identified

1. `SKILL-GAP-001`: No dedicated `$review` skill existed before this goal. Status: fixed by `.agents/skills/review`.
2. `SKILL-GAP-002`: Required P0 skill descriptions mostly lack an explicit negative scope in the trigger sentence. Status: deferred; low risk because body constraints already limit scope.
3. `SKILL-GAP-003`: `grill-with-docs` is not KRN-clean and references missing support docs. Status: deferred because the path is protected and the goal only pilots it.
4. `SKILL-GAP-004`: Skill support claims must stay evidence-bound. Current evidence:
   - Does Codex load `.agents/skills`? `VERIFIED` from current Codex manual and active repo skill discovery.
   - Does Codex support `references/`? `VERIFIED` from current Codex manual.
   - Does Codex support `scripts/`? `VERIFIED` from current Codex manual.
   - Does Codex support `agents/openai.yaml`? `VERIFIED` from current Codex manual and repo files.
   - Does Codex support `allow_implicit_invocation`? `VERIFIED` from current Codex manual.
   - Does Codex expose `$skill-name` explicit invocation? `VERIFIED` from current Codex manual and this session’s explicit skill use.
   - Does Codex have `$skill-creator` available? `VERIFIED` from current manual and local system skill path `/home/krn/.codex/skills/.system/skill-creator/SKILL.md`.

These statuses are documentation/local-file verification only. They are not behavioral proof that this running Codex session loaded or implicitly invoked the new `$review` skill.

Evidence sources: `/tmp/openai-docs-cache/codex-manual.md` lines 6630-6768, `.agents/skills/*/SKILL.md`, `.agents/skills/*/agents/openai.yaml`, `docs/specs/build-time-skills.md`, and `docs/adr/ADR-0010-skills-created-through-skill-creator.md`.
