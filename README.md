# Open-Antigravity

Open-source clone of Google's Antigravity agentic IDE.
**Built by modifying VSCodium at the source level** — not an extension, not a web app.
Produces a native desktop application (Windows, macOS, Linux).

## What It Is

Open-Antigravity transforms the VSCodium open-source codebase (itself built from Microsoft's VS Code) into an agent-first IDE. The AI agent system lives directly in `src/vs/workbench/contrib/antigravity/` inside the VS Code workbench — the same approach Google uses for Antigravity.

```
┌──────────────────────────────────────────────────────────┐
│  Open-Antigravity Desktop IDE (native app)               │
│  Built from VSCodium source + antigravity workbench code │
│  Output: .exe (Windows) / .app (macOS) / .AppImage (Linux)│
│                                                          │
│  src/vs/workbench/contrib/antigravity/                   │
│  ├── AgentEngine   (Plan → Approve → Execute → Verify)   │
│  ├── Tools (7)     (file, terminal, search, browser)     │
│  ├── ArtifactStore (plans, diffs, screenshots)           │
│  ├── SkillLoader   (SKILL.md progressive disclosure)     │
│  ├── WorkflowLoader (/command saved prompts)             │
│  ├── AgentManager  (multi-agent spawn/monitor)           │
│  └── BrowserAgent  (Playwright + blue border)            │
└───────────────────┬──────────────────────────────────────┘
                    │ HTTP SSE
┌───────────────────▼──────────────────────────────────────┐
│  LLM Gateway (standalone Fastify backend)                │
│  OpenAI | Anthropic | Google | Ollama (local models)     │
└──────────────────────────────────────────────────────────┘
```

## Building the Desktop IDE

### Prerequisites
- **node** (see `.nvmrc` in vscodium), **python 3.11**, **rustup**, **jq**, **git**
- Platform build tools: **gcc/g++/make** (Linux), **Xcode** (macOS), or **Git Bash** (Windows)
- Full list: [VSCodium build docs](https://github.com/VSCodium/vscodium/blob/master/docs/howto-build.md)

### Build

```bash
cd vscodium
./get_repo.sh          # Clone VSCodium build scripts
./prepare_vscode.sh    # Inject antigravity source + branding
./build.sh             # Build the desktop IDE (10-30 min)
```

This produces a native desktop application:
- **Windows**: `VSCode/` directory, run `.\bin\codium.cmd`
- **macOS**: `VSCodium.app`
- **Linux**: `./bin/codium`

For distribution packages: `cd vscodium/vscodium && bash dev/build.sh -p`
(produces `.exe` installer, `.dmg`, `.AppImage`, `.deb`, `.rpm`)

## Running the LLM Gateway

The gateway is a standalone service required by the IDE for LLM access:

```bash
cp .env.example .env       # Add API keys (OpenAI, Anthropic, Google)
npm install
npm run dev:gateway        # Starts on http://localhost:4001
```

Verify: `curl http://localhost:4001/api/health`

## Optional: Web Dashboard

A Mission Control companion web UI (Next.js, port 3000):

```bash
cd packages/dashboard
npm install && npm run dev
```

## Project Structure

```
open-antigravity/
├── vscodium/                              # IDE build (VSCodium transformation)
│   ├── antigravity-src/                   # Workbench source (copied into VSCodium)
│   ├── get_repo.sh                        # Clone VSCodium build scripts
│   ├── prepare_vscode.sh                  # Inject antigravity + patch build
│   ├── build.sh                           # Full desktop IDE build
│   └── product.json                       # Branding (app name, icons, dirs)
├── packages/
│   ├── shared/          # Types, Zod schemas, prompts (shared gateway ↔ IDE)
│   ├── llm-gateway/     # Fastify backend (required service)
│   └── dashboard/       # Optional Mission Control web UI
├── .screenshots/        # 35+ Antigravity reference screenshots
└── mitmserver/          # Original MITM proxy (legacy)
```

## Key Design Decisions

- **Not an extension.** The agent code lives in `src/vs/workbench/contrib/antigravity/` inside the VS Code source tree — registered via `IWorkbenchContributionsRegistry` at `LifecyclePhase.Restored`. This is how Antigravity itself works.
- **VSCodium, not VS Code.** VSCodium is the MIT-licensed build of VS Code without Microsoft branding/telemetry. We modify it the same way Antigravity modifies VS Code.
- **SSE streaming.** The gateway communicates with the IDE via Server-Sent Events over HTTP (no WebSocket needed).
- **Progressive disclosure.** Skills (`.antigravity/skills/<name>/SKILL.md`) are loaded only when the user's request matches their description — avoiding context bloat.

## License

MIT — see [LICENSE](./LICENSE)
