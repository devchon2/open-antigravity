#!/bin/bash
set -e
echo "=== Open-Antigravity: Prepare VSCodium ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VSC_DIR="$SCRIPT_DIR/vscodium"
SRC_DIR="$SCRIPT_DIR/antigravity-src"

if [ ! -d "$VSC_DIR" ]; then
  echo "Run get_repo.sh first to clone VSCodium."
  exit 1
fi

echo "[1/4] Copying Antigravity workbench source..."
AG_DEST="$VSC_DIR/src/vs/workbench/contrib/antigravity"
mkdir -p "$AG_DEST"
cp -r "$SRC_DIR/vs/workbench/contrib/antigravity"/* "$AG_DEST/"
echo "  -> $AG_DEST"

echo "[2/4] Registering Antigravity in workbench build..."
CONTRIB_FILE="$VSC_DIR/src/vs/workbench/contrib/contributions.all.ts"
if ! grep -q "antigravity" "$CONTRIB_FILE" 2>/dev/null; then
  echo "import '../contrib/antigravity/antigravity.contribution.js';" >> "$CONTRIB_FILE"
  echo "  -> Added import to contributions.all.ts"
else
  echo "  -> Already registered"
fi

echo "[3/4] Applying product.json branding..."
cp "$SCRIPT_DIR/product.json" "$VSC_DIR/product.json"
echo "  -> product.json applied"

echo "[4/4] Patching workbench for Agent Manager sidebar..."
WORKBENCH_TS="$VSC_DIR/src/vs/workbench/browser/workbench.ts"
if [ -f "$WORKBENCH_TS" ]; then
  if ! grep -q "Open-Antigravity" "$WORKBENCH_TS" 2>/dev/null; then
    # Add antigravity branding to window title
    sed -i 's/document.title = /document.title = "Open-Antigravity — " + /' "$WORKBENCH_TS" 2>/dev/null || true
  fi
fi

echo ""
echo "=== VSCodium prepared for Open-Antigravity ==="
echo "Run: cd vscodium && yarn && yarn build"
echo "Or dev: cd vscodium && yarn watch"
