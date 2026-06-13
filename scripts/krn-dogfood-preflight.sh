#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/krn-dogfood-preflight.XXXXXX")"
DOWNSTREAM="$WORKDIR/wordpress-acf-theme"

snapshot_source_runtime() {
  if [[ -d "$ROOT/.krn" ]]; then
    find "$ROOT/.krn" -type f -print0 | sort -z | xargs -0 -r sha256sum
  fi
}

require_contains() {
  local haystack="$1"
  local needle="$2"
  local label="$3"

  if [[ "$haystack" != *"$needle"* ]]; then
    echo "KRN dogfood preflight: expected $label to contain: $needle" >&2
    exit 1
  fi
}

before_runtime="$(snapshot_source_runtime)"

cp -R "$ROOT/fixtures/repos/wordpress-acf-theme" "$DOWNSTREAM"
rm -rf "$DOWNSTREAM/.krn"
mkdir -p "$DOWNSTREAM/fixtures/dogfood/tasks"
cp "$ROOT/fixtures/dogfood/tasks/wp-acf-hero-copy.json" \
  "$DOWNSTREAM/fixtures/dogfood/tasks/wp-acf-hero-copy.json"
mkdir -p "$WORKDIR/bin"

KRN="$("$ROOT/scripts/krn-local-shim.sh" "$WORKDIR/bin")"

if [[ ! -x "$KRN" ]]; then
  echo "KRN dogfood preflight: pinned krn path is not executable: $KRN" >&2
  exit 1
fi

global_krn="$(command -v krn || true)"
if [[ -n "$global_krn" && "$global_krn" != "$KRN" ]]; then
  echo "KRN dogfood preflight: ignoring global krn at $global_krn; using pinned $KRN" >&2
fi

cd "$ROOT"
help_text="$("$KRN" --help)"
require_contains "$help_text" "KRN Harness CLI" "krn --help"
require_contains "$help_text" "krn doctor cli" "krn --help"

identity="$("$KRN" doctor cli)"
require_contains "$identity" "schema: krn-harness-cli-identity-v1" "krn doctor cli"
require_contains "$identity" "package: @krn-harness/cli" "krn doctor cli"
require_contains "$identity" "required_commands_present: true" "krn doctor cli"
require_contains "$identity" "runtime_cwd: $ROOT" "source checkout identity probe"

cd "$DOWNSTREAM"
git init -q
git add .
git -c user.email=krn@example.invalid -c user.name="KRN Preflight" commit -q -m "fixture baseline"

"$KRN" install >/dev/null
"$KRN" status >/dev/null
"$KRN" start --task-spec fixtures/dogfood/tasks/wp-acf-hero-copy.json >/dev/null
"$KRN" graph >/dev/null
"$KRN" context >/dev/null
"$KRN" verify --execute >/dev/null
"$KRN" handoff >/dev/null

for artifact in \
  ".krn/current/task-contract.json" \
  ".krn/current/context-package.json" \
  ".krn/current/verify-result.json" \
  ".krn/current/handoff.md" \
  ".krn/current/run.json" \
  ".krn/graph/repo-graph.json"; do
  if [[ ! -f "$artifact" ]]; then
    echo "KRN dogfood preflight: missing downstream artifact: $artifact" >&2
    exit 1
  fi
done

node -e '
const fs = require("node:fs");
const verify = JSON.parse(fs.readFileSync(".krn/current/verify-result.json", "utf8"));
if (verify.status !== "pass" || verify.mode !== "execute" || (verify.summary?.executedCommands ?? 0) < 1) {
  console.error("KRN dogfood preflight: verify --execute did not produce pass/execute evidence");
  process.exit(1);
}
'

after_runtime="$(snapshot_source_runtime)"
if [[ "$before_runtime" != "$after_runtime" ]]; then
  echo "KRN dogfood preflight: source checkout .krn mutated during downstream preflight" >&2
  exit 1
fi

echo "KRN dogfood preflight: pass"
echo "repo: $DOWNSTREAM"
echo "krn: $KRN"
echo "$identity"
