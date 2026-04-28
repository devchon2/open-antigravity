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

1. **`vscodium/`** — The IDE. Contains `open-antigravity-src/vs/workbench/contrib/open-antigravity/` which gets copied INTO a VSCodium checkout by `prepare_vscode.sh`. The antigravity code becomes a native workbench contribution registered via `IWorkbenchContributionsRegistry` at `LifecyclePhase.Restored`. No extension APIs are used — all VS Code internal APIs (DI, services, workbench).

2. **`packages/llm-gateway/`** — Standalone Fastify backend. Provider pattern: each model provider is a plain object implementing `LLMProvider { name, providerId, isAvailable(), listModels(), chat() }`. Providers registered in `registry.ts`. Streaming uses SSE over raw HTTP. Auth middleware skips on `/api/health` and allows localhost without token when `GATEWAY_API_KEY` is the default `antigravity-local-dev-key`.

3. **`packages/shared/`** — TypeScript interfaces and Zod schemas shared between gateway and the IDE source. Built first.

### Key design decisions

- **No extension ever.** The `packages/extension/` directory was intentionally removed. All agent features live at `vscodium/open-antigravity-src/vs/workbench/contrib/open-antigravity/` and are compiled as part of VSCodium's gulp build. The `prepare_vscode.sh` script registers them in `contributions.all.ts`.

- **Agent loop**: `AgentEngine.run()` uses a `while(continueLoop)` pattern that handles multi-level tool calls. Each tool execution's result is sent back to the model, and further tool calls are caught in the outer loop.

- **Progressive disclosure**: `SkillLoader` scans `.open-antigravity/skills/<name>/SKILL.md` files. Only metadata (name, description) is loaded at startup. Full instructions are injected into the system prompt only when a user request matches the skill's description via keyword matching.

- **Approval**: Uses `vscode.window.showQuickPick(['Approve', 'Reject', 'Approve all'])` for file writes, terminal commands, and browser actions. Not a custom webview — uses native VS Code UI.

