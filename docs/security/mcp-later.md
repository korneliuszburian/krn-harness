# MCP Later

## Decision

KRN Harness does not ship an MCP server in P0.

## Rationale

MCP is valuable for tools and external context, but it introduces authentication, tool policy, authorization, and data-sharing concerns. P0 focuses on local CLI/runtime contracts first.

## Evidence

- https://developers.openai.com/codex/mcp
- https://modelcontextprotocol.io/specification/2025-06-18/server/tools
- https://modelcontextprotocol.io/docs/tutorials/security/authorization
