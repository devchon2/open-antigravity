# VSCodium Fork — Open-Antigravity IDE

This directory contains the build configuration and patches for the Open-Antigravity IDE,
which is built on VSCodium (the open-source distribution of VS Code).

## Architecture

```
VSCodium (base)          ← Open-source VS Code without MS branding
  + product.json         ← Custom branding (name, icons, URLs)
  + built-in extension   ← packages/extension/ pre-installed
  + resources/           ← Custom icons and assets
  + patches/             ← Workbench modifications
  = Open-Antigravity IDE
```

## How It Works

1. **VSCodium** provides the base editor (Monaco, terminal, file explorer, SCM, debugger)
2. **Our built-in extension** adds the Agent Manager sidebar, ChatView, tools, and gateway integration
3. **product.json** rebrands it as "Open-Antigravity"
4. **Patches** modify the workbench for deeper integration (welcome page, etc.)

## Building

```bash
# Full build: downloads VSCodium, applies branding, embeds extension
cd vscodium/build
./build.sh

# Output: dist/open-antigravity-{platform}/
```

## Why VSCodium Instead of VS Code

- **VSCodium** is the open-source build of VS Code without Microsoft's proprietary branding,
  telemetry, and license restrictions
- It's MIT-licensed, matching our project license
- Same extension API compatibility
- Same codebase as VS Code (just different build flags)

## Key Differences from a VS Code Extension

| Feature | VS Code Extension | VSCodium Fork |
|---------|-------------------|---------------|
| Branding | Extension sidebar icon | Full application name/icon/splash |
| Installation | User installs from marketplace | Pre-installed, one download |
| Welcome screen | Extension contributes a view | Can replace the entire welcome page |
| Deep integration | Limited to extension API | Can patch VS Code source |
| Distribution | .vsix file | Full .exe/.dmg/.AppImage |
| Auto-start | On activation event | Always running at startup |
