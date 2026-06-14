# ADR-0016: Retrieval And Vector Experiment Harness

## Status

Accepted as P1 experiment contract. No vector database or embeddings dependency is added.

## Context

Context quality may eventually need retrieval experiments, but production vector dependencies would undermine P0's deterministic graph-lite model and introduce protected-data risk.

## Decision

P1 retrieval work starts as a synthetic experiment harness only.

Allowed:

- synthetic corpus;
- lexical baseline first;
- optional in-memory fake vector scorer;
- pluggable scorer interface without runtime dependency;
- metrics for precision@k, recall@k, do-not-use exclusion, stale-doc avoidance, context budget, and answerability;
- tests that compare retrieval choices against known fixture expectations.

Forbidden:

- production vector DB dependency;
- embeddings dependency without a later ADR;
- protected repo corpus;
- real client documents;
- automatic memory approval;
- replacement of graph-lite as current source of truth.

## Consequences

Retrieval can be measured before it becomes architecture.

Synthetic wins do not prove production repo behavior.

## Alternatives Considered

- Add a vector database now: rejected because P1 needs measurements first.
- Use semantic embeddings in normal tests: rejected because local validation must remain deterministic and no-network.
- Keep only graph-lite forever: rejected as premature because noisy repo context quality remains a known risk.

## Revisit When

Revisit after a synthetic retrieval benchmark shows a clear improvement over lexical and graph-lite baselines without increasing stale-doc leakage.