- **Browser subagent**: `BrowserAgent` wraps Playwright. Injects CSS `body { border: 3px solid #58a6ff }` to show the blue border indicating agent control (matching Antigravity's UX). Playwright is dynamically imported (not a hard dependency).

- **Artifact persistence**: JSON in `.open-antigravity/artifacts.json` at the workspace root. Google Docs-style comments stored as `ArtifactComment[]` on each artifact.

## Antigravity Feature Parity

### What Google's Antigravity is

Antigravity forks the open-source VS Code foundation but radically alters the UX into two primary windows: **Editor** (code) and **Agent Manager** (Mission Control dashboard for orchestrating agents). Toggle: `Cmd+E`. It treats AI agents as autonomous actors — the developer is an architect/manager dispatching multiple agents on parallel tasks.

### Agent Manager (Mission Control)

| Feature | Antigravity | Our impl | File |
|---------|------------|----------|------|
| Inbox (conversation history) | `Cmd+E` → Agent Manager → inbox list | Dashboard only | Inbox.tsx |
| Start Conversation | "Ask anything" input | Dashboard AgentChat | AgentChat.tsx |
| Workspaces selector | Multiple workspaces per conversation | Sidebar | Sidebar.tsx |
| Playground (scratch area) | Ad-hoc chat convertible to workspace | Dashboard tab | Sidebar.tsx |
| Model selector dropdown | List of available models | ✅ | ModelSelector.tsx |
| Fast / Planning mode toggle | Controls agent thinking budget | ✅ | AgentChat.tsx |
| Artifacts toggle | Top-right, next to "Review changes" | Dashboard panel | ArtifactsPanel.tsx |
| Review changes button | Shows code diffs with Accept/Reject all | ❌ | — |
| Browser agent icon | Chrome icon bottom-left | Dashboard button | Sidebar.tsx |

### Editor Integration

| Feature | Shortcut | Our impl | File |
|---------|----------|----------|------|
| Auto-complete | Tab | ✅ InlineCompletionItemProvider | editor/inlineCompletionProvider.ts |
| Tab to import | Tab | ❌ | — |
| Tab to jump | Tab | ❌ | — |
| Inline command | `Cmd+I` | ✅ Cmd+I handler | editor/inlineCommands.ts |
| Agent side panel | `Cmd+L` | ⚠️ concept only | — |
| Toggle Editor↔Manager | `Cmd+E` | ⚠️ command exists | contribution.ts |
| Explain and fix | Hover on problem | ✅ problem scanner + agent prompt | editor/problemIntegration.ts |
| Send all to Agent | Problems panel | ✅ buildSendAllPrompt() | editor/problemIntegration.ts |
| Send terminal output | Select + `Cmd+L` | ✅ terminal → agent | editor/terminalIntegration.ts |

### Agent System

| Feature | Our impl | File |
|---------|----------|------|
| AgentEngine (Plan→Approve→Execute→Verify) | ✅ | agent/AgentEngine.ts |
| Multi-agent (spawn coder/tester/reviewer) | ✅ | agent/AgentManager.ts |
| Tool system (7 tools) | ✅ | tools/Tools.ts |
| Approval (QuickPick: Approve/Reject/Approve all) | ✅ | agent/AgentEngine.ts |
| Checkpoints (git stash undo) | ✅ | workspace/CheckpointManager.ts |
| Diff generation (LCS unified diff) | ✅ | diffs/DiffManager.ts |

### Browser Subagent

| Feature | Antigravity | Our impl |
|---------|------------|----------|
| Separate model | Yes — specialized browser model | Same gateway |
| Tools | click, scroll, type, console, DOM, screenshots, video | navigate, click, type, screenshot, get_content |
| Blue border | CSS 3px solid #58a6ff | ✅ |
| Video recording | Yes | ❌ |
| URL allowlist | Browser settings | Config exists |
| Chrome extension required | Yes | No (Playwright) |

### Artifacts (Trust Gap)

| Type | Our impl | Status |
|------|----------|--------|
| Task Lists | artifactStore.create(type='task_list') | ✅ |
| Implementation Plans | artifactStore.create(type='plan') | ✅ |
| Walkthroughs | artifactStore.create(type='walkthrough') | ✅ |
| Code diffs | LCS-generated unified diff | ✅ |
| Screenshots | Browser agent PNG capture | ✅ |
| Browser recordings | ✅ frame capture at 10fps | browser/BrowserRecorder.ts |
| Test results | Type exists | ⚠️ |
| Google Docs-style comments | ArtifactComment[] | ✅ |

### Skills (Progressive Disclosure)

| Feature | Path | Status |
|---------|------|--------|
| SKILL.md (YAML frontmatter) | `.open-antigravity/skills/<name>/SKILL.md` | ✅ |
| Global scope | `~/.open-antigravity/skills/` | ✅ |
| Workspace scope | `<workspace>/.agent/skills/` | ✅ |
| scripts/ optional dir | For Python/Bash execution | ❌ |
| references/ optional dir | Docs, templates | ❌ |
| assets/ optional dir | Images, logos | ❌ |

### Workflows

| Feature | Path | Status |
|---------|------|--------|
| /command triggers | `/` in chat | ✅ |
| Saved prompts (.md) | `.open-antigravity/workflows/<name>.md` | ✅ |
| Global + Workspace | `~/.open-antigravity/workflows/` + workspace | ✅ |

### Rules (Always-On System Instructions)

| Feature | Path | Status |
|---------|------|--------|
| Global rule | `~/.open-antigravity/GEMINI.md` | ✅ RulesLoader.ts |
| Workspace rules | `.open-antigravity/rules/` | ✅ RulesLoader.ts |

### Security / Policies

| Policy | Modes | Status |
|--------|-------|--------|
| Terminal | Off / Auto / Turbo | ✅ security/policyPresets.ts |
| Review | Always Proceed / Agent Decides / Request Review | ✅ security/policyPresets.ts |
| Allow list | Positive security model | ✅ security/policyPresets.ts |
| Deny list | Negative security model | ✅ security/policyPresets.ts |
| JS execution | Always / Review / Disabled | ✅ security/policyPresets.ts |
| Browser URL allowlist | Domain restrictions | ✅ security/policyPresets.ts |
| 4 presets | Secure, Review-driven, Agent-driven, Custom | ✅ security/policyPresets.ts |
| MCP server support | Local + remote MCP servers | ✅ mcp/mcpClient.ts |

### Data Storage Paths (Antigravity conventions)

| Purpose | Path |
|---------|------|
| Global rule | `~/.gemini/GEMINI.md` |
| Global workflows | `~/.gemini/antigravity/global_workflows/<name>.md` |
| Global skills | `~/.gemini/antigravity/skills/` |
| Workspace rules | `<workspace>/.agent/rules/` |
| Workspace workflows | `<workspace>/.agent/workflows/` |
| Workspace skills | `<workspace>/.agent/skills/` |
| MCP config | `$HOME/.gemini/antigravity/mcp_config.json` |
| Browser allowlist | `$HOME/.gemini/antigravity/browserAllowlist.txt` |
| Our artifacts | `<workspace>/.open-antigravity/artifacts.json` |

### Remote

- Origin: `https://github.com/devchon2/open-antigravity` (never push to `ishandutta2007`)

### Screenshots

`.screenshots/` contains 35+ reference screenshots from Google Antigravity's official codelab and Medium tutorial. Use these for UI reference but never commit new ones without the user's intent.
