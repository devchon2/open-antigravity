# Open-Antigravity: Design Document

## Overview

Open-Antigravity is a faithful open-source clone of Google's Antigravity agentic IDE. It transforms VSCodium (the MIT-licensed VS Code build) by modifying its source code directly — the same approach Google uses for Antigravity.

## How Antigravity Works (Research Findings)

Based on analysis of Google's official codelab, documentation, and the Medium tutorial "Getting Started with Google Antigravity."

### Core Architecture

Antigravity forks the open-source VS Code foundation and splits the experience into two primary windows:

- **Agent Manager** — "Mission Control" dashboard for spawning, monitoring, and interacting with multiple agents asynchronously. Treats the developer as a manager orchestrating digital workers.
- **Editor** — Traditional VS Code editor augmented with AI awareness (agent side panel, inline commands, autocomplete).

Navigation: `Cmd+E` toggles between views. `Cmd+L` opens the agent side panel in the Editor. `Cmd+I` triggers inline natural language commands.

### Agent Lifecycle

Each user request spawns a dedicated agent instance:

1. **Plan** — Agent produces artifacts (Task List, Implementation Plan). In Planning mode, these are created before any code execution.
2. **Execute** — Agent runs tools (file I/O, terminal, browser). Each write/execute requires human approval (QuickPick: Approve/Reject/Approve all).
3. **Verify** — Agent runs tests, captures screenshots, records browser sessions.
4. **Present** — Agent produces a Walkthrough artifact summarizing all changes. User reviews with Google Docs-style comments.

Agents run in parallel — "a developer can dispatch five different agents to work on five different bugs simultaneously."

### Two Execution Modes

- **Planning mode** — Agent organizes work in task groups, produces artifacts, researches before executing. For complex tasks.
- **Fast mode** — Agent executes directly without planning. For simple tasks (rename, bash commands). Controls the "thinking budget."

### Artifact System (The "Trust Gap" Solution)

Artifacts close the gap between agent claims and verified results:

| Artifact | When | Purpose |
|----------|------|---------|
| Task List | Before coding | Structured plan, editable via comments |
| Implementation Plan | Before coding | Technical architecture of changes |
| Walkthrough | After coding | Summary + testing instructions |
| Code Diffs | During coding | Reviewable inline diff with Accept/Reject |
| Screenshots | After UI changes | Visual verification before/after |
| Browser Recordings | After dynamic interactions | Video of agent's browser session |

Interaction: Google Docs-style comments on any artifact. User selects an action, provides a command, submits — the agent ingests and iterates.

### Skills System (Progressive Disclosure)

Skills solve "tool bloat" — loading everything into context causes higher costs, latency, and confusion.

**How it works:**
1. At startup, the agent scans `.agent/skills/<name>/SKILL.md` files
2. Only **metadata** (name, description) is loaded
3. When a user request matches a skill's description (keyword matching), the full instructions are loaded
4. Skills can optionally include `scripts/`, `references/`, and `assets/` directories

**SKILL.md format:**
```yaml
---
name: code-review
description: Reviews code changes for bugs, style issues, and best practices.
---
# Instructions
1. Check correctness...
```

**Scopes:**
- Global: `~/.gemini/antigravity/skills/` — all projects
- Workspace: `<workspace>/.agent/skills/` — project-specific

### Rules & Workflows

**Rules** — Always-on system instructions. Like a constitution for the agent.
- Global: `~/.gemini/GEMINI.md`
- Workspace: `<workspace>/.agent/rules/`

**Workflows** — Saved prompts triggered via `/command` in chat.
- Global: `~/.gemini/antigravity/global_workflows/<name>.md`
- Workspace: `<workspace>/.agent/workflows/<name>.md`

### Browser Subagent

A key differentiator. When the main agent needs browser interaction:
- Invokes a **separate model** specialized for browser operations (not the main model)
- Tools: click, scroll, type, read console logs, DOM capture, screenshots, markdown parsing, video recording
- Requires a Chrome extension to be installed
- Shows a **blue border** around the page indicating agent control
- Browser URL Allowlist restricts which sites the agent can visit

### Security / Policies

| Policy | Modes | Purpose |
|--------|-------|---------|
| Terminal Execution | Off / Auto / Turbo | Controls shell command autonomy |
| Review | Always Proceed / Agent Decides / Request Review | When agent asks for artifact review |
| JavaScript Execution | Always / Request Review / Disabled | Browser JS execution |
| Browser URL Allowlist | Per-domain | Mitigates prompt injection from compromised sites |

**Allow List** (positive security): Everything forbidden unless explicitly listed. Used with Off mode.
**Deny List** (negative security): Everything allowed unless explicitly listed. Used with Turbo mode.

**4 Presets:** Secure Mode, Review-Driven Development (recommended), Agent-Driven Development, Custom.

### MCP (Model Context Protocol) Integration

- MCP Store with pre-configured servers (Firebase, GitHub Copilot, etc.)
- Local and remote MCP server support
- Individual tool toggling per server
- Config: `$HOME/.gemini/antigravity/mcp_config.json`

### Data Storage Paths

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

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+L` | Toggle agent side panel |
| `Cmd+I` | Inline command (editor or terminal) |
| `Cmd+E` | Toggle Editor ↔ Agent Manager |
| `Ctrl+`` | Toggle terminal panel |
| `Tab` | Accept autocomplete / import / jump |
| `Cmd+,` | Settings |

## Our Implementation

### Architecture

We fork VSCodium (not VS Code) because it's MIT-licensed without Microsoft branding/telemetry. The agent system is integrated directly into `src/vs/workbench/contrib/open-antigravity/` — the same location pattern Google uses for Antigravity in VS Code's workbench.

```
vscodium/
├── open-antigravity-src/vs/workbench/contrib/open-antigravity/
│   ├── contribution.ts     # DI lifecycle (LifecyclePhase.Restored)
│   ├── agent/                          # AgentEngine, AgentManager, SkillLoader, WorkflowLoader
│   ├── tools/                          # 7 tools (file, terminal, search, browser)
│   ├── artifacts/                      # ArtifactStore (CRUD + persistence)
│   ├── gateway/                        # SSE client to LLM Gateway
│   └── browser/                        # Playwright subagent (blue border)
├── get_repo.sh                         # Clone VSCodium build scripts
├── prepare_vscode.sh                   # Inject source + patch build + branding
├── build.sh                            # Full desktop IDE build
└── product.json                        # App name, icons, data folders
```

### LLM Gateway (Standalone Backend)

```
packages/llm-gateway/
├── providers/          # OpenAI, Anthropic, Google, Ollama (each implements LLMProvider)
├── routes/             # /api/health, /api/models, /api/chat (SSE streaming)
├── middleware/         # Auth (Bearer token, localhost bypass), error handling
└── utils/              # SSE format, cost estimation
```

### Implementation Status

See CLAUDE.md for the complete feature parity table (51 features tracked).

## Build Prerequisites

- Node.js 20+, Python 3.11, Rustup, jq, git
- Platform: gcc/g++/make (Linux), Xcode (macOS), Git Bash (Windows)
- Full details: https://github.com/VSCodium/vscodium/blob/master/docs/howto-build.md

## References

- [Google Antigravity Official Site](https://antigravity.google/)
- [Google Antigravity Codelab](https://codelabs.developers.google.com/getting-started-google-antigravity)
- [Medium Tutorial](https://medium.com/google-cloud/tutorial-getting-started-with-google-antigravity-b5cc74c103c2)
- [VSCodium Build Docs](https://github.com/VSCodium/vscodium/blob/master/docs/howto-build.md)
