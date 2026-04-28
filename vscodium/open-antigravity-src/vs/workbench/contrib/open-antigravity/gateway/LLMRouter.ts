/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity LLM Router — Embedded in the IDE
 *  12 providers, 40+ models. Calls APIs directly from the IDE process.
 *  No separate gateway service needed. API keys from environment or IDE config.
 *--------------------------------------------------------------------------------------------*/

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_call_id?: string;
  tool_calls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: { id: string; type: 'function'; function: { name: string; arguments: string } };
}

export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  available: boolean;
}

type Provider = 'openai' | 'anthropic' | 'google' | 'ollama' | 'openrouter' |
  'mistral' | 'deepseek' | 'xai' | 'groq' | 'together' | 'fireworks' | 'cohere' | 'perplexity' | 'lmstudio' | 'azure';

export class LLMRouter {
  private apiKeys: Record<string, string> = {};
  private baseUrls: Record<string, string> = {};

  constructor() {
    this.apiKeys = {
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
      openrouter: process.env.OPENROUTER_API_KEY || '',
      mistral: process.env.MISTRAL_API_KEY || '',
      deepseek: process.env.DEEPSEEK_API_KEY || '',
      xai: process.env.XAI_API_KEY || '',
      groq: process.env.GROQ_API_KEY || '',
      together: process.env.TOGETHER_API_KEY || '',
      fireworks: process.env.FIREWORKS_API_KEY || '',
      cohere: process.env.COHERE_API_KEY || '',
      perplexity: process.env.PERPLEXITY_API_KEY || '',
    };
    this.baseUrls = {
      openai: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      azure: process.env.AZURE_OPENAI_ENDPOINT || '',
      ollama: process.env.OLLAMA_HOST || 'http://localhost:11434',
      lmstudio: process.env.LMSTUDIO_HOST || 'http://localhost:1234',
    };
  }

