# ADR-0005: Graph-Lite Before AST

## Status

Accepted.

## Context

Full repository intelligence can become expensive and brittle. P0 needs enough structure to support context selection and evidence without a full parser stack.

## Decision

Ship graph-lite interfaces and small detectors before AST, Tree-sitter, callgraph, dataflow, or embeddings.

## Consequences

P0 is easier to validate and avoids hidden parser complexity. Future detectors can attach evidence paths.

## Alternatives Considered

- Full Tree-sitter graph in P0: rejected as scope creep.
- No graph contract: rejected because context selection needs structured evidence.

## Evidence/Source References

- https://arxiv.org/abs/2601.10112
- https://aider.chat/docs/repomap.html

## Revisit When

Revisit after graph-lite fixtures demonstrate missing coverage that lightweight detectors cannot address.
