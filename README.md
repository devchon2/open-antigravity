# Open-Antigravity

Open-source, agent-first IDE — a VSCodium fork with AI agent built directly into the workbench.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│  Open-Antigravity IDE (VSCodium fork)                │
│  src/vs/workbench/contrib/antigravity/               │
│  ├── AgentEngine     (Plan → Approve → Execute)      │
│  ├── Tools (7)       (file, terminal, search, browser)│
│  ├── ArtifactStore   (plans, diffs, screenshots)     │
│  ├── SkillLoader     (SKILL.md progressive disclosure)│
│  ├── WorkflowLoader  (/command saved prompts)         │
│  ├── AgentManager    (multi-agent spawn/monitor)      │
│  ├── BrowserAgent    (Playwright + blue border)       │
│  └── GatewayClient   (SSE streaming)                  │
└──────────────────────┬───────────────────────────────┘
                       │ HTTP SSE
┌──────────────────────▼───────────────────────────────┐
│  LLM Gateway (Fastify)                               │
│  OpenAI | Anthropic | Google | Ollama (local)         │
└──────────────────────────────────────────────────────┘
```

## Quick Start

### 1. LLM Gateway

```bash
cp .env.example .env       # Add API keys
npm install
npm run dev:gateway        # Starts on http://localhost:4001
```

Verify:
```bash
curl http://localhost:4001/api/health
# → {"status":"ok","version":"0.1.0","providers":["ollama"]}

curl http://localhost:4001/api/models
# → {"models":[...]}
```

### 2. Build the full IDE

```bash
cd vscodium
./get_repo.sh              # Clone VSCodium source
./prepare_vscode.sh        # Inject antigravity into workbench
./build.sh                 # Build Open-Antigravity IDE
```

This transforms VSCodium into Open-Antigravity by directly modifying the source code — no extension layer.

### 3. Web Dashboard (Mission Control)

```bash
cd packages/dashboard
npm install
npm run dev                # Starts on http://localhost:3000
```

## Key Features

| Feature | Description |
|---------|-------------|
| **Dual-window** | Editor (VS Code) + Agent Manager (Mission Control) |
| **Agent-first** | Plan → Approve → Execute → Verify loop with diff generation |
| **Multi-model** | OpenAI, Anthropic, Google, Ollama — unified API |
| **Artifacts** | Task lists, plans, diffs, screenshots, walkthroughs |
| **Progressive Disclosure** | Skills (SKILL.md) loaded only when matched |
| **Workflows** | Saved prompts triggered via /command |
| **Multi-agent** | Spawn coder, tester, reviewer agents in parallel |
| **Browser Subagent** | Playwright with blue border (Antigravity UX) |
| **Approval System** | Human-in-the-loop for file writes and terminal commands |
| **Checkpoints** | Git stash snapshots for undo |

## Project Structure

```
open-antigravity/
├── vscodium/                              # VSCodium fork (the IDE)
│   ├── antigravity-src/                   # Workbench source (copied into VSCodium)
│   ├── get_repo.sh / prepare_vscode.sh    # Setup scripts
│   ├── build.sh                           # Full IDE build
│   └── product.json                       # Branding config
├── packages/
│   ├── shared/          # Types, Zod schemas, prompts
│   ├── llm-gateway/     # Fastify backend (port 4001)
│   └── dashboard/       # Mission Control (Next.js, port 3000)
├── .screenshots/        # Antigravity reference screenshots
├── .env.example         # API key configuration
└── mitmserver/          # Original MITM proxy (legacy)
```

## Requirements

- Node.js 20+
- Git
- Optional: Ollama (for local models), Playwright (for browser agent)

## License

MIT — see [LICENSE](./LICENSE)
