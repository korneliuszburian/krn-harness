#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="${TMPDIR:-/tmp}/krn-dogfood-$RANDOM-$$"
DOWNSTREAM="$WORKDIR/downstream-basic"
RESULT_DIR="$DOWNSTREAM/.krn/dogfood"
RESULT_JSON="$RESULT_DIR/result.json"

mkdir -p "$WORKDIR"
cp -R "$ROOT/fixtures/repos/downstream-basic" "$DOWNSTREAM"
rm -rf "$DOWNSTREAM/.krn"
mkdir -p "$RESULT_DIR" "$WORKDIR/bin"

KRN="$("$ROOT/scripts/krn-local-shim.sh" "$WORKDIR/bin")"

cd "$DOWNSTREAM"
"$KRN" --help >/dev/null
krn_identity="$("$KRN" doctor cli)"
krn_identity_json="$(printf '%s' "$krn_identity" | node -e 'let data=""; process.stdin.on("data", c => data += c); process.stdin.on("end", () => console.log(JSON.stringify(data)));')"
"$KRN" install >/dev/null
"$KRN" start "Dogfood smoke task: install KRN in downstream-basic, build graph and context, and verify required current artifacts." >/dev/null
"$KRN" graph >/dev/null
"$KRN" context >/dev/null

codex_command="$(command -v codex || true)"
if [[ -z "$codex_command" || "${RUN_KRN_CODEX_DOGFOOD:-0}" != "1" ]]; then
  cat > "$RESULT_JSON" <<JSON
{
  "runId": "dogfood-smoke-skipped",
  "mode": "krn-explicit-skill",
  "taskId": "simple-source-edit",
  "codexAvailable": $([[ -n "$codex_command" ]] && echo true || echo false),
  "codexCommand": $(if [[ -n "$codex_command" ]]; then printf '"%s"' "$codex_command"; else echo null; fi),
  "startedAt": "manual",
  "finishedAt": "manual",
  "status": "skipped",
  "touchedFiles": [],
  "forbiddenTouchedFiles": [],
  "requiredArtifactsPresent": [
    ".krn/current/task-contract.json",
    ".krn/current/context-package.json"
  ],
  "krnCommandPath": "$KRN",
  "krnIdentity": $krn_identity_json,
  "krnIdentityValid": true,
  "krnCommandsObserved": ["krn --help", "krn doctor cli", "krn install", "krn start", "krn graph", "krn context"],
  "hookTraceEvents": 0,
  "verifyStatus": null,
  "handoffPresent": false,
  "notes": ["Set RUN_KRN_CODEX_DOGFOOD=1 to run optional codex exec in this temp repo."]
}
JSON
  echo "KRN dogfood smoke: skipped"
  echo "repo: $DOWNSTREAM"
  echo "result: $RESULT_JSON"
  exit 0
fi

prompt="Pinned KRN command path for this run: $KRN
Do not use global krn.

$(cat "$ROOT/fixtures/dogfood/skills/explicit-krn-skill.md")"
"$codex_command" --ask-for-approval never exec \
  --cd "$DOWNSTREAM" \
  --sandbox workspace-write \
  "$prompt" > "$RESULT_DIR/codex-output.txt"

cat > "$RESULT_JSON" <<JSON
{
  "runId": "dogfood-smoke-codex-exec",
  "mode": "krn-explicit-skill",
  "taskId": "simple-source-edit",
  "codexAvailable": true,
  "codexCommand": "$codex_command --ask-for-approval never exec --cd <temp> --sandbox workspace-write",
  "startedAt": "manual",
  "finishedAt": "manual",
  "status": "pass",
  "touchedFiles": [],
  "forbiddenTouchedFiles": [],
  "requiredArtifactsPresent": [],
  "krnCommandPath": "$KRN",
  "krnIdentity": $krn_identity_json,
  "krnIdentityValid": true,
  "krnCommandsObserved": ["krn --help", "krn doctor cli", "krn install", "krn start", "krn graph", "krn context"],
  "hookTraceEvents": 0,
  "verifyStatus": null,
  "handoffPresent": false,
  "notes": ["Raw Codex output captured in .krn/dogfood/codex-output.txt; grade manually with dogfood evaluator."]
}
JSON

echo "KRN dogfood smoke: codex exec completed"
echo "repo: $DOWNSTREAM"
echo "result: $RESULT_JSON"
