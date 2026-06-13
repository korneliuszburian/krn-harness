#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [[ $# -ne 1 ]]; then
  echo "usage: scripts/krn-local-shim.sh <target-dir>" >&2
  exit 2
fi

TARGET_DIR="$1"
SHIM_PATH="$TARGET_DIR/krn"

mkdir -p "$TARGET_DIR"

cat > "$SHIM_PATH" <<SH
#!/usr/bin/env sh
export KRN_HARNESS_BIN_WRAPPER="\$0"
export KRN_HARNESS_SOURCE_ROOT="$ROOT"
exec node --import "$ROOT/node_modules/tsx/dist/esm/index.mjs" "$ROOT/packages/cli/src/index.ts" "\$@"
SH

chmod +x "$SHIM_PATH"
printf '%s\n' "$SHIM_PATH"
