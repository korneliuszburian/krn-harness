# Codex Exec Downstream Test Runbook

Use this runbook to capture one downstream runtime-skill test through
`codex exec --json` and convert it into a committed sanitized evidence pack.

## Guardrails

- Raw files stay local under `.local/codex-exec-runs/<run-id>/`.
- Confirm `.local/` is ignored locally before running, for example through
  `.git/info/exclude` if the source `.gitignore` is protected.
- Do not include protected customer data in prompts.
- Do not export API keys globally for repo-controlled code.
- Do not use `danger-full-access` unless the runner is isolated and disposable.
- Use `workspace-write` for a real downstream task.
- Use `read-only` for analysis-only runs.
- Fixture packs are not product proof.

## Capture

```bash
mkdir -p .local/codex-exec-runs/<run-id>

codex exec \
  --sandbox workspace-write \
  --json \
  -o .local/codex-exec-runs/<run-id>/final.md \
  "Use the KRN Harness workflow from .agents/skills/krn-harness/SKILL.md.
Read .agents/skills/krn-harness/references/workflow.md because verification clarity and handoff quality matter.
Use ./.krn/bin/krn unless a pinned KRN command path is provided.
Do not edit before:
1. running KRN status;
2. running KRN start with the full user intent;
3. running KRN graph/context;
4. reading .krn/current/task-contract.md;
5. reading .krn/current/context-package.md.

Respect STOP.
After edits, run the configured verify path and create handoff.

Task:
<small real downstream task>" \
  > .local/codex-exec-runs/<run-id>/events.raw.jsonl \
  2> .local/codex-exec-runs/<run-id>/stderr.raw.log
```

## Summarize

Save the prompt and command text locally if you want them in the sanitized pack:

```bash
pnpm tsx scripts/summarize-codex-exec-run.ts \
  --raw-jsonl .local/codex-exec-runs/<run-id>/events.raw.jsonl \
  --final-message .local/codex-exec-runs/<run-id>/final.md \
  --out docs/evidence/codex-exec-runs/<YYYY-MM-DD>-<target>-<slug> \
  --run-id <run-id> \
  --kind real_codex_exec \
  --target-repo <target-repo> \
  --target-commit <target-sha-or-unknown> \
  --krn-source-commit $(git rev-parse HEAD) \
  --prompt .local/codex-exec-runs/<run-id>/prompt.txt \
  --command .local/codex-exec-runs/<run-id>/command.txt \
  --stderr .local/codex-exec-runs/<run-id>/stderr.raw.log \
  --sandbox workspace-write
```

The summarizer must fail rather than write committed evidence if raw JSONL
or raw stderr mentions `.env`, auth files, or obvious secret values.

## Review

Before staging, inspect:

```bash
git status --short
git diff -- docs/evidence/codex-exec-runs/<YYYY-MM-DD>-<target>-<slug>
git diff --check
```

Stage only the sanitized pack. Never stage `.local`, raw JSONL, raw diffs, auth
files, raw stderr, `.env` files, or target protected data.
