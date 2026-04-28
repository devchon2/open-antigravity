import type { LLMProvider } from './types.js';
import { openaiProvider } from './openai.js';
import { anthropicProvider } from './anthropic.js';
import { googleProvider } from './google.js';
import { ollamaProvider } from './local.js';

const allProviders: LLMProvider[] = [openaiProvider, anthropicProvider, googleProvider, ollamaProvider];

export function getProviders(): LLMProvider[] {
  return allProviders.filter(function(p: LLMProvider) { return p.isAvailable(); });
}

export function findModel(modelId: string): LLMProvider | undefined {
  return getProviders().find(function(p: LLMProvider) { return p.listModels().includes(modelId); });
}
