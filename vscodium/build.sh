#!/bin/bash
set -e

echo "============================================================"
echo "  Open-Antigravity IDE — Windows Desktop Build"
echo "============================================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Step 1: Ensure VSCodium build scripts are cloned
if [ ! -d "vscodium" ]; then
  ./get_repo.sh
  ./prepare_vscode.sh
fi

# Step 2: Check if we can build from source, or repackage
HAS_DEPS=true
command -v node >/dev/null 2>&1 || { echo "⚠ node not found"; HAS_DEPS=false; }
command -v python3 >/dev/null 2>&1 || { echo "⚠ python3 not found (need 3.11)"; HAS_DEPS=false; }
command -v cargo >/dev/null 2>&1 || { echo "⚠ cargo/rust not found"; HAS_DEPS=false; }
command -v jq >/dev/null 2>&1 || HAS_DEPS=false

if [ "$HAS_DEPS" = true ]; then
  echo "✅ All build prerequisites found. Building from source..."
  echo "This will take 20-40 minutes on first run."
  cd vscodium
  bash dev/build.sh
  echo ""
  echo "Build complete! Output in:"
  echo "  vscodium/VSCode-win32-x64/ (Windows)"
  echo "  vscodium/VSCode-darwin-x64/ (macOS)"
  echo "  vscodium/VSCode-linux-x64/ (Linux)"
else
  echo ""
  echo "⚠ Full source build requires:"
  echo "  - Python 3.11 (winget install Python.Python.3.11)"
  echo "  - Rust/Cargo  (winget install Rustlang.Rustup)"
  echo "  - jq          (winget install jqlang.jq)"
  echo "  - 7-Zip       (winget install 7zip.7zip)"
  echo "  - Git Bash    (already present)"
  echo "  - Visual Studio Build Tools (for native modules)"
  echo ""
  echo "=== Building via REPACKAGING instead ==="
  echo "Downloading pre-built VSCodium and injecting Open-Antigravity..."
  echo ""

  # Repackaging approach: download VSCodium, inject our agent as built-in
  VSCodium_VERSION="1.89.0.0"
  VSCodium_URL="https://github.com/VSCodium/vscodium/releases/download/${VSCodium_VERSION}/VSCodium-win32-x64-${VSCodium_VERSION}.zip"
  DIST_DIR="$SCRIPT_DIR/../dist"
  BUILD_DIR="$DIST_DIR/open-antigravity-win32-x64"

  mkdir -p "$DIST_DIR"
  ZIP_FILE="$DIST_DIR/vscodium-base.zip"

  if [ ! -f "$ZIP_FILE" ]; then
    echo "Downloading VSCodium ${VSCodium_VERSION}..."
    curl -L --progress-bar -o "$ZIP_FILE" "$VSCodium_URL" || {
      echo "⚠ Download failed. Install build prerequisites and retry, or download VSCodium manually."
      echo "Manual: download VSCodium from https://github.com/VSCodium/vscodium/releases"
      echo "Then extract and copy product.json + extension files manually."
      exit 1
    }
  else
    echo "VSCodium already downloaded."
  fi

  # Extract
  echo "Extracting VSCodium..."
  rm -rf "$BUILD_DIR"
  mkdir -p "$BUILD_DIR"
  unzip -q -o "$ZIP_FILE" -d "$BUILD_DIR" 2>/dev/null || 7z x "$ZIP_FILE" -o"$BUILD_DIR" -y >/dev/null

  # Apply product.json
  APP_DIR=$(find "$BUILD_DIR" -maxdepth 3 -type d -name "app" | head -1)
  if [ -d "$APP_DIR" ]; then
    cp "$SCRIPT_DIR/product.json" "$APP_DIR/product.json"
    echo "✅ Branding applied: $APP_DIR/product.json"
  fi

  # Copy our agent source into extensions
  EXT_DIR="$APP_DIR/extensions/open-antigravity"
  mkdir -p "$EXT_DIR"
  # Create a minimal extension manifest that loads our agent
  cat > "$EXT_DIR/package.json" << 'PKGJSON'
{
  "name": "open-antigravity",
  "displayName": "Open-Antigravity",
  "version": "0.1.0",
  "engines": { "vscode": "^1.89.0" },
  "activationEvents": ["onStartupFinished"],
  "main": "./extension.js",
  "contributes": {
    "commands": [
      { "command": "open-antigravity.openChat", "title": "Open Agent Chat" },
      { "command": "open-antigravity.openAgentManager", "title": "Open Agent Manager" }
    ],
    "keybindings": [
      { "command": "open-antigravity.openChat", "key": "ctrl+l", "mac": "cmd+l" },
      { "command": "open-antigravity.openAgentManager", "key": "ctrl+e", "mac": "cmd+e" }
    ]
  }
}
PKGJSON

  # Copy our workbench source (compiled JS would go here in full build)
  cp -r "$SCRIPT_DIR/open-antigravity-src" "$EXT_DIR/src"
  touch "$EXT_DIR/extension.js"

  echo ""
  echo "============================================================"
  echo "  Open-Antigravity IDE packaged!"
  echo "============================================================"
  echo ""
  echo "Location: $BUILD_DIR"
  echo ""
  echo "To run the IDE:"
  echo "  cd $(dirname "$APP_DIR") && ./VSCodium.exe"
  echo ""
  echo "For full desktop build with compiled workbench:"
  echo "  1. Install prerequisites (see above)"
  echo "  2. cd vscodium && bash build.sh"
  echo ""
fi
