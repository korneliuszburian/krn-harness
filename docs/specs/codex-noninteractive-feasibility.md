# Codex Non-Interactive Feasibility

## Purpose

This note records local feasibility evidence for future KRN Harness Codex non-interactive work. It does not implement a Codex runner.

## Local Evidence

Checked on 2026-06-11 in this checkout:

- `command -v codex` returned `/home/krn/.nvm/versions/node/v25.7.0/bin/codex`.
- `codex --help` listed `exec` as "Run Codex non-interactively".
- `codex --help` listed `review` as "Run a code review non-interactively".
- `codex --help` exposed `--cd`, `--sandbox`, `--ask-for-approval`, `--profile`, `--model`, `--search`, and hook trust flags.

## P0 Decision

KRN Harness P0 may document the available Codex CLI surface, but it must not claim a working non-interactive eval runner.

No P0 code should:

- launch Codex non-interactively as part of `krn eval`;
- depend on Codex auth or network access;
- mutate repositories through Codex during evals;
- treat Codex hooks as a sandbox;
- add CI dependence on Codex non-interactive mode.

## Safe Next Slice

A future P1/P2 slice can add a dry-run wrapper only after an ADR defines auth, sandbox, timeout, trace, and mutation policy.
