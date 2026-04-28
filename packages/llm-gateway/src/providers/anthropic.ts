import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from './types.js';
import type { ChatMessage, StreamChunk } from '@open-antigravity/shared';
import { providerKeys } from '../config.js';

export const anthropicProvider: LLMProvider = {
  name: 'Anthropic',
  providerId: 'anthropic',

  isAvailable(): boolean { return !!providerKeys.anthropic.apiKey; },

  listModels(): string[] { return ['claude-sonnet-4-6', 'claude-opus-4-7', 'claude-haiku-4-5']; },

  async *chat(model: string, messages: ChatMessage[], options?: { system?: string; maxTokens?: number; temperature?: number }): AsyncIterable<StreamChunk> {
    const client = new Anthropic({ apiKey: providerKeys.anthropic.apiKey });
    const msgs: any[] = [];
    for (const m of messages) {
      if (m.role === 'system') continue;
      msgs.push({ role: m.role as 'user' | 'assistant', content: typeof m.content === 'string' ? m.content : '' });
    }
    const stream = client.messages.stream({
      model, messages: msgs, system: options?.system, max_tokens: options?.maxTokens || 4096,
    });
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text' as const, content: event.delta.text };
      }
    }
    yield { type: 'done' as const };
  },
};
