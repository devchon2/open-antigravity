#!/bin/bash
set -e
echo "Building Open-Antigravity..."
cd "$(dirname "$0")/.."
npm run build
echo "Build complete!"