  /** List all available models based on configured API keys */
  listModels(): ModelInfo[] {
    const m = (id: string, name: string, provider: string, key: string) =>
      ({ id, name, provider, available: !!this.apiKeys[key] || provider === 'Ollama' || provider === 'LM Studio' });

    const models: ModelInfo[] = [
      // OpenAI
      m('gpt-4.1', 'GPT-4.1', 'OpenAI', 'openai'),
      m('gpt-4o', 'GPT-4o', 'OpenAI', 'openai'),
      m('gpt-4o-mini', 'GPT-4o Mini', 'OpenAI', 'openai'),
      m('o3-mini', 'o3-mini', 'OpenAI', 'openai'),
      // Anthropic
      m('claude-opus-4-20250514', 'Claude Opus 4', 'Anthropic', 'anthropic'),
      m('claude-sonnet-4-20250514', 'Claude Sonnet 4', 'Anthropic', 'anthropic'),
      m('claude-haiku-3-5', 'Claude Haiku 3.5', 'Anthropic', 'anthropic'),
      // Google
      m('gemini-2.5-pro', 'Gemini 2.5 Pro', 'Google', 'google'),
      m('gemini-2.5-flash', 'Gemini 2.5 Flash', 'Google', 'google'),
      // Mistral
      m('mistral/mistral-large', 'Mistral Large', 'Mistral', 'mistral'),
      m('mistral/mistral-small', 'Mistral Small', 'Mistral', 'mistral'),
      m('mistral/codestral', 'Codestral', 'Mistral', 'mistral'),
      // DeepSeek
      m('deepseek/deepseek-chat', 'DeepSeek Chat', 'DeepSeek', 'deepseek'),
      m('deepseek/deepseek-coder', 'DeepSeek Coder', 'DeepSeek', 'deepseek'),
      // xAI
      m('xai/grok-3', 'Grok 3', 'xAI', 'xai'),
      m('xai/grok-3-mini', 'Grok 3 Mini', 'xAI', 'xai'),
      // Groq (fast inference)
      m('groq/llama-3.3-70b', 'Llama 3.3 70B (Groq)', 'Groq', 'groq'),
      m('groq/mixtral-8x7b', 'Mixtral 8x7B (Groq)', 'Groq', 'groq'),
      m('groq/deepseek-r1-distill-llama-70b', 'DeepSeek R1 Distill (Groq)', 'Groq', 'groq'),
      // Together AI
      m('together/llama-3.3-70b', 'Llama 3.3 70B (Together)', 'Together', 'together'),
      m('together/mixtral-8x22b', 'Mixtral 8x22B (Together)', 'Together', 'together'),
      m('together/deepseek-coder-v2', 'DeepSeek Coder V2 (Together)', 'Together', 'together'),
      // Fireworks
      m('fireworks/mixtral-8x7b', 'Mixtral 8x7B (Fireworks)', 'Fireworks', 'fireworks'),
      m('fireworks/llama-3.1-405b', 'Llama 3.1 405B (Fireworks)', 'Fireworks', 'fireworks'),
      // Cohere
      m('cohere/command-r-plus', 'Command R+', 'Cohere', 'cohere'),
      m('cohere/command-r', 'Command R', 'Cohere', 'cohere'),
      // Perplexity
      m('perplexity/sonar-pro', 'Sonar Pro', 'Perplexity', 'perplexity'),
      m('perplexity/sonar', 'Sonar', 'Perplexity', 'perplexity'),
      // OpenRouter (200+ models via single API)
      m('openrouter/anthropic/claude-sonnet-4', 'Claude Sonnet 4 (OpenRouter)', 'OpenRouter', 'openrouter'),
      m('openrouter/openai/gpt-4.1', 'GPT-4.1 (OpenRouter)', 'OpenRouter', 'openrouter'),
      m('openrouter/google/gemini-2.5-pro', 'Gemini 2.5 Pro (OpenRouter)', 'OpenRouter', 'openrouter'),
      m('openrouter/meta-llama/llama-4-maverick', 'Llama 4 Maverick (OpenRouter)', 'OpenRouter', 'openrouter'),
      m('openrouter/deepseek/deepseek-chat', 'DeepSeek Chat (OpenRouter)', 'OpenRouter', 'openrouter'),
      m('openrouter/qwen/qwen3-235b-a22b', 'Qwen3 235B (OpenRouter)', 'OpenRouter', 'openrouter'),
      // Ollama (local)
      m('ollama/llama3', 'Llama 3 (Ollama)', 'Ollama', ''),
      m('ollama/codellama', 'Code Llama (Ollama)', 'Ollama', ''),
      m('ollama/deepseek-coder', 'DeepSeek Coder (Ollama)', 'Ollama', ''),
      m('ollama/qwen2.5-coder', 'Qwen 2.5 Coder (Ollama)', 'Ollama', ''),
      // LM Studio (local, OpenAI-compatible API)
      m('lmstudio/any', 'LM Studio (local)', 'LM Studio', ''),
    ];
    return models;
  }

