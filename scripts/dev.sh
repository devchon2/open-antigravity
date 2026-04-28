#!/bin/bash
set -e
echo "Starting Open-Antigravity LLM Gateway in dev mode..."
cd "$(dirname "$0")/.."
npm run dev:gateway
