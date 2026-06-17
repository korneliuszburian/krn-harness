# Adoption Friction Register

## Purpose

This register records repeated adoption friction from real target runs. It is a
source-truth input for future KRN work, not approval to add features.

## Frictions

| Friction | Class | Evidence | Status | Next Action |
| --- | --- | --- | --- | --- |
| Target repos should ignore `.krn/` runtime artifacts. | TARGET_HYGIENE | `krn-llm-wiki` PR #78 left `.krn/` untracked in isolated worktrees; PR #79 adds `.krn/` to `.gitignore`. | Open target PR | Recommend `.krn/` ignore in adoption playbook. |
| `--task-spec` paths must be relative. | KRN_TASK_SPEC_ERGONOMICS | Prior PR #78 repeat rejected absolute `/tmp/...` task spec path by design. | Accepted constraint | Document relative path rule. |
| Validation, rollback, no-push, and no-merge boundaries still live partly in task text. | KRN_TASK_SPEC_ERGONOMICS | Second target task spec carried proof boundaries in prose plus local JSON fields. | Deferred | Consider schema only after more target evidence. |
| Config allowlist rejects many target-native commands. | KRN_CONFIG_TEMPLATE | Python targets cannot directly use `python3 -m pytest` or shell scripts; `marketing-intelligence-studio` needed a local `tools/*.py` wrapper. | Friction confirmed | Decide later whether to add a Python quality-gate profile or keep wrappers. |
| Downstream source release-check must stay non-blocking. | KRN_SOURCE_BUG | `marketing-intelligence-studio` run verified while downstream release-check failed on missing KRN source files; run recorded it as non-blocking evidence. | Working as intended | Keep release-check wording explicit. |
| `productionProof` remains false. | REJECTED | Both PR #78 and second target run are local evidence only. | Boundary kept | Do not promote local runs to production proof. |
| Hook trust remains unproven. | REJECTED | Both targets report hook trust unproven; no hook trust investigation occurred. | Boundary kept | Separate explicit hook trust goal only. |
| Existing product-owned `.krn/` directories collide with KRN Harness runtime. | KRN_CONFIG_TEMPLATE | `krn-ai-os` already tracks `.krn/`, so KRN Harness v0.1 fixed runtime storage would write into another product namespace. | Blocker recorded | Treat as later runtime-dir/config inheritance question, not current feature work. |
| Protected-looking do-not-use paths can fail deterministic review. | KRN_SOURCE_BUG | A second-target run failed when `.env` and `.env.*` appeared in structured do-not-use context; reviewer treated them as protected context paths. | Fixed in focused source slice | Review now distinguishes declared task-contract exclusions from active protected context; active or mixed active use still blocks. |
| Full target suite may fail while target-owned quality gate passes. | TARGET_HYGIENE | `marketing-intelligence-studio` full pytest had 3 target failures; `scripts/quality_gate.sh` passed and was the documented fast quality profile. | Accepted | Record authoritative validation command per target. |

## Current Decision

Do not implement feature fixes from this register inside adoption proof goals.
Use it to choose the next focused `/goal`.
