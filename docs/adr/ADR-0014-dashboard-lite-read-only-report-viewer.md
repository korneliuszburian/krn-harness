# ADR-0014: Dashboard-Lite Read-Only Report Viewer

## Status

Accepted as P1 contract. Implementation is deferred until artifact schemas stabilize.

## Context

Operators need faster ways to inspect local KRN artifacts, but a dashboard can easily become a second source of truth or a hosted product surface.

P0 explicitly forbids dashboard work. `GOAL.md` allows controlled P1 entry only as a read-only local artifact viewer.

## Decision

Dashboard-lite may exist only as a generated local static HTML report viewer.

It must:

- read an explicit summary JSON or sanitized local artifact bundle;
- generate one local HTML file;
- use no server, database, auth, framework, or external assets;
- perform no mutation;
- make source artifacts the source of truth;
- show empty, missing, danger, skipped, blocked, and readiness states honestly;
- include no protected data, `.env` contents, dumps, uploads, or client documents;
- include tests proving no external scripts and no server startup.

The first useful views are:

- Overview;
- Current task;
- Runs;
- Run detail;
- Context;
- Verify;
- Handoff;
- Reviewers;
- Dogfood;
- Real-repo readiness;
- Risks.

## Consequences

Dashboard-lite is a projection of artifacts, not a product authority.

No hosted dashboard, long-lived local server, client app, or dashboard-first architecture is accepted by this ADR.

## Alternatives Considered

- Build a real dashboard now: rejected because P1 needs evidence projection first.
- Keep all UI deferred forever: rejected because read-only local review may improve operator usefulness safely.

## Revisit When

Revisit after `krn summary` or equivalent summary JSON is stable enough to feed a generated static report.
