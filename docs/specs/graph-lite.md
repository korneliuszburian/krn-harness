# Graph-Lite

## Purpose

Graph-lite gives KRN Harness low-cost repository intelligence before full AST tooling.

## P0 Interface

- `GraphNode`
- `GraphEdge`
- `GraphLite`
- `GraphDetector`

## P0 Detector v0 Behavior

Graph-lite v0 is a deterministic, shallow detector layer. It emits evidence paths and simple relations only; it is not a broad graph engine.

Included v0 detectors:

- Filesystem: top-level file and directory nodes.
- Docs links/status: Markdown doc nodes, local Markdown links, and deprecated status for explicitly stale/deprecated docs.
- Package scripts: `package.json` nodes and declared npm script relations.
- Composer scripts/type: `composer.json` nodes, Composer type, and declared Composer script relations.
- CSS class relations: stylesheet class definitions, markup class uses, and file-to-file style relations when a class use matches a definition.
- Tiny WordPress/ACF fixtures: ACF group/field relations and fixture-level WordPress site relations for `acf-json/`, `theme/`, and Composer files.

## Context Package Use

Context package construction may consume graph-lite output to promote directly related fixture files into `must-read` context and mark deprecated docs as `do-not-use` context.

## Deferred

Tree-sitter, callgraph, dataflow, semantic embeddings, production WordPress/ACF detectors, and repository-wide semantic graph ranking are not P0.
