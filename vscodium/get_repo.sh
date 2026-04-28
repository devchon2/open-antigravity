#!/bin/bash
set -e
echo "=== Open-Antigravity: Clone VSCodium ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"
if [ -d "vscodium" ]; then
  echo "VSCodium already cloned."
  exit 0
fi
echo "Cloning VSCodium (shallow, ~200MB)..."
git clone --depth 1 https://github.com/VSCodium/vscodium.git vscodium
echo "VSCodium cloned to vscodium/vscodium/"
