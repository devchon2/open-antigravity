#!/bin/bash
set -e
echo "=== Open-Antigravity VSCodium Fork Setup ==="
VSCodium_REPO="https://github.com/VSCodium/vscodium.git"
VSCodium_DIR="./vscodium-src"
if [ ! -d "$VSCodium_DIR" ]; then
  echo "[1/4] Cloning VSCodium..."
  git clone --depth 1 "$VSCodium_REPO" "$VSCodium_DIR"
else
  echo "[1/4] VSCodium already cloned."
fi
echo "[2/4] Copying Open-Antigravity source..."
SRC_DIR="../src/vs/workbench/contrib/antigravity"
DEST_DIR="$VSCodium_DIR/src/vs/workbench/contrib/antigravity"
mkdir -p "$DEST_DIR"
cp -r "$SRC_DIR"/* "$DEST_DIR"/
echo "[3/4] Applying branding..."
cp ../product.json "$VSCodium_DIR/product.json"
echo "[4/4] Registering contribution..."
BUILD_TS="$VSCodium_DIR/src/vs/workbench/contrib/contributions.all.ts"
if ! grep -q "antigravity" "$BUILD_TS" 2>/dev/null; then
  echo "import '../contrib/antigravity/antigravity.contribution.js';" >> "$BUILD_TS"
fi
echo "=== Done ==="
echo "Build: cd $VSCodium_DIR && yarn && yarn build"
