#!/bin/bash
set -e
echo "=== Open-Antigravity IDE Build ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

if [ ! -d "vscodium" ]; then ./get_repo.sh; fi
./prepare_vscode.sh

echo "Building Open-Antigravity IDE..."
cd vscodium
yarn install --frozen-lockfile 2>/dev/null || yarn install
yarn build

echo ""
echo "=== Build complete ==="
echo "Output: $(pwd)/../VSCode-linux-x64/ (or similar)"
