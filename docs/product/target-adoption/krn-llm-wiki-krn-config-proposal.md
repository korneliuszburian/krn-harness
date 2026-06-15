# krn-llm-wiki KRN Adoption Proposal

## Target

- Repo: `/home/krn/coding/krn/active/krn-llm-wiki`
- Branch observed: `r2c-011-update-page-operator-readiness-report`
- Current state observed: dirty (`AGENTS.md`, `.codex/`, `.krn/`)
- Existing validation surface: Python tools and no `package.json`

This proposal began as read-only. The 2026-06-15 reviewed adoption boundary
below records the first target PR that commits only `krn.config.json`.

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
    "timeoutMs": 360000,
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
   `run --task-spec <task.json> --execute-verify --bundle`.
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
- Target PR adoption is review evidence only until the target owner reviews and
  merges it.

## 2026-06-15 Reviewed Target PR Adoption Boundary

An isolated worktree at `/tmp/krn-llm-wiki-krn-adoption-20260615` started from
`origin/main` at `e230289ae3d744561555a6998a32b8ae2ecd0b24`. The active target
checkout remained dirty (`AGENTS.md`, `.codex/`, `.krn/`) and was not mutated.

Target branch:

`krn-adopt-harness-config-20260615`

Target commit:

`0449611b4f18ed89c05374c4f96a5421fc549229 chore: adopt krn readonly config`

Reviewed PR boundary:

`https://github.com/korneliuszburian/krn-llm-wiki/pull/78`

Committed target files:

- `krn.config.json`

Runtime-only, uncommitted evidence:

- `.krn/dogfood/task-specs/adopt-krn-config-reviewed-pr.json`;
- `.krn/current/config-doctor.json`;
- `.krn/current/run-result.json`;
- `.krn/current/run-bundle/manifest.json`.

Validation:

- direct target preflight `python3 tools/check_all_readonly.py`: pass, 212.22s;
- pinned KRN identity command path:
  `/home/krn/coding/krn/krn-harness/packages/cli/src/index.ts`;
- `krn config doctor --json`: pass, profile `readonly`, command allowed;
- `krn run --task-spec .krn/dogfood/task-specs/adopt-krn-config-reviewed-pr.json --execute-verify --bundle`:
  verified;
- executed verify command: `python3 tools/check_all_readonly.py`;
- executed commands: 1/1, exit 0;
- run bundle manifest: `krn-run-bundle-manifest-v1`,
  `productionProof: false`, `hookTrustStatus: "unproven"`;
- PR diff: `krn.config.json` only;
- PR merge state: clean;
- target status checks: none configured.

Boundaries:

- no direct push to target `main`;
- PR remains unmerged;
- `.krn/`, `.codex/`, AGENTS, raw/wiki content, protected data, and governance
  artifacts are not committed by this branch;
- this is not production proof;
- this is not hook trust proof.

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

## 2026-06-15 Beta Candidate Install/Config Smoke

An isolated detached worktree at
`/tmp/krn-harness-beta-llm-wiki-20260615-0925` tested the beta install/config
lifecycle against target `HEAD` `609d8bf2b6901c39533be59c35419864cad35ee7`.
The active target checkout was dirty, so no direct target mutation or push was
attempted.

Pinned KRN command: `/tmp/krn-harness-beta-llm-wiki-bin-20260615-0925/krn`.

Result:

- `krn install --dry-run --with-config --config-profile readonly-python`: planned,
  11 actions, wrote no files.
- `krn install --with-config --config-profile readonly-python`: installed,
  created 10 managed artifacts and skipped existing `AGENTS.md`.
- `krn config doctor --json`: pass, profile `readonly`, command allowed.
- `krn verify --execute`: pass, 1/1 command executed,
  `python3 tools/check_all_readonly.py`.
- verify limits: `timeoutMs: 360000`, `maxOutputBytes: 16000`.
- `krn review --write`, `krn summary --write`, and `krn report --bundle`:
  completed with warning caveats only.
- report bundle manifest: `krn-report-bundle-manifest-v1`,
  `productionProof: false`.
- target worktree status contained only untracked KRN install/runtime artifacts
  and captured smoke output files.
- committed target repo: false.
- pushed target repo: false.

The first attempt with the previous 180000ms generated profile timed out while
the target readonly suite was still emitting passing checks. The beta starter
profile was updated to 360000ms before the passing rerun. This supports the
install/config lifecycle and readonly verify profile for `krn-llm-wiki`; the
later 2026-06-15 `krn run` proof covers a small real target
product-code/checker mutation. Neither run proves Codex hook trust.

## 2026-06-15 Product-Code/Checker `krn run` Proof

An isolated detached worktree at
`/tmp/krn-run-real-product-code-llm-wiki-20260615-1` used a task spec under
`.krn/dogfood/task-specs/status-active-pages-count.json`.

Result:

- `krn run --task-spec ... --execute-verify --bundle`: verified;
- executed verify command: `python3 tools/check_llm_wiki_status.py`;
- touched target files: `tools/llm_wiki_status.py`,
  `tools/check_llm_wiki_status.py`;
- run bundle manifest: `.krn/current/run-bundle/manifest.json`;
- committed target repo: false;
- pushed target repo: false;
- production proof: false;
- hook trust: unproven.

Detailed handoff:

`docs/handoffs/2026-06-15-real-target-krn-run-product-code-proof.md`
