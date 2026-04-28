import { z } from 'zod';

export const ChatMessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([z.string(), z.array(z.any())]),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
});

export const AgentTaskSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed']),
  result: z.string().optional(),
});

export const ArtifactSchema = z.object({
  id: z.string(),
  type: z.enum(['task_list', 'plan', 'diff', 'screenshot', 'browser_recording', 'walkthrough']),
  title: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
});

export const ChatRequestSchema = z.object({
  model: z.string(),
  messages: z.array(ChatMessageSchema),
  system: z.string().optional(),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  stream: z.boolean().optional().default(true),
});

export const HealthResponseSchema = z.object({
  status: z.literal('ok'),
  version: z.string(),
  providers: z.array(z.string()),
});

export const ModelsResponseSchema = z.object({
  models: z.array(
    z.object({
      id: z.string(),
      provider: z.string(),
      name: z.string(),
      maxTokens: z.number(),
      streaming: z.boolean(),
    }),
  ),
});
