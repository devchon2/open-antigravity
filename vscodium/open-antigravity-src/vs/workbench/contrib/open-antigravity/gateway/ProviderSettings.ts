/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity Provider Settings
 *  IDE-integrated LLM provider manager.
 *  Best practices from Cursor, Cline, Windsurf, Antigravity:
 *  1. API keys stored in VS Code SecretStorage (not plain .env)
 *  2. Model selector dropdown with provider grouping
 *  3. Provider status indicators (green=connected, gray=disabled, red=error)
 *  4. Hot-reload: adding key = models immediately available
 *  5. Fallback logic: primary fails → next available
 *  6. Cost estimation shown in status bar
 *--------------------------------------------------------------------------------------------*/

import { ISecretStorageService } from '../../../../../platform/secrets/common/secrets.js';
import { llmRouter, type ModelInfo } from './LLMRouter.js';

export interface ProviderStatus {
  id: string;
  name: string;
  configured: boolean;
  modelsAvailable: number;
  lastChecked: string | null;
  error: string | null;
}

export class ProviderSettings {
  private secretStorage: ISecretStorageService;
  private statuses: Map<string, ProviderStatus> = new Map();

  // Provider metadata
  static readonly PROVIDERS = [
    { id: 'openai', name: 'OpenAI', keyEnv: 'OPENAI_API_KEY', models: ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3-mini'] },
    { id: 'anthropic', name: 'Anthropic', keyEnv: 'ANTHROPIC_API_KEY', models: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-haiku-3-5'] },
    { id: 'google', name: 'Google', keyEnv: 'GOOGLE_API_KEY', models: ['gemini-2.5-pro', 'gemini-2.5-flash'] },
    { id: 'openrouter', name: 'OpenRouter', keyEnv: 'OPENROUTER_API_KEY', models: ['200+ via unified API'] },
    { id: 'mistral', name: 'Mistral', keyEnv: 'MISTRAL_API_KEY', models: ['mistral-large', 'mistral-small', 'codestral'] },
    { id: 'deepseek', name: 'DeepSeek', keyEnv: 'DEEPSEEK_API_KEY', models: ['deepseek-chat', 'deepseek-coder'] },
    { id: 'xai', name: 'xAI (Grok)', keyEnv: 'XAI_API_KEY', models: ['grok-3', 'grok-3-mini'] },
    { id: 'groq', name: 'Groq', keyEnv: 'GROQ_API_KEY', models: ['llama-3.3-70b', 'mixtral-8x7b'] },
    { id: 'together', name: 'Together AI', keyEnv: 'TOGETHER_API_KEY', models: ['llama-3.3-70b', 'mixtral-8x22b'] },
    { id: 'fireworks', name: 'Fireworks', keyEnv: 'FIREWORKS_API_KEY', models: ['mixtral-8x7b', 'llama-3.1-405b'] },
    { id: 'cohere', name: 'Cohere', keyEnv: 'COHERE_API_KEY', models: ['command-r-plus', 'command-r'] },
    { id: 'perplexity', name: 'Perplexity', keyEnv: 'PERPLEXITY_API_KEY', models: ['sonar-pro', 'sonar'] },
    { id: 'ollama', name: 'Ollama (Local)', keyEnv: '', models: ['auto-detected'] },
    { id: 'lmstudio', name: 'LM Studio (Local)', keyEnv: '', models: ['auto-detected'] },
  ];

  constructor(@ISecretStorageService secretStorage: ISecretStorageService) {
    this.secretStorage = secretStorage;
  }

  /** Initialize: check which providers are configured */
  async initialize(): Promise<void> {
    for (const p of ProviderSettings.PROVIDERS) {
      const hasKey = p.id === 'ollama' || p.id === 'lmstudio' ? true :
        !!(await this.getApiKey(p.id)) || !!process.env[p.keyEnv];
      this.statuses.set(p.id, {
        id: p.id, name: p.name, configured: hasKey,
        modelsAvailable: hasKey ? (typeof p.models[0] === 'string' && p.models[0].includes('+') ? 200 : p.models.length) : 0,
        lastChecked: new Date().toISOString(), error: null,
      });
    }
  }

  /** Get all provider statuses (for settings UI) */
  getStatuses(): ProviderStatus[] {
    return Array.from(this.statuses.values());
  }

  /** Get configured models grouped by provider (for model selector) */
  getModelSelectorData(): Array<{ provider: string; models: ModelInfo[] }> {
    const models = llmRouter.listModels();
    const grouped: Record<string, ModelInfo[]> = {};
    for (const m of models) {
      if (!grouped[m.provider]) grouped[m.provider] = [];
      grouped[m.provider].push(m);
    }
    return Object.entries(grouped).map(([provider, models]) => ({ provider, models }));
  }

  /** Store API key securely */
  async setApiKey(providerId: string, key: string): Promise<void> {
    await this.secretStorage.set(`open-antigravity.provider.${providerId}`, key);
    // Update environment for LLMRouter
    const p = ProviderSettings.PROVIDERS.find((x) => x.id === providerId);
    if (p?.keyEnv) process.env[p.keyEnv] = key;
    // Refresh status
    await this.initialize();
  }

  /** Retrieve API key from secure storage or environment */
  async getApiKey(providerId: string): Promise<string | undefined> {
    const stored = await this.secretStorage.get(`open-antigravity.provider.${providerId}`);
    if (stored) return stored;
    const p = ProviderSettings.PROVIDERS.find((x) => x.id === providerId);
    return p?.keyEnv ? process.env[p.keyEnv] || undefined : undefined;
  }

  /** Delete stored API key */
  async deleteApiKey(providerId: string): Promise<void> {
    await this.secretStorage.delete(`open-antigravity.provider.${providerId}`);
    await this.initialize();
  }

  /** Test a provider connection */
  async testConnection(providerId: string): Promise<boolean> {
    try {
      const key = await this.getApiKey(providerId);
      if (!key && providerId !== 'ollama' && providerId !== 'lmstudio') return false;

      // Send a minimal test request
      const model = providerId === 'openai' ? 'gpt-4o-mini' :
        providerId === 'anthropic' ? 'claude-haiku-3-5' :
        providerId === 'google' ? 'gemini-2.5-flash' : 'test';

      for await (const chunk of llmRouter.streamChat(model, [{ role: 'user', content: 'test' }], undefined, 10)) {
        if (chunk.type === 'text') return true;
      }
      return true;
    } catch {
      return false;
    }
  }

  /** Get provider info HTML for the settings webview */
  getSettingsHtml(): string {
    const statuses = this.getStatuses();
    const rows = statuses.map((s) => `
      <tr>
        <td style="padding:4px 8px">${s.configured ? '🟢' : '⚫'} ${s.name}</td>
        <td style="padding:4px 8px">${s.modelsAvailable} models</td>
        <td style="padding:4px 8px">
          <input type="password" id="key-${s.id}" placeholder="${s.configured ? '••••••••' : 'API key'}" style="background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-panel-border);padding:2px 6px;width:200px;">
        </td>
        <td style="padding:4px 8px">
          <button onclick="saveKey('${s.id}')" style="background:var(--vscode-button-background);color:var(--vscode-button-foreground);border:none;padding:2px 8px;cursor:pointer;">Save</button>
          <button onclick="testKey('${s.id}')" style="background:transparent;color:var(--vscode-textLink-foreground);border:1px solid var(--vscode-panel-border);padding:2px 8px;cursor:pointer;">Test</button>
        </td>
      </tr>`).join('');

    return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
      body{font-family:var(--vscode-font-family);font-size:13px;background:var(--vscode-editor-background);color:var(--vscode-editor-foreground);padding:20px;}
      table{border-collapse:collapse;width:100%;}
      th{text-align:left;padding:4px 8px;font-size:11px;text-transform:uppercase;opacity:0.6;}
    </style></head><body>
      <h2>LLM Provider Settings</h2>
      <p style="opacity:0.6;margin-bottom:16px;">Configure API keys for each provider. Keys are stored securely in the system keychain.</p>
      <table>${rows}</table>
      <script>
        const vscode = acquireVsCodeApi();
        function saveKey(id) { vscode.postMessage({command:'saveKey', id, key:document.getElementById('key-'+id).value}); }
        function testKey(id) { vscode.postMessage({command:'testKey', id}); }
        window.addEventListener('message', e => { if(e.data.command==='testResult') alert(e.data.ok ? '✅ Connected' : '❌ Failed'); });
      </script>
    </body></html>`;
  }
}
