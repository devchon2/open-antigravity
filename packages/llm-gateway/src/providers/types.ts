import type { ChatMessage, StreamChunk } from '@open-antigravity/shared';

export interface LLMProvider {
  readonly name: string;
  readonly providerId: string;
  isAvailable(): boolean;
  listModels(): string[];
  chat(
    model: string,
    messages: ChatMessage[],
    options?: { system?: string; maxTokens?: number; temperature?: number },
  ): AsyncIterable<StreamChunk>;
}
