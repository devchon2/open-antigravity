/*---------------------------------------------------------------------------------------------
 *  Open-Antigravity LLM Router — Embedded in the IDE
 *  Calls OpenAI, Anthropic, Google, and Ollama APIs directly from the IDE process.
 *  No separate gateway service needed. Reads API keys from environment or config.
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

export class LLMRouter {
  private apiKeys: Record<string, string> = {};

  constructor() {
    // Read API keys from environment (set by IDE or .env)
    this.apiKeys = {
      openai: process.env.OPENAI_API_KEY || '',
      anthropic: process.env.ANTHROPIC_API_KEY || '',
      google: process.env.GOOGLE_API_KEY || '',
    };
  }

  /** List available models based on configured API keys */
  listModels(): ModelInfo[] {
    const models: ModelInfo[] = [];
    if (this.apiKeys.openai) {
      models.push(
        { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', available: true },
        { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', available: true },
        { id: 'gpt-4.1', name: 'GPT-4.1', provider: 'OpenAI', available: true },
        { id: 'o3-mini', name: 'o3-mini', provider: 'OpenAI', available: true },
      );
    }
    if (this.apiKeys.anthropic) {
      models.push(
        { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', provider: 'Anthropic', available: true },
        { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', provider: 'Anthropic', available: true },
        { id: 'claude-haiku-3-5', name: 'Claude Haiku 3.5', provider: 'Anthropic', available: true },
      );
    }
    if (this.apiKeys.google) {
      models.push(
        { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', provider: 'Google', available: true },
        { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', available: true },
      );
    }
    // Ollama is always available if running locally
    models.push(
      { id: 'ollama/llama3', name: 'Llama 3 (Ollama)', provider: 'Ollama', available: true },
      { id: 'ollama/codellama', name: 'Code Llama (Ollama)', provider: 'Ollama', available: true },
      { id: 'ollama/mistral', name: 'Mistral (Ollama)', provider: 'Ollama', available: true },
    );
    return models;
  }

  /** Stream a chat completion directly from the provider */
  async *streamChat(
    model: string,
    messages: ChatMessage[],
    systemPrompt?: string,
    maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    const provider = this.getProvider(model);

    switch (provider) {
      case 'openai':
        yield* this.streamOpenAI(model, messages, systemPrompt, maxTokens);
        return;
      case 'anthropic':
        yield* this.streamAnthropic(model, messages, systemPrompt, maxTokens);
        return;
      case 'google':
        yield* this.streamGoogle(model, messages, systemPrompt, maxTokens);
        return;
      case 'ollama':
      default:
        yield* this.streamOllama(model, messages, systemPrompt, maxTokens);
        return;
    }
  }

  private getProvider(model: string): string {
    if (model.startsWith('gpt-') || model.startsWith('o')) return 'openai';
    if (model.startsWith('claude-')) return 'anthropic';
    if (model.startsWith('gemini-')) return 'google';
    if (model.startsWith('ollama/')) return 'ollama';
    // Default: use ollama for unknown models
    return 'ollama';
  }

  private async *streamOpenAI(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKeys.openai}` },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages.map((m) => ({ role: m.role, content: m.content, name: m.tool_call_id ? undefined : undefined })),
        ],
        stream: true,
        max_tokens: maxTokens || 4096,
      }),
    });
    if (!resp.ok) throw new Error(`OpenAI error ${resp.status}`);
    yield* this.parseSSEStream(resp);
  }

  private async *streamAnthropic(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    let systemPrompt = system || '';
    const msgs: Array<{ role: string; content: string }> = [];
    for (const m of messages) {
      if (m.role === 'system') { systemPrompt += (typeof m.content === 'string' ? m.content : '') + '\n'; continue; }
      msgs.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: typeof m.content === 'string' ? m.content : '' });
    }
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': this.apiKeys.anthropic, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model,
        system: systemPrompt || undefined,
        messages: msgs,
        max_tokens: maxTokens || 8192,
        stream: true,
      }),
    });
    if (!resp.ok) throw new Error(`Anthropic error ${resp.status}`);
    yield* this.parseSSEStream(resp);
  }

  private async *streamGoogle(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: typeof m.content === 'string' ? m.content : '' }],
      }));
    const body: Record<string, unknown> = {
      contents,
      generationConfig: { maxOutputTokens: maxTokens || 8192, temperature: 0.3 },
    };
    if (system) body.systemInstruction = { parts: [{ text: system }] };

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${this.apiKeys.google}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    );
    if (!resp.ok) throw new Error(`Google error ${resp.status}`);
    yield* this.parseSSEStream(resp);
  }

  private async *streamOllama(
    model: string, messages: ChatMessage[], system?: string, maxTokens?: number,
  ): AsyncIterable<StreamChunk> {
    const modelName = model.replace('ollama/', '');
    const resp = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [
          ...(system ? [{ role: 'system', content: system }] : []),
          ...messages.map((m) => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '' })),
        ],
        stream: true,
        options: { num_predict: maxTokens || 4096 },
      }),
    });
    if (!resp.ok) throw new Error(`Ollama error ${resp.status}`);

    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No body');
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const l of lines) {
        if (!l.trim()) continue;
        try {
          const chunk = JSON.parse(l);
          if (chunk.message?.content) yield { type: 'text', content: chunk.message.content };
          if (chunk.done) yield { type: 'done' };
        } catch {}
      }
    }
    yield { type: 'done' };
  }

  private async *parseSSEStream(resp: Response): AsyncIterable<StreamChunk> {
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No body');
    const dec = new TextDecoder();
    let buf = '';
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop() || '';
      for (const l of lines) {
        if (!l.startsWith('data: ')) continue;
        const d = l.slice(6).trim();
        if (!d || d === '[DONE]') continue;
        try {
          const chunk = JSON.parse(d);
          // OpenAI format
          if (chunk.choices?.[0]?.delta?.content) yield { type: 'text', content: chunk.choices[0].delta.content };
          if (chunk.choices?.[0]?.delta?.tool_calls) {
            for (const tc of chunk.choices[0].delta.tool_calls) {
              if (tc.function?.name) yield { type: 'tool_call', toolCall: { id: tc.id || '', type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments || '{}' } } };
            }
          }
          // Anthropic SSE format
          if (chunk.type === 'content_block_delta' && chunk.delta?.text) yield { type: 'text', content: chunk.delta.text };
          // Google SSE format
          if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) yield { type: 'text', content: chunk.candidates[0].content.parts[0].text };
          if (chunk.choices?.[0]?.finish_reason || chunk.type === 'message_stop') yield { type: 'done' };
        } catch {}
      }
    }
    yield { type: 'done' };
  }
}

// Singleton instance — one router for the entire IDE
export const llmRouter = new LLMRouter();
