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
- Package conventions: package/root nodes plus deterministic source, test, doc, and config ownership edges from path layout.
- Package scripts: `package.json` nodes and declared npm script relations.
- Composer scripts/type: `composer.json` nodes, Composer type, and declared Composer script relations.
- CSS class relations: stylesheet class definitions, markup class uses, and file-to-file style relations when a class use matches a definition.
- Tiny WordPress/ACF fixtures: ACF group/field relations and fixture-level WordPress site relations for `acf-json/`, `theme/`, and Composer files.

## Context Package Use

Context package construction may consume graph-lite output through generic relation selectors:

- `style-related-to` edges promote matching markup and stylesheet files to `must-read`.
- `owns-source` edges promote matching package-owned source files to `must-read`.
- `owns-test` and `owns-config` edges promote matching package-owned tests/config files to `should-read`.
- `tests-source` edges may promote a paired test to stronger `should-read` evidence when its source is already selected.
- `owns-doc` edges promote matching package-owned docs to `reference-only`, or `do-not-use` when the doc node is deprecated.
- Matching ACF group nodes promote their JSON evidence paths to `must-read`.
- Matching available docs become `reference-only`.
- Matching deprecated docs become `do-not-use`.

Selectors match task terms against graph labels, evidence paths, and package ownership nodes. They must not depend on fixture path prefixes.

Package ownership is path-convention-only in P0. It may derive package roots from `packages/<name>`, `fixtures/repos/<name>`, or a downstream root with `src`, docs, README, or config files. It must not inspect imports, build ASTs, or infer runtime dependencies.

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
