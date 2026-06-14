# P1 Entry Contract

## Purpose

P1 starts product surfaces without turning experiments into production systems.

P1 entry is allowed only when the surface reads or summarizes local artifacts, uses explicit safety gates, and names what remains experimental.

## Entry Checklist

- P0 loop evidence is current enough to guide the lane.
- The lane has a written contract or ADR before implementation.
- The lane reads local artifacts first.
- The lane does not touch protected data.
- The lane does not require network access in normal tests.
- The lane does not auto-commit, auto-push, or mutate user repos without explicit approval.
- The lane has a stop rule and a downgrade path to `skipped`, `blocked`, or `readiness`.

## Lanes

| Lane | Entry condition | Stop condition | Initial artifact | Production-forbidden line |
| --- | --- | --- | --- | --- |
| Real-repo workflow | Preflight and report-only dogfood scaffold exist | Protected-data risk, missing approval, preflight blockers, or source checkout target | `scripts/krn-real-repo-preflight.sh`; `scripts/krn-real-repo-dogfood.sh` | No real repo claim without actual safe run |
| Reviewers | Reviewer inputs/outputs are documented and deterministic reviewers read local artifacts only | Reviewer would edit files, call models by default, or inspect protected data | `docs/product/reviewers.md`; `krn review --write` | No autonomous reviewer agent |
| Operator summary | Summary schema reads current local artifacts | Summary needs server/database/UI mutation | `docs/product/operator-console.md`; `krn summary --write` | No dashboard-first product |
| Dashboard-lite | ADR accepts static read-only generated HTML | Requires server, database, auth, external assets, or mutation | future ADR | No hosted dashboard |
| MCP contract | ADR/spec defines read-only resources first | Requires mutation tools or remote exposure | future ADR/spec | No production MCP server |
| Vector/retrieval | Synthetic eval harness exists first | Requires protected corpus, real vector DB dependency, or embeddings dependency without ADR | future ADR/eval | No mandatory vector DB |
| Subagent/reviewer contracts | Reviewer contracts exist first | Parallel uncontrolled edits or autonomous execution | `docs/product/subagent-contracts.md` | No autonomous swarm |
| Knowledge condensation | Review-only proposal workflow exists | Auto-approved memory or unreviewed canon mutation | `docs/product/knowledge-condensation.md` | No auto-approved memory |

## Experiment vs Core

Core P1 work improves operator confidence using existing artifacts.

Experiment work may explore UI, MCP, retrieval, or reviewer interfaces only when it is:

- local-only;
- synthetic or artifact-only;
- disabled by default if it can call models;
- documented as not production.

## Current Hook Status

Hooks are templates, guardrails, and trace points. Real Codex hook loading/trust remains unproven until a non-bypass Codex run emits `hook.received`.
