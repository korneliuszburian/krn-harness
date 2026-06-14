# Non-Doc krn-llm-wiki Config Dogfood

## Summary

On 2026-06-14, KRN Harness ran an isolated non-doc target adoption attempt
against `krn-llm-wiki`.

This was a local manual Codex execution evidence run. It is not production
proof, not hook-trust proof, and it did not commit or push target changes.

## Target

- Active checkout inspected: `/home/krn/coding/krn/active/krn-llm-wiki`
- Active branch: `r2c-011-update-page-operator-readiness-report`
- Active checkout state before attempt: dirty (`AGENTS.md`, `.codex/`, `.krn/`)
- Execution worktree: `/tmp/krn-harness-dogfood-llm-wiki-non-doc-20260614`
- Worktree base: detached HEAD `609d8bf`
- Pinned KRN shim: `/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn`

## Non-Doc Change

The isolated worktree added `krn.config.json` with a single readonly verify
profile:

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

KRN install also created `.codex/`, `.agents/`, `.krn/`, and `.krn/bin/krn`
inside the isolated worktree.

## Commands Run

```bash
python3 tools/check_all_readonly.py
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn doctor cli
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn install
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn start "Adopt a KRN readonly verify profile through krn.config.json and validate krn-llm-wiki without changing product code."
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn graph
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn context
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn verify --execute
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn handoff
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn review --write
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn summary --write
/tmp/krn-harness-dogfood-llm-wiki-non-doc-bin/krn report --write
scripts/krn-real-repo-execution-report.sh
```

## Results

- Direct target readonly suite: pass, 37 checks, about 172.80 seconds.
- KRN graph: ready, 132 nodes, 78 edges.
- KRN context: pass, `stop: false`, over-inclusion risk low.
- KRN verify: pass, profile `readonly`, mode `execute`, 1/1 command executed.
- KRN handoff: ready.
- KRN review: warn, no blockers after handoff.
- KRN summary: warn.
- KRN report: warn, no blockers.
- Real repo execution result: pass.

Final operator report excerpt:

```json
{
  "verdict": "warn",
  "blockers": [],
  "verify": {
    "status": "pass",
    "mode": "execute",
    "profileName": "readonly",
    "executedCommands": 1,
    "totalCommands": 1
  },
  "realRepoEvidence": {
    "status": "execution-evidence",
    "latestPath": ".krn/dogfood/real-repo-execution/llm-wiki-non-doc-config-20260614/summary.json"
  },
  "productionProof": {
    "value": false
  }
}
```

## Target Safety

Execution-result changed files:

- `.agents/`
- `.codex/`
- `krn.config.json`

Forbidden touched files: none.

Committed target repo: false.

Pushed target repo: false.

## Remaining Gaps

- Real Codex hook loading/trust remains unproven: `hook.received` count was 0.
- The active target checkout was dirty, so this evidence used a detached isolated
  worktree.
- This proves KRN config adoption and readonly verification on a non-doc target
  config, not product-code mutation in `krn-llm-wiki`.
- The target config should be reviewed before applying to the active checkout.
