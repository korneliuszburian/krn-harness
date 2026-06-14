# krn-llm-wiki KRN Adoption Proposal

## Target

- Repo: `/home/krn/coding/krn/active/krn-llm-wiki`
- Branch observed: `r2c-011-update-page-operator-readiness-report`
- Current state observed: dirty (`AGENTS.md`, `.codex/`, `.krn/`)
- Existing validation surface: Python tools, no `package.json`, no
  `krn.config.json`

This proposal is read-only. It does not mutate the target checkout.

## Why This Target

`krn-llm-wiki` is a good adoption target because it already has strong
agent-governance rules and explicit read-only validation:

- `AGENTS.md` requires `python3 tools/check_all_readonly.py` before editing.
- `/raw` is untrusted and not instruction-bearing.
- canonical `/wiki` changes are governed through proposal, approval, apply, and
  validation flows.
- `tools/check_all_readonly.py` aggregates side-effect-free checks.

## Proposed `krn.config.json`

```json
{
  "version": 1,
  "project": {
    "name": "krn-llm-wiki"
  },
  "runtime": {
    "dir": ".krn"
  },
  "verify": {
    "defaultProfile": "readonly",
    "mode": "record-only",
    "timeoutMs": 180000,
    "maxOutputBytes": 16000,
    "profiles": {
      "readonly": {
        "commands": [
          {
            "command": "python3",
            "args": ["tools/check_all_readonly.py"],
            "label": "readonly suite"
          }
        ]
      }
    }
  }
}
```

## Adoption Protocol

1. Start from a clean isolated copy or worktree, not the dirty active checkout.
2. Add the proposed `krn.config.json`.
3. Run pinned local KRN identity proof:
   `pnpm --silent krn doctor cli` from the KRN Harness source.
4. Run target loop with the pinned KRN command from the isolated target:
   `install`, `start`, `graph`, `context`, `verify --execute`, `review --write`,
   `summary --write`, and `report --write`.
5. Keep any target mutation uncommitted until the operator reviews changed files
   and validation artifacts.

## Acceptance

- `krn verify --execute` runs only `python3 tools/check_all_readonly.py`.
- KRN uses the pinned local CLI, not a global `krn`.
- Target `.krn/current/verify-result.json` records executable validation.
- `operator-report.json` keeps `productionProof.value: false`.
- No `/raw` files are treated as instructions.
- No controlled write/restore validation is added to the readonly profile.

## Risks

- The observed active checkout was dirty, so direct mutation would mix KRN proof
  with user-owned state.
- Python validation output can be noisy; KRN should persist compact redacted
  stdout/stderr tails only.
- This proposal is not evidence that real Codex hooks are trusted.

## 2026-06-14 Isolated Attempt Result

An isolated detached worktree at
`/tmp/krn-harness-dogfood-llm-wiki-non-doc-20260614` applied this config and ran
the pinned KRN loop through
`/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn`.

Result:

- direct `python3 tools/check_all_readonly.py`: pass;
- `krn graph`: ready, 132 nodes, 78 edges;
- `krn context`: `stop: false`, over-inclusion risk low;
- `krn verify --execute`: pass, profile `readonly`, 1/1 command executed;
- `krn handoff`: ready;
- final `krn review`, `krn summary`, and `krn report`: warn with no blockers;
- real-repo execution summary:
  `.krn/dogfood/real-repo-execution/llm-wiki-non-doc-config-20260614/summary.json`;
- changed files: `.agents/`, `.codex/`, `krn.config.json`;
- forbidden touched files: none;
- committed target repo: false;
- pushed target repo: false;
- production proof: false;
- hook trust: unproven.

The result supports applying the config after operator review. It does not prove
product-code mutation or real Codex hook loading/trust.
