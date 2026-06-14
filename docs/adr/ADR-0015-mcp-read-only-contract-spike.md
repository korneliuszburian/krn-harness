# ADR-0015: MCP Read-Only Contract Spike

## Status

Accepted as P1 contract. No MCP server is implemented.

## Context

MCP could expose KRN artifacts to tools, but it also opens a large trust boundary. Mutation tools, remote exposure, and protected-data access would be premature.

## Decision

P1 may define MCP resources before any server exists.

Allowed read-only resource contracts:

- current task contract;
- context package;
- graph summary;
- verify result;
- handoff;
- operator summary;
- review records;
- dogfood report;
- real-repo readiness report.

Forbidden MCP actions:

- edit files;
- run commands;
- approve memory;
- execute verify;
- launch Codex;
- access network resources;
- expose remote endpoints;
- read `.env` contents, dumps, uploads, production credentials, or client documents.

Any future local MCP prototype must be:

- read-only;
- local-only;
- disabled by default;
- covered by tests;
- documented as not production.

## Consequences

The MCP lane can progress through schema docs and fake adapter tests without creating a risky server.

## Alternatives Considered

- Build an MCP server now: rejected because mutation/security policy is not ready.
- Ignore MCP completely: rejected because resource contracts can clarify future integration safely.

## Revisit When

Revisit after reviewer records and operator summaries are stable enough to justify a local read-only adapter.
