# Codex Exec Evidence Pack

## Purpose

`codex exec --json` can produce useful downstream KRN workflow evidence, but
raw JSONL is not safe as a committed artifact. It may contain prompts, command
output, paths, diffs, or sensitive target data.

The evidence pack is the committed, sanitized projection of one Codex exec run.
It is local evidence only. It is not production proof, hook trust proof, CI
evidence, or a claim that Codex followed project hooks.

## Committed Layout

Committed packs live under:

```txt
docs/evidence/codex-exec-runs/<YYYY-MM-DD>-<target>-<slug>/
```

Each pack must contain:

```txt
README.md
prompt.redacted.md
command.redacted.txt
final-message.md
metrics.json
events.redacted.jsonl
command-events.json
file-events.json
krn-adherence.json
krn-artifacts.md
diffstat.txt
verdict.md
```

Packs that capture Codex stderr may also contain:

```txt
stderr.redacted.txt
```

Raw/local-only files stay outside committed evidence:

```txt
.local/codex-exec-runs/<run-id>/events.raw.jsonl
.local/codex-exec-runs/<run-id>/stderr.raw.log
.local/codex-exec-runs/<run-id>/final.md
.local/codex-exec-runs/<run-id>/patch.diff
```

Do not commit raw Codex JSONL, raw target diffs, full stdout/stderr, secrets,
auth files, `.env` content, or protected customer data.

## Evidence Kinds

- `real_codex_exec`: an actual `codex exec --json` run.
- `fixture_codex_exec`: synthetic JSONL used to test parser and pack shape.
- `manual_import`: operator-imported Codex output captured elsewhere.

Fixture and manual-import packs must never be represented as real Codex product
proof.

## Metrics Contract

`metrics.json` must validate against
`docs/specs/codex-exec-metrics.schema.json`. The required schema id is
`krn-codex-exec-metrics-v1`.

The metrics record:

- run identity, evidence kind, target repo, target commit, and KRN source commit;
- Codex mode, sandbox, status, duration, event counts, and token usage;
- command totals, KRN command totals, verify totals, and failed/blocked totals;
- deterministic KRN workflow adherence fields;
- optional stderr diagnostics for skill-load, hooks-parse, frontmatter, and
  Codex exec errors;
- proof boundaries with `production_proof: false`,
  `raw_jsonl_committed: false`, and `sanitized: true`.

## Adherence Rules

Adherence is derived from command events, safe file-read/file-change events, and
the final message only as secondary evidence.

The parser must prefer `null` over overclaiming. A prompt mention alone does not
prove runtime-skill use. Global `krn` does not satisfy `used_pinned_krn`; that
requires `./.krn/bin/krn` or an explicit pinned path. A full-intent
`krn start` requires a meaningful task string, not a slug. STOP respect is true
only when no STOP appears in evidence or the final/artifacts explicitly state
that STOP was checked and not active.

## Tooling

Use:

```bash
pnpm tsx scripts/summarize-codex-exec-run.ts ...
```

The summarizer parses JSONL line by line, fails malformed non-empty lines,
redacts sensitive text, writes only sanitized pack files, and fails closed when
raw JSONL or raw stderr appears to contain `.env`, auth files, or obvious secret
values.

When `--stderr` is provided, the committed `stderr.redacted.txt` keeps only
diagnostic lines such as skill loading, frontmatter, hooks config, parse errors,
warnings, and Codex exec errors. Large progress/noise output stays out of the
committed pack.