  /** Stream a chat completion directly from the provider */
  async *streamChat(
    model: string, messages: ChatMessage[],
    systemPrompt?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    const provider = this.getProvider(model);
    switch (provider) {
      case 'openai': yield* this.streamOpenAICompatible(model, messages, systemPrompt, maxTokens, this.apiKeys.openai, this.baseUrls.openai); return;
      case 'azure': yield* this.streamOpenAICompatible(model, messages, systemPrompt, maxTokens, process.env.AZURE_OPENAI_KEY || '', this.baseUrls.azure); return;
      case 'anthropic': yield* this.streamAnthropic(model, messages, systemPrompt, maxTokens); return;
      case 'google': yield* this.streamGoogle(model, messages, systemPrompt, maxTokens); return;
      case 'openrouter': yield* this.streamOpenAICompatible(model, messages, systemPrompt, maxTokens, this.apiKeys.openrouter, 'https://openrouter.ai/api/v1'); return;
      case 'mistral': yield* this.streamOpenAICompatible(model, messages, systemPrompt, maxTokens, this.apiKeys.mistral, 'https://api.mistral.ai/v1'); return;
      case 'deepseek': yield* this.streamOpenAICompatible(model.replace('deepseek/', ''), messages, systemPrompt, maxTokens, this.apiKeys.deepseek, 'https://api.deepseek.com/v1'); return;
      case 'xai': yield* this.streamOpenAICompatible(model.replace('xai/', ''), messages, systemPrompt, maxTokens, this.apiKeys.xai, 'https://api.x.ai/v1'); return;
      case 'groq': yield* this.streamOpenAICompatible(model.replace('groq/', ''), messages, systemPrompt, maxTokens, this.apiKeys.groq, 'https://api.groq.com/openai/v1'); return;
      case 'together': yield* this.streamOpenAICompatible(model.replace('together/', ''), messages, systemPrompt, maxTokens, this.apiKeys.together, 'https://api.together.xyz/v1'); return;
      case 'fireworks': yield* this.streamOpenAICompatible(model.replace('fireworks/', ''), messages, systemPrompt, maxTokens, this.apiKeys.fireworks, 'https://api.fireworks.ai/inference/v1'); return;
      case 'cohere': yield* this.streamCohere(model.replace('cohere/', ''), messages, systemPrompt, maxTokens); return;
      case 'perplexity': yield* this.streamOpenAICompatible(model.replace('perplexity/', ''), messages, systemPrompt, maxTokens, this.apiKeys.perplexity, 'https://api.perplexity.ai'); return;
      case 'lmstudio': yield* this.streamOpenAICompatible('local-model', messages, systemPrompt, maxTokens, 'lmstudio', this.baseUrls.lmstudio + '/v1'); return;
      case 'ollama': default: yield* this.streamOllama(model, messages, systemPrompt, maxTokens); return;
    }
  }

