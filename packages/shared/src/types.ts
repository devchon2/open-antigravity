import type { z } from 'zod';
import type { ChatMessageSchema, AgentTaskSchema, ArtifactSchema } from './schemas.js';

export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type AgentTask = z.infer<typeof AgentTaskSchema>;
export type Artifact = z.infer<typeof ArtifactSchema>;

export type ProviderId = 'openai' | 'anthropic' | 'google' | 'ollama';
export type ProviderName = ProviderId;

export interface ModelInfo {
  id: string;
  provider: ProviderId;
  name: string;
  maxTokens: number;
  streaming: boolean;
}

export interface ToolDefinition {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ChatCompletionRequest {
  model: string;
  messages: ChatMessage[];
  system?: string;
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
  tools?: ToolDefinition[];
}

export interface ChatCompletionChunk {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{ index: number; id?: string; type?: 'function'; function?: { name?: string; arguments?: string } }>;
    };
    finish_reason: 'stop' | 'length' | 'tool_calls' | null;
  }>;
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string | null };
    finish_reason: 'stop' | 'length' | 'tool_calls';
  }>;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: { id: string; type: 'function'; function: { name: string; arguments: string } };
  usage?: { promptTokens: number; completionTokens: number };
}

export interface AgentState {
  id: string;
  mode: 'planning' | 'fast';
  status: 'idle' | 'planning' | 'executing' | 'verifying' | 'done' | 'error';
  tasks: AgentTask[];
  artifacts: Artifact[];
  conversation: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}
