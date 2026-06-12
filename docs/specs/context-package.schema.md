# Context Package Schema

## Purpose

The context package identifies the smallest high-value context Codex should read before editing.

## Fields

- `taskId`: optional task contract id.
- `items`: ranked context entries with `path`, `reason`, `priority`, `bucket`, and `status`.
  Optional explainability fields:
  - `source`: `base`, `graph`, `memory`, or `task-policy`
  - `selector`: shallow selector name such as `style-related-to`, `acf-group`, `package-owned-source`, `package-owned-test`, `package-owned-config`, `package-owned-doc`, `package-owned-deprecated-doc`, `approved-memory-task-match`, `approved-memory-explicit`, or `missing-context-policy`
  - `matchedTerms`: task terms matched by the selector
  - `relationKind`: graph edge relation kind when relevant
  - `sourceNode`: graph source node id when relevant
  - `targetNode`: graph target node id when relevant
  - `memoryId`: approved memory id when `source` is `memory`
  - `memorySummary`: approved memory summary when `source` is `memory`
  - `approvedAt`: approval timestamp when `source` is `memory`
  - `evidencePath`: source evidence path when `source` is `memory`
- `buckets`: named context buckets:
  - `mustRead`
  - `shouldRead`
  - `referenceOnly`
  - `doNotUse`
  - `missingContext`
- `coverage`: P0 scoring placeholders for required/present/missing counts, confidence, and over-inclusion risk.
- `stop`: whether edits must stop.
- `stopReason`: optional STOP explanation.

## P0 Behavior

P0 writes `.krn/current/context-package.md` and `.krn/current/context-package.json`.

Graph selector matching is shallow and deterministic. Generic terms such as `section` are treated as too broad for graph promotion. P0 does not normalize Polish morphology or perform semantic search.

Package-owned graph selectors use deterministic graph-lite ownership edges. Matching package-owned source files become `must-read`, package-owned tests and config files become `should-read`, package-owned available docs become `reference-only`, and package-owned deprecated docs become `do-not-use`. This is path-convention-only and must not become AST, import graph, Tree-sitter, embeddings, or semantic retrieval in P0.

Approved memory may appear only in `referenceOnly` context. It is selected only when the task explicitly asks for memory or the approved memory summary/evidence path matches at least two non-broad task terms. Explicit opt-out phrases such as `without approved memory`, `no memory`, `do not use prior decisions`, `bez pamięci`, `nie używaj pamięci`, `nie używaj poprzednich decyzji`, or `bez wcześniejszych ustaleń` suppress memory context even when terms match. Pending and deprecated memory must not appear in context.

Polish explicit memory requests are intentionally narrow in P0: `użyj zatwierdzonej pamięci` and `skorzystaj z zatwierdzonej pamięci` may request approved memory, unless an opt-out phrase is also present.

P0 memory matching is deterministic string matching only. It is not semantic retrieval.
