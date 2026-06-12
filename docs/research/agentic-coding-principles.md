# Agentic Coding Principles for KRN

## Purpose

Keep KRN dogfood aligned with known agentic coding lessons without dumping raw papers into active context.

## Principles

- Real repo tasks need localization, relevant context, edits, and execution feedback.
- Repair loops beat agent fantasy when they are grounded in concrete failures.
- Skills may help only when specialized, discoverable, and compatible with the task context.
- Measure explicit skill usage, implicit skill usage, AGENTS guidance, hooks, and CLI artifacts separately.
- Treat self-report as weak evidence. Prefer files, traces, verify results, handoff artifacts, and touched-file diffs.
- Keep memory governed and reviewable. Do not add hidden self-reflection or auto-approved memory.
- Keep hooks as guardrails and trace points, not a sandbox.
- Keep evals local and deterministic by default. Optional Codex runs must be manually enabled and isolated to temp repos.
- Prefer thin runtime skill guidance plus KRN CLI artifacts over large prompt packs.
- If dogfood shows skills do not help, move critical behavior into AGENTS, hooks, and CLI artifacts.

## KRN Implication

Dogfood v0 should answer whether KRN changes behavior, not whether Codex can claim compliance.
The comparison must separate baseline, agents-only, explicit skill, and implicit skill runs.

## Current Boundary

No production Codex runner, CI dependency, dashboard, MCP server, subagent system, semantic retrieval, embeddings, vector DB, or sandbox is part of this research alignment.
