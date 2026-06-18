# Adoption Friction Register

## Purpose

This register records repeated adoption friction from real target runs. It is a
source-truth input for future KRN work, not approval to add features.

## Frictions

| Friction | Class | Evidence | Status | Next Action |
| --- | --- | --- | --- | --- |
| Target repos should ignore `.krn/` runtime artifacts. | TARGET_HYGIENE | `krn-llm-wiki` PR #78 left `.krn/` untracked in isolated worktrees; PR #79 adds `.krn/` to `.gitignore`. | Open target PR | Recommend `.krn/` ignore in adoption playbook. |
| `--task-spec` paths must be relative. | KRN_TASK_SPEC_ERGONOMICS | Prior PR #78 repeat rejected absolute `/tmp/...` task spec path by design. | Accepted constraint | Document relative path rule. |
| Validation, rollback, no-push, no-merge, target approval, approval-reference, and protected-data exclusion boundaries still live partly in task text. | KRN_TASK_SPEC_ERGONOMICS | Second target task spec carried proof boundaries in prose plus local JSON fields. | Partly fixed | Stage 6 added a declarative task-spec carrier for target validation and core safety boundaries; keep automation out of scope. |
| Config allowlist rejects many target-native commands. | KRN_CONFIG_TEMPLATE | Python targets cannot directly use `python3 -m pytest` or shell scripts; `marketing-intelligence-studio` needed a local `tools/*.py` wrapper. | Accepted with limits | Use Target Validation Contract v0 in the adoption playbook. Wrappers are temporary adapters only when authority, coverage, limitations, and unsafe conditions are explicit. |
| Downstream source release-check must stay non-blocking. | KRN_SOURCE_BUG | `marketing-intelligence-studio` run verified while downstream release-check failed on missing KRN source files; run recorded it as non-blocking evidence. | Working as intended | Keep release-check wording explicit. |
| `productionProof` remains false. | REJECTED | Both PR #78 and second target run are local evidence only. | Boundary kept | Do not promote local runs to production proof. |
| Hook trust remains unproven. | REJECTED | Both targets report hook trust unproven; no hook trust investigation occurred. | Boundary kept | Separate explicit hook trust goal only. |
| Existing product-owned `.krn/` directories collide with KRN Harness runtime. | KRN_CONFIG_TEMPLATE | `krn-ai-os` already tracks `.krn/`, so fixed runtime storage would write into another product namespace. | Fixed in focused source slice | Use `runtime.dir` such as `.krn-harness`; default `.krn` still blocks if tracked. |
| Protected-looking do-not-use paths can fail deterministic review. | KRN_SOURCE_BUG | A second-target run failed when `.env` and `.env.*` appeared in structured do-not-use context; reviewer treated them as protected context paths. | Fixed in focused source slice | Review now distinguishes declared task-contract exclusions from active protected context; active or mixed active use still blocks. |
| Full target suite may fail while target-owned quality gate passes. | TARGET_HYGIENE | `marketing-intelligence-studio` full pytest had 3 target failures; `scripts/quality_gate.sh` passed and was the documented fast quality profile. | Accepted with limits | Record `targetValidation.coverage: fast-quality-gate`; do not imply full-suite proof when only the fast gate passed. |
| Verify/profile-only tasks can over-select raw or governance docs. | KRN_CONTEXT_SELECTION | `krn-llm-wiki` readonly/profile work named `raw/` and wiki governance paths as do-not-use boundaries; `packages/context/src/context-stop-policy.test.ts` keeps README/config/checker context while excluding raw/wiki governance doc noise and stale-doc leakage. | Guarded by regression | Do not add selector/ranking behavior without a new real target finding; graph-lite stays shallow deterministic evidence. |

## Current Decision

Do not implement feature fixes from this register inside adoption proof goals.
Use it to choose the next focused `/goal`.

Target Validation Contract v0 in `docs/product/target-adoption-playbook.md` is
now carried by `boundaries.targetValidation` in task specs when adoption proof
needs structured validation authority, coverage, wrapper limits, and
full-suite-vs-fast-gate wording. It is not a verify allowlist expansion, shell
mode, target mutation approval, production proof, hook-trust proof, auto
rollback, push, or merge automation.

Context-noise fixes must stay evidence-led. Current source already has
regressions for stale-doc leakage, context-poisoning suspect docs, raw/wiki
do-not-use boundaries, and product-code source/test localization. Do not add
embeddings, vector retrieval, AST/callgraph/dataflow, Tree-sitter ranking, or
semantic scoring to address context noise without a new ADR-backed target
finding.
