#!/bin/bash
set -e

# Open-Antigravity VSCodium Fork Setup
# Clones VSCodium build system + VS Code source, applies our modifications
echo "=== Open-Antigravity VSCodium Fork Setup ==="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VSCodium_DIR="$PROJECT_ROOT/vscodium-fork"

# Step 1: Clone VSCodium build system
echo "[1/3] Cloning VSCodium..."
if [ ! -d "$VSCodium_DIR" ]; then
  git clone --depth 1 https://github.com/VSCodium/vscodium.git "$VSCodium_DIR"
fi

# Step 2: Copy our built-in extension
echo "[2/3] Installing antigravity extension..."
mkdir -p "$VSCodium_DIR/src/stable/extensions/antigravity"
cp "$PROJECT_ROOT/vscodium/src/stable/extensions/antigravity/"* "$VSCodium_DIR/src/stable/extensions/antigravity/"

# Step 3: Apply our product.json modifications
echo "[3/3] Applying Open-Antigravity branding..."
cd "$VSCodium_DIR"
# Merge our product.json overrides using jq
if [ -f "$PROJECT_ROOT/vscodium/product.json" ]; then
  jq -s '.[0] * .[1]' product.json "$PROJECT_ROOT/vscodium/product.json" > product.json.tmp
  mv product.json.tmp product.json
fi

echo ""
echo "=== Setup Complete ==="
echo "VSCodium fork at: $VSCodium_DIR"
echo ""
echo "To build the IDE:"
echo "  cd $VSCodium_DIR"
echo "  export VSCODE_QUALITY=stable"
echo "  ./get_repo.sh"
echo "  ./prepare_vscode.sh"
echo "  cd vscode && yarn && yarn compile"
