# Research-Backed Architecture Doctrine

## Purpose

This document records why KRN Harness is built as a deterministic local control layer before dashboard, MCP, vector retrieval, or autonomous subagents.

It is architecture doctrine, not a literature review.

## Doctrine

## Agent-Computer Interface Over Agent Hype

KRN should improve the interface between Codex and a repository: task contracts, context packages, graph hints, hooks, traces, verification, review records, and summaries.

The product bet is that better local interfaces and artifacts improve agent work before autonomy does.

## Workflow First, Autonomy Later

KRN should prefer deterministic workflows where the path is known: contract, context, graph, hooks, trace, verify, governed memory.

Autonomous planning belongs behind evidence gates, not in P1.

## Context Is Compiled, Not Dumped

KRN should compile context into ranked packages with STOP states and do-not-use boundaries.

Long context alone is not a strategy. Relevant evidence can be missed, especially when buried.

## Reviewers Before Subagents

KRN reviewers are deterministic artifact evaluators.

They are the safe first subagent-like role because they do not edit, execute commands, call models, approve memory, commit, or push.

## Governed Memory, Never Auto-Truth

Memory is proposed, approved, deprecated, and compacted under explicit governance.

No research note or agent self-report becomes active truth automatically.

## Retrieval Eval Before Vector DB

KRN should not add vector dependencies until a synthetic retrieval eval can prove context relevance, faithfulness, and failure modes.

## Dashboard Renders Artifacts

Dashboard-lite should render `operator-summary.json`.

It must not become a second source of truth, a hosted service, or a dashboard-first product.

## MCP Read-Only Resources First

MCP should expose existing local artifacts as read-only resources before any tools or server-side actions exist.

## Security By Architecture, Not Prompt

KRN must separate instructions, data, trusted artifacts, hooks, protected paths, and memory states structurally.

Prompt warnings alone are not a security boundary.

## Source Table

| Source | URL | Source Lesson | KRN Decision | Implementation Surface | Risk If Ignored |
| --- | --- | --- | --- | --- | --- |
| Anthropic, Building Effective Agents | https://www.anthropic.com/research/building-effective-agents | Start with simple building blocks and workflows before increasing agent autonomy. | P1 summary/review remains deterministic. | `krn summary`, `krn review` | Premature autonomous framework. |
| SWE-agent / Agent-Computer Interface | https://arxiv.org/abs/2405.15793 | Agent performance depends on interface design, not only model capability. | Build KRN as Codex-first repository interface. | task contract, graph, context, verify, trace | Prompt-pack product with weak runtime leverage. |
| SWE-bench | https://arxiv.org/abs/2310.06770 | Repo-level coding tasks need real issue context and test execution. | Verification and dogfood must be artifact-based. | `krn verify`, dogfood reports | Self-report mistaken for engineering proof. |
| Agentless | https://arxiv.org/abs/2407.01489 | Simpler localization/repair/validation baselines can compete with complex agents. | Keep P1 reviewers deterministic before subagents. | reviewer records | Complexity without measurable gain. |
| OpenHands | https://github.com/OpenHands/openhands | Real coding agents need explicit execution environments and scale boundaries. | Do not build generic multi-agent runtime in P1. | P0/P1 non-goals | Product becomes generic agent framework. |
| Lost in the Middle | https://arxiv.org/abs/2307.03172 | Long-context models do not reliably use all positions equally. | Rank and summarize context instead of dumping. | context package, STOP policy | Important evidence buried in large context. |
| RAGAS | https://arxiv.org/abs/2309.15217 | RAG evaluation needs metrics for retrieval relevance and faithfulness. | Evaluate retrieval before vector DB. | ADR-0016, future eval harness | Unmeasured retrieval quality. |
| ARES | https://arxiv.org/abs/2311.09476 | RAG systems can be evaluated component-by-component with relevance and faithfulness signals. | Future retrieval eval should isolate components. | future synthetic retrieval eval | Vector layer cannot be debugged. |
| Self-RAG | https://arxiv.org/abs/2310.11511 | Retrieval should be adaptive; unnecessary retrieval can hurt outputs. | Context package should stay task-sensitive. | context ranking | Always-retrieve behavior increases noise. |
| MemGPT | https://arxiv.org/abs/2310.08560 | Memory needs tiering and control-flow management, not unbounded prompt stuffing. | Governed memory is explicit state. | `.krn/memory/*.json` | Memory poisoning and stale assumptions. |
| Generative Agents | https://arxiv.org/abs/2304.03442 | Reflection and memory can support agent behavior, but require architecture. | Condensation is workflow-governed, not auto-truth. | knowledge condensation docs | Reflection becomes unreviewed truth. |
| Voyager | https://arxiv.org/abs/2305.16291 | Skill libraries compound agent ability through executable feedback loops. | Runtime skill templates must stay scoped and verified. | codex adapter templates | Skill sprawl without verification. |
| OWASP GenAI Top 10 | https://genai.owasp.org/llm-top-10/ | Prompt injection, poisoning, supply chain, and excessive agency are first-class risks. | P1 forbids protected data, autonomous agents, and unchecked tools. | safety reviewer, hook guardrails | Security delegated to prompts. |
| NIST AI RMF / GenAI Profile | https://www.nist.gov/itl/ai-risk-management-framework | GenAI risk management needs governance, measurement, and traceable controls. | KRN writes auditable local artifacts. | trace, verify, summary, memory | No risk-management evidence. |
| NCSC Prompt Injection Guidance | https://www.ncsc.gov.uk/blog-post/prompt-injection-is-not-sql-injection | Current LLMs do not enforce a security boundary between instructions and data. | Treat repo text as untrusted unless promoted by artifact policy. | context package, do-not-use, hooks | Context poisoning treated as solvable by prompt. |
| Model Context Protocol Docs | https://modelcontextprotocol.io/docs/getting-started/intro | MCP connects AI applications to external systems through structured capabilities. | Start with read-only resources over stable artifacts. | ADR-0015 | MCP server becomes action surface too early. |
| OpenAI Codex Skills Docs | https://developers.openai.com/codex/skills | Skills package workflow instructions and optional assets/scripts. | Build-time skills and runtime skill templates stay separate. | `.agents/skills`, codex adapter templates | Skill layers become confused. |

## Implementation Consequences

- `krn summary` is the stable artifact for operator intelligence.
- `krn review` is the first deterministic reviewer layer.
- Dashboard-lite must consume `operator-summary.json`.
- MCP must expose read-only artifacts first.
- Retrieval must wait for eval fixtures.
- Subagents must wait for reviewer usefulness evidence.

## Non-Claims

- KRN does not claim production readiness.
- KRN does not claim real user-repo validation.
- KRN does not claim real hook loading/trust until non-bypass hook evidence exists.
- KRN does not claim vector retrieval quality.
- KRN does not claim autonomous reviewer or agent behavior.
