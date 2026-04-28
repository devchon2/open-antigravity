import { GoogleGenerativeAI } from '@google/generative-ai';
import type { LLMProvider } from './types.js';
import type { ChatMessage, StreamChunk } from '@open-antigravity/shared';
import { providerKeys } from '../config.js';

export const googleProvider: LLMProvider = {
  name: 'Google',
  providerId: 'google',

  isAvailable(): boolean { return !!providerKeys.google.apiKey; },

  listModels(): string[] { return ['gemini-2.5-pro', 'gemini-2.5-flash']; },

  async *chat(model: string, messages: ChatMessage[], options?: { system?: string; maxTokens?: number; temperature?: number }): AsyncIterable<StreamChunk> {
    const genAI = new GoogleGenerativeAI(providerKeys.google.apiKey);
    const geminiModel = genAI.getGenerativeModel({ model, systemInstruction: options?.system });
    const history = messages.filter(function(m) { return m.role !== 'system'; }).map(function(m) {
      return { role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content || '' }] };
    });
    const chat = geminiModel.startChat({ history: history as any });
    const lastMsg = messages[messages.length - 1];
    const result = await chat.sendMessageStream(lastMsg?.content || '');
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield { type: 'text' as const, content: text };
    }
    yield { type: 'done' as const };
  },
};
