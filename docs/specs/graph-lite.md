# Graph-Lite

## Purpose

Graph-lite gives KRN Harness low-cost repository intelligence before full AST tooling.

## P0 Interface

- `GraphNode`
- `GraphEdge`
- `GraphLite`
- `GraphDetector`

## P0 Detectors

Filesystem and package-json detectors have thin behavior. Other detector files exist as placeholders only.

## Deferred

Tree-sitter, callgraph, dataflow, semantic embeddings, and production framework detectors are not P0.
