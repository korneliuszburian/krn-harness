---
name: kanon
description: KRN Harness research-to-canon workflow. Use when working on research-baseline docs, architecture specs, ADRs, security docs, memory/context/eval methodology, or any update to active project truth.
---

# Kanon

## Invocation

Use explicitly as `$kanon` when changing active KRN canon, specs, ADRs,
security docs, or research-backed architecture.

Expected output: concise active-truth docs with sources, tradeoffs, uncertainty,
and whether an ADR follow-up is needed.

Use this when turning research, external docs, prior discussion, or architectural reasoning into durable KRN Harness canon.

## Scope

Job: convert evidence into concise active project truth.

Use when:
- updating specs, ADRs, security docs, research-backed architecture, or canon;
- deciding what raw research, audit prose, or prior discussion means for KRN.

Do not use when:
- the work is pure implementation without a canon/spec/ADR decision;
- the user wants raw research collection only;
- the change would dump unfiltered notes into active docs.

Stop when evidence is missing, the decision needs an ADR but none is owned, or
the proposed truth would expand beyond documented P0/P1 scope.

## Workflow

1. Separate raw research from active truth.
2. Distill sources into decisions, tradeoffs, risks, and open questions.
3. Cite official docs, research evidence, established methodology, or ADR rationale for major decisions.
4. Mark uncertainty directly when evidence is incomplete.
5. Keep canon short and decision-oriented.
6. Record superseding or deprecation when a newer decision replaces an older one.
7. Keep all documentation aligned with P0 scope and non-goals.

## Active Truth Rules

- Research notes are not active truth until distilled into canon, spec, or ADR.
- Do not dump raw excerpts into active docs.
- Prefer concise architecture docs over long notebooks.
- Use ADRs for consequential architecture commitments.
- Use specs for contracts, schemas, templates, and operator-facing behavior.

## Output

End with the documents changed, evidence references used, unresolved uncertainty, and whether an ADR follow-up is required.
