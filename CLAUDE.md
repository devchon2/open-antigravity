# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Open-Antigravity is an open-source clone of Google's Antigravity agentic IDE. The core approach: **fork VSCodium and build the agent system directly into its workbench source code** — no extension layer. A standalone Fastify LLM Gateway provides unified access to OpenAI, Anthropic, Google, and Ollama.

## Common commands

```bash
npm run build:shared       # Build shared types (required first)
npm run build:gateway      # Build LLM Gateway backend
npm run dev:gateway        # Start gateway on :4001 (tsx watch)

npm run setup:ide          # Clone VSCodium + inject antigravity source
npm run build:ide          # Full IDE build (requires setup:ide first)

cd packages/dashboard && npm run dev  # Mission Control on :3000
```

After `npm run dev:gateway`, verify with:
```bash
curl http://localhost:4001/api/health  # -> {"status":"ok",...}
curl http://localhost:4001/api/models  # -> list of available models
```

## Architecture

### Three layers

1. **`vscodium/`** — The IDE. Contains `antigravity-src/vs/workbench/contrib/antigravity/` which gets copied INTO a VSCodium checkout by `prepare_vscode.sh`. The antigravity code becomes a native workbench contribution registered via `IWorkbenchContributionsRegistry` at `LifecyclePhase.Restored`. No extension APIs are used — all VS Code internal APIs (DI, services, workbench).

2. **`packages/llm-gateway/`** — Standalone Fastify backend. Provider pattern: each model provider is a plain object implementing `LLMProvider { name, providerId, isAvailable(), listModels(), chat() }`. Providers registered in `registry.ts`. Streaming uses SSE over raw HTTP. Auth middleware skips on `/api/health` and allows localhost without token when `GATEWAY_API_KEY` is the default `antigravity-local-dev-key`.

3. **`packages/shared/`** — TypeScript interfaces and Zod schemas shared between gateway and the IDE source. Built first.

### Key design decisions

- **No extension ever.** The `packages/extension/` directory was intentionally removed. All agent features live at `vscodium/antigravity-src/vs/workbench/contrib/antigravity/` and are compiled as part of VSCodium's gulp build. The `prepare_vscode.sh` script registers them in `contributions.all.ts`.

- **Agent loop**: `AntigravityAgentEngine.run()` uses a `while(continueLoop)` pattern that handles multi-level tool calls. Each tool execution's result is sent back to the model, and further tool calls are caught in the outer loop.

- **Progressive disclosure**: `AntigravitySkillLoader` scans `.antigravity/skills/<name>/SKILL.md` files. Only metadata (name, description) is loaded at startup. Full instructions are injected into the system prompt only when a user request matches the skill's description via keyword matching.

- **Approval**: Uses `vscode.window.showQuickPick(['Approve', 'Reject', 'Approve all'])` for file writes, terminal commands, and browser actions. Not a custom webview — uses native VS Code UI.

- **Browser subagent**: `AntigravityBrowserAgent` wraps Playwright. Injects CSS `body { border: 3px solid #58a6ff }` to show the blue border indicating agent control (matching Antigravity's UX). Playwright is dynamically imported (not a hard dependency).

- **Artifact persistence**: JSON in `.antigravity/artifacts.json` at the workspace root. Google Docs-style comments stored as `ArtifactComment[]` on each artifact.

### Remote

- Origin: `https://github.com/devchon2/open-antigravity` (never push to `ishandutta2007`)

### Screenshots

`.screenshots/` contains 35+ reference screenshots from Google Antigravity's official codelab and Medium tutorial. Use these for UI reference but never commit new ones without the user's intent.
