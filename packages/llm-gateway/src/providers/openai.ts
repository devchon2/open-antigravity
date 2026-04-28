import OpenAI from 'openai';
import type { LLMProvider } from './types.js';
import type { ChatMessage, StreamChunk } from '@open-antigravity/shared';
import { providerKeys } from '../config.js';

export const openaiProvider: LLMProvider = {
  name: 'OpenAI',
  providerId: 'openai',

  isAvailable(): boolean { return !!providerKeys.openai.apiKey; },

  listModels(): string[] { return ['gpt-4.1', 'gpt-4o', 'gpt-4o-mini', 'o3-mini']; },

  async *chat(model: string, messages: ChatMessage[], options?: { system?: string; maxTokens?: number; temperature?: number }): AsyncIterable<StreamChunk> {
    const client = new OpenAI({ apiKey: providerKeys.openai.apiKey, baseURL: providerKeys.openai.baseUrl });
    const oaiMsgs: any[] = [];
    if (options?.system) oaiMsgs.push({ role: 'system', content: options.system });
    for (const m of messages) {
      if (m.role === 'system') continue;
      oaiMsgs.push({ role: m.role, content: typeof m.content === 'string' ? m.content : '' });
    }
    const stream = await client.chat.completions.create({
      model, messages: oaiMsgs, stream: true, max_tokens: options?.maxTokens, temperature: options?.temperature,
    });
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) yield { type: 'text' as const, content };
    }
    yield { type: 'done' as const };
  },
};
