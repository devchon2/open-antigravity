#!/bin/bash
set -e
echo "=== Open-Antigravity: Inject into VSCodium build ==="
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
VSC_DIR="$SCRIPT_DIR/vscodium"
SRC_DIR="$SCRIPT_DIR/antigravity-src"

if [ ! -d "$VSC_DIR" ]; then
  echo "Run get_repo.sh first to clone VSCodium build scripts."
  exit 1
fi

echo "[1/4] Replacing product.json with Open-Antigravity branding..."
cp "$SCRIPT_DIR/product.json" "$VSC_DIR/product.json"
echo "  -> product.json applied"

echo "[2/4] Creating antigravity source injection patch..."
# Create a script that VSCodium's build will call after cloning vscode
INJECT_SCRIPT="$VSC_DIR/inject_antigravity.sh"
cat > "$INJECT_SCRIPT" << 'INNEREOF'
#!/bin/bash
# Injects Open-Antigravity workbench source into the cloned vscode tree
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
AG_SRC="$SCRIPT_DIR/../antigravity-src/vs/workbench/contrib/antigravity"
AG_DEST="$SCRIPT_DIR/vscode/src/vs/workbench/contrib/antigravity"

if [ ! -d "$SCRIPT_DIR/vscode" ]; then
  echo "vscode source not found — run get_repo.sh first"
  exit 1
fi

echo "[Open-Antigravity] Copying workbench source..."
mkdir -p "$AG_DEST"
cp -r "$AG_SRC"/* "$AG_DEST/"
echo "  -> $AG_DEST"

# Register in workbench build
CONTRIB_FILE="$SCRIPT_DIR/vscode/src/vs/workbench/contrib/contributions.all.ts"
if ! grep -q "antigravity" "$CONTRIB_FILE" 2>/dev/null; then
  echo "import '../contrib/antigravity/antigravity.contribution.js';" >> "$CONTRIB_FILE"
  echo "  -> Registered in contributions.all.ts"
else
  echo "  -> Already registered"
fi

# Patch window title
WORKBENCH_TS="$SCRIPT_DIR/vscode/src/vs/workbench/browser/workbench.ts"
if [ -f "$WORKBENCH_TS" ]; then
  if ! grep -q "Open-Antigravity" "$WORKBENCH_TS" 2>/dev/null; then
    sed -i 's/document.title = /document.title = "Open-Antigravity - " + /' "$WORKBENCH_TS" 2>/dev/null || true
  fi
fi
echo "[Open-Antigravity] Injection complete"
INNEREOF
chmod +x "$INJECT_SCRIPT"
echo "  -> inject_antigravity.sh created"

echo "[3/4] Patching VSCodium build to include antigravity injection..."
GET_REPO="$VSC_DIR/get_repo.sh"
if [ -f "$GET_REPO" ]; then
  if ! grep -q "inject_antigravity" "$GET_REPO" 2>/dev/null; then
    # Add injection call at the end of get_repo.sh (after vscode is cloned)
    echo "" >> "$GET_REPO"
    echo "# Open-Antigravity: inject workbench source" >> "$GET_REPO"
    echo 'SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"' >> "$GET_REPO"
    echo 'bash "$SCRIPT_DIR/inject_antigravity.sh"' >> "$GET_REPO"
    echo "  -> get_repo.sh patched"
  else
    echo "  -> Already patched"
  fi
fi

echo "[4/4] Configuring build for Open-Antigravity..."
# Copy our resources (icons, etc.)
mkdir -p "$VSC_DIR/resources"
cp "$SCRIPT_DIR/resources"/* "$VSC_DIR/resources/" 2>/dev/null || true

echo ""
echo "=== VSCodium prepared for Open-Antigravity build ==="
echo "Next: cd vscodium && bash build.sh"
echo "This will produce a desktop IDE (.exe, .dmg, .AppImage, .deb)"
echo ""
echo "Prerequisites: node, python3.11, rustup, jq, git, gcc/g++"
echo "See: https://github.com/VSCodium/vscodium/blob/master/docs/howto-build.md"
