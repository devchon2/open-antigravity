import type { LLMProvider } from './types.js';
import type { ChatMessage, StreamChunk } from '@open-antigravity/shared';
import { providerKeys } from '../config.js';

export const ollamaProvider: LLMProvider = {
  name: 'Local (Ollama)',
  providerId: 'ollama',

  isAvailable(): boolean { return true; },

  listModels(): string[] { return ['local/llama3', 'local/codellama', 'local/mistral']; },

  async *chat(model: string, messages: ChatMessage[], options?: { system?: string; maxTokens?: number; temperature?: number }): AsyncIterable<StreamChunk> {
    const modelName = model.replace('local/', '');
    const resp = await fetch(providerKeys.ollama.baseUrl + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: messages.map(function(m: any) { return { role: m.role, content: m.content }; }),
        stream: true,
      }),
    });
    if (!resp.ok) throw new Error('Ollama error ' + resp.status);
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response body');
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try { const parsed = JSON.parse(line); if (parsed.message?.content) yield { type: 'text' as const, content: parsed.message.content }; } catch (e) {}
      }
    }
    yield { type: 'done' as const };
  },
};