  private getProvider(model: string): Provider {
    if (model.startsWith('gpt-') || model.startsWith('o1') || model.startsWith('o3')) return this.baseUrls.azure ? 'azure' : 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('gemini-')) return 'google';
    if (model.startsWith('mistral/')) return 'mistral';
    if (model.startsWith('deepseek/')) return 'deepseek';
    if (model.startsWith('xai/')) return 'xai';
    if (model.startsWith('groq/')) return 'groq';
    if (model.startsWith('together/')) return 'together';
    if (model.startsWith('fireworks/')) return 'fireworks';
    if (model.startsWith('cohere/')) return 'cohere';
    if (model.startsWith('perplexity/')) return 'perplexity';
    if (model.startsWith('openrouter/')) return 'openrouter';
    if (model.startsWith('lmstudio/')) return 'lmstudio';
    if (model.startsWith('ollama/')) return 'ollama';
    return 'ollama';
  }

  // OpenAI-compatible API (used by OpenAI, Azure, OpenRouter, Mistral, DeepSeek, xAI, Groq, Together, Fireworks, Perplexity, LM Studio)
  private async *streamOpenAICompatible(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
    apiKey?: string, baseUrl?: string,
  ): AsyncIterable<StreamChunk> {
    if (!apiKey && baseUrl?.includes('localhost')) apiKey = 'not-needed';
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(baseUrl?.includes('openrouter.ai') ? { 'HTTP-Referer': 'https://open-antigravity.dev' } : {}),
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
        max_tokens: maxTokens || 4096,
      }),
    });
    if (!resp.ok) throw new Error(`Provider error ${resp.status}: ${await resp.text().catch(() => '')}`);
    yield* this.parseSSEStream(resp);
  }

  private async *streamAnthropic(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    let sys = system || '';
    const msgs: Array<{ role: string; content: string }> = [];
    for (const m of messages) {
      if (m.role === 'system') { sys += (typeof m.content === 'string' ? m.content : '') + '\n'; continue; }
      msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: typeof m.content === 'string' ? m.content : '' });
    }
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKeys.anthropic, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model, system: sys || undefined, messages: msgs, max_tokens: maxTokens || 8192, stream: true }),
    });
    if (!resp.ok) throw new Error(`Anthropic error ${resp.status}`);
    yield* this.parseSSEStream(resp);
  }

  private async *streamGoogle(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: typeof m.content === 'string' ? m.content : '' }],
    }));
    const body: Record<string, unknown> = { contents, generationConfig: { maxOutputTokens: maxTokens || 8192 } };
    if (system) body.systemInstruction = { parts: [{ text: system }] };
    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKeys.google}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
    if (!resp.ok) throw new Error(`Google error ${resp.status}`);
    yield* this.parseSSEStream(resp);
  }

  private async *streamCohere(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    const resp = await fetch('https://api.cohere.com/v2/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKeys.cohere}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages.map((m) => ({ role: m.role === 'assistant' ? 'CHATBOT' : 'USER', message: m.content })),
        ],
        stream: true,
        max_tokens: maxTokens || 4096,
      }),
    });
    if (!resp.ok) throw new Error(`Cohere error ${resp.status}`);
    const reader = resp.body?.getReader(); if (!reader) throw new Error('No body');
    const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop() || '';
      for (const l of lines) {
        if (!l.trim()) continue;
        try {
          const chunk = JSON.parse(l);
          if (chunk.type === 'content-delta' && chunk.delta?.message?.content?.text) yield { type: 'text', content: chunk.delta.message.content.text };
          if (chunk.type === 'stream-end') yield { type: 'done' };
        } catch {}
      }
    }
    yield { type: 'done' };
  }

  private async *streamOllama(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    const modelName = model.replace('ollama/', '');
    const resp = await fetch(`${this.baseUrls.ollama}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [...(system ? [{ role: 'system', content: system }] : []), ...messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' }))],
        stream: true, options: { num_predict: maxTokens || 4096 },
      }),
    });
    if (!resp.ok) throw new Error(`Ollama error ${resp.status}`);
    const reader = resp.body?.getReader(); if (!reader) throw new Error('No body');
    const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop() || '';
      for (const l of lines) {
        if (!l.trim()) continue;
        try { const c = JSON.parse(l); if (c.message?.content) yield { type: 'text', content: c.message.content }; if (c.done) yield { type: 'done' }; } catch {}
      }
    }
    yield { type: 'done' };
  }

  private async *parseSSEStream(resp: Response): AsyncIterable<StreamChunk> {
    const reader = resp.body?.getReader(); if (!reader) throw new Error('No body');
    const dec = new TextDecoder(); let buf = '';
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n'); buf = lines.pop() || '';
      for (const l of lines) {
        if (!l.startsWith('data: ')) continue;
        const d = l.slice(6).trim(); if (!d || d === '[DONE]') continue;
        try {
          const c = JSON.parse(d);
          if (c.choices?.[0]?.delta?.content) yield { type: 'text', content: c.choices[0].delta.content };
          if (c.choices?.[0]?.delta?.tool_calls) {
            for (const tc of c.choices[0].delta.tool_calls) {
              if (tc.function?.name) yield { type: 'tool_call', toolCall: { id: tc.id || '', type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments || '{}' } } };
            }
          }
          if (c.type === 'content_block_delta' && c.delta?.text) yield { type: 'text', content: c.delta.text };
          if (c.candidates?.[0]?.content?.parts?.[0]?.text) yield { type: 'text', content: c.candidates[0].content.parts[0].text };
          if (c.choices?.[0]?.finish_reason || c.type === 'message_stop') yield { type: 'done' };
        } catch {}
      }
    }
    yield { type: 'done' };
  }
}

export const llmRouter = new LLMRouter();
