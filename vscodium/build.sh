#!/bin/bash
set -e
echo "================================================"
echo "  Open-Antigravity IDE — Desktop App Build"
echo "================================================"
echo ""
echo "This builds Open-Antigravity as a native desktop"
echo "application (Windows .exe, macOS .dmg, Linux .AppImage)"
echo "by transforming the VSCodium source with our modifications."
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Get VSCodium build scripts
if [ ! -d "vscodium" ]; then
  echo "[1/3] Downloading VSCodium build scripts..."
  bash get_repo.sh
fi

# Step 2: Inject antigravity source into the build
echo "[2/3] Injecting Open-Antigravity source into VSCodium..."
bash prepare_vscode.sh

# Step 3: Build the desktop application
echo "[3/3] Building Open-Antigravity desktop IDE..."
echo ""
echo "This will:"
echo "  - Clone Microsoft vscode source"
echo "  - Apply VSCodium patches (telemetry removal)"
echo "  - Inject Open-Antigravity workbench source"
echo "  - Apply Open-Antigravity branding (product.json)"
echo "  - Compile everything (TypeScript, native modules)"
echo "  - Package as desktop application"
echo ""
echo "Build time: 10-30 minutes on first run"
echo ""

cd vscodium

# Run VSCodium's development build
# This clones vscode, patches it, injects antigravity (via our hook), and builds
bash dev/build.sh

echo ""
echo "================================================"
echo "  Build Complete!"
echo "================================================"
echo ""
echo "Output: vscodium/VSCode-linux-x64/ (or similar)"
echo "  Windows: .exe in the output directory"
echo "  macOS:   VSCodium.app in the output directory"
echo "  Linux:   ./bin/codium"
echo ""
echo "To package for distribution, add the -p flag:"
echo "  cd vscodium && bash dev/build.sh -p"
