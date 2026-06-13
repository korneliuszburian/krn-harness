#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="${TMPDIR:-/tmp}/krn-hook-probe-$RANDOM-$$"
DOWNSTREAM="$WORKDIR/downstream-basic"
RESULT_JSON="$DOWNSTREAM/.krn/dogfood/hook-trust-probe.json"

mkdir -p "$WORKDIR/bin"
cp -R "$ROOT/fixtures/repos/downstream-basic" "$DOWNSTREAM"
rm -rf "$DOWNSTREAM/.krn"

cat > "$WORKDIR/bin/krn" <<SH
#!/usr/bin/env sh
node --import "$ROOT/node_modules/tsx/dist/esm/index.mjs" "$ROOT/packages/cli/src/index.ts" "\$@"
SH
chmod +x "$WORKDIR/bin/krn"
export PATH="$WORKDIR/bin:$PATH"

cd "$DOWNSTREAM"
krn install >/dev/null
krn hook codex SessionStart >/dev/null

codex_command="$(command -v codex || true)"
codex_hook_flags="unavailable"
if [[ -n "$codex_command" ]]; then
  codex_hook_flags="$("$codex_command" --help | grep -E "hook|bypass" || true)"
fi

hook_trace_count="$(grep -c '"name":"hook.received"' .krn/traces/trace.jsonl || true)"
mkdir -p "$(dirname "$RESULT_JSON")"

cat > "$RESULT_JSON" <<JSON
{
  "status": "ready-for-real-codex-probe",
  "codexAvailable": $([[ -n "$codex_command" ]] && echo true || echo false),
  "codexCommand": $(if [[ -n "$codex_command" ]]; then printf '"%s"' "$codex_command"; else echo null; fi),
  "hooksTemplatePresent": true,
  "manualHookCommand": "krn hook codex SessionStart",
  "manualHookTraceEvents": $hook_trace_count,
  "dangerousBypassUsed": false,
  "codexHookFlags": $(printf '%s' "$codex_hook_flags" | node -e 'let data=""; process.stdin.on("data", c => data += c); process.stdin.on("end", () => console.log(JSON.stringify(data)));'),
  "notes": [
    "Manual krn hook invocation proves the generated command can write hook.received.",
    "It does not prove Codex loaded or trusted .codex/hooks.json.",
    "Real Codex runs must be checked for hook.received without --dangerously-bypass-hook-trust."
  ]
}
JSON

echo "KRN hook trust probe: ready"
echo "repo: $DOWNSTREAM"
echo "result: $RESULT_JSON"
