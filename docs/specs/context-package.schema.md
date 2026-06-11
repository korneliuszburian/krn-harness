# Context Package Schema

## Purpose

The context package identifies the smallest high-value context Codex should read before editing.

## Fields

- `taskId`: optional task contract id.
- `items`: ranked context entries with `path`, `reason`, `priority`, `bucket`, and `status`.
  Optional explainability fields:
  - `source`: `base`, `graph`, or `task-policy`
  - `selector`: shallow selector name such as `style-related-to`, `acf-group`, or `missing-context-policy`
  - `matchedTerms`: task terms matched by the selector
  - `relationKind`: graph edge relation kind when relevant
  - `sourceNode`: graph source node id when relevant
  - `targetNode`: graph target node id when relevant
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
