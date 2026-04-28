#!/bin/bash
set -e
echo "=== Open-Antigravity: Clone VSCodium build scripts ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ -d "vscodium" ]; then
  echo "VSCodium build scripts already cloned."
  exit 0
fi

echo "Cloning VSCodium (build scripts, not vscode source)..."
git clone --depth 1 https://github.com/VSCodium/vscodium.git vscodium
echo "VSCodium build scripts ready at vscodium/vscodium/"
