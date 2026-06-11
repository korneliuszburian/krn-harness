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

Context package construction may consume graph-lite output through generic relation selectors:

- `style-related-to` edges promote matching markup and stylesheet files to `must-read`.
- Matching ACF group nodes promote their JSON evidence paths to `must-read`.
- Matching available docs become `reference-only`.
- Matching deprecated docs become `do-not-use`.

Selectors match task terms against graph labels and evidence paths. They must not depend on fixture path prefixes.

## P0 CLI Artifact

`krn graph` builds graph-lite for the current repository and writes:

- `.krn/graph/repo-graph.json`
- `.krn/graph/repo-graph.md`

The JSON artifact is deterministic for a fixed repository and timestamp:

- `schemaVersion`
- `generatedAt`
- `nodeCount`
- `edgeCount`
- `detectors`
- `relationKindCounts`
- `nodeKindCounts`
- `statusCounts`
- `nodes`
- `edges`

Status counts use `unknown` for graph nodes without an explicit status. Count keys are sorted alphabetically.

The Markdown artifact contains Summary, Detectors, Node Kinds, Relation Kinds, Deprecated Docs, Evidence Examples, and P0 Limits sections.

## Deferred

Tree-sitter, callgraph, dataflow, semantic embeddings, production WordPress/ACF detectors, and repository-wide semantic graph ranking are not P0.
