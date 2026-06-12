# WordPress/ACF Detector

## Status

Deferred.

## P0 Role

P0 includes synthetic WordPress/ACF-style fixtures for dogfood evidence.

Graph-lite may detect only shallow path conventions in those fixtures:

- `acf/` and `acf-json/` JSON field groups;
- `src/theme/` and `theme/` files;
- Markdown docs marked stale/deprecated;
- package-owned source, tests, docs, and config.

This is fixture evidence, not production WordPress/ACF detection.

No PHP parsing, WordPress runtime inspection, Composer install, AST, Tree-sitter, callgraph, semantic retrieval, embeddings, browser automation, or external service is implemented.

## Revisit When

Revisit after graph-lite contracts, evidence format, and detector acceptance tests are stable.
